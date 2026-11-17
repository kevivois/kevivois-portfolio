-- ==============================================================================
-- SCHEMA SUPABASE POUR LE DRIVE PERSONNEL & PARTAGE SÉCURISÉ (Kevin Voisin)
-- ==============================================================================
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ==============================================================================

-- 1. CRÉATION DU BUCKET DE STOCKAGE 'personal_drive'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'personal_drive',
    'personal_drive',
    false, -- Bucket strictement privé
    104857600, -- Limite : 100 Mo par fichier
    NULL -- Tous types de fichiers acceptés
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. POLITIQUES DE SÉCURITÉ DE STOCKAGE (STORAGE RLS)
-- Chaque utilisateur authentifié a un contrôle total UNIQUEMENT sur son dossier {user_id}/...
DROP POLICY IF EXISTS "Drive: User upload own files" ON storage.objects;
CREATE POLICY "Drive: User upload own files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'personal_drive' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Drive: User read own files" ON storage.objects;
CREATE POLICY "Drive: User read own files"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'personal_drive' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Drive: User update own files" ON storage.objects;
CREATE POLICY "Drive: User update own files"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'personal_drive' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Drive: User delete own files" ON storage.objects;
CREATE POLICY "Drive: User delete own files"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'personal_drive' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Autorise les personnes disposant d'un lien de partage actif (même sans être connectées) à lire UNIQUEMENT les fichiers partagés
DROP POLICY IF EXISTS "Drive: Public read shared files" ON storage.objects;
CREATE POLICY "Drive: Public read shared files"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (
        bucket_id = 'personal_drive'
        AND EXISTS (
            SELECT 1 FROM public.drive_shares s
            WHERE (s.is_permanent = true OR s.expires_at IS NULL OR s.expires_at > now())
              AND (
                -- 1. Fichier individuel partagé exactement
                (s.item_type = 'file' AND storage.objects.name = (s.user_id::text || '/' || trim(both '/' from s.item_path)))
                OR
                -- 2. Fichiers situés à l'intérieur d'un dossier partagé
                (s.item_type = 'folder' AND storage.objects.name LIKE (s.user_id::text || '/' || trim(both '/' from s.item_path) || '/%'))
              )
        )
    );

-- 3. TABLE DES LIENS DE PARTAGE (drive_shares)
CREATE TABLE IF NOT EXISTS public.drive_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL CHECK (item_type IN ('file', 'folder')),
    item_path TEXT NOT NULL, -- Chemin relatif après {user_id}/ (ex: "Documents/Rapport.pdf" ou "Photos/Vacances")
    item_name TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL si permanent
    is_permanent BOOLEAN DEFAULT false,
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drive_shares_token ON public.drive_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_drive_shares_user ON public.drive_shares(user_id);

ALTER TABLE public.drive_shares ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table drive_shares
DROP POLICY IF EXISTS "Users can manage their own shares" ON public.drive_shares;
CREATE POLICY "Users can manage their own shares"
    ON public.drive_shares FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can view valid active shares by token" ON public.drive_shares;
CREATE POLICY "Public can view valid active shares by token"
    ON public.drive_shares FOR SELECT TO anon, authenticated
    USING (
        is_permanent = true OR expires_at IS NULL OR expires_at > now()
    );

-- 4. FONCTION RPC : JAUGE DE STOCKAGE GLOBALE & PERSONNELLE
CREATE OR REPLACE FUNCTION public.get_drive_storage_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT := 0;
    v_user_bytes BIGINT := 0;
    v_total_files INTEGER := 0;
    v_user_files INTEGER := 0;
    v_backend_capacity BIGINT := 1073741824; -- 1 Go par défaut (Quota gratuit Supabase)
    v_current_user_id TEXT;
BEGIN
    v_current_user_id := auth.uid()::text;

    -- Calcul du stockage global du bucket 'personal_drive'
    SELECT 
        COALESCE(SUM((metadata->>'size')::BIGINT), 0),
        COUNT(*)
    INTO v_total_bytes, v_total_files
    FROM storage.objects
    WHERE bucket_id = 'personal_drive';

    -- Calcul du stockage de l'utilisateur connecté
    IF v_current_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(SUM((metadata->>'size')::BIGINT), 0),
            COUNT(*)
        INTO v_user_bytes, v_user_files
        FROM storage.objects
        WHERE bucket_id = 'personal_drive'
          AND (storage.foldername(name))[1] = v_current_user_id;
    END IF;

    RETURN json_build_object(
        'total_bytes_used', v_total_bytes,
        'user_bytes_used', v_user_bytes,
        'total_files_count', v_total_files,
        'user_files_count', v_user_files,
        'capacity_bytes', v_backend_capacity,
        'global_percent_used', ROUND((v_total_bytes::NUMERIC / v_backend_capacity::NUMERIC) * 100, 2)
    );
END;
$$;

-- 5. FONCTION RPC : EXPLORATION ÉTANCHE D'UN DOSSIER PARTAGÉ (SANS LOGIN)
-- Permet à un invité de consulter un dossier et ses sous-dossiers,
-- avec interdiction absolue de remonter au-dessus du dossier partagé.
CREATE OR REPLACE FUNCTION public.get_shared_folder_view(
    p_token TEXT,
    p_subpath TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_share RECORD;
    v_clean_subpath TEXT := '';
    v_search_prefix TEXT := '';
    v_prefix_len INT := 0;
    v_items JSON;
BEGIN
    -- 1. Vérification du token et de l'expiration
    SELECT * INTO v_share
    FROM public.drive_shares
    WHERE share_token = p_token
      AND (is_permanent = true OR expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Lien invalide ou expiré');
    END IF;

    IF v_share.item_type != 'folder' THEN
        RETURN json_build_object('success', false, 'error', 'Ce partage correspond à un fichier unique');
    END IF;

    -- 2. Sécurisation anti path-traversal (suppression des '..' et slashes multiples)
    v_clean_subpath := COALESCE(p_subpath, '');
    v_clean_subpath := regexp_replace(v_clean_subpath, '\.\.', '', 'g');
    v_clean_subpath := trim(both '/' from v_clean_subpath);

    -- 3. Construction du préfixe de recherche dans storage.objects
    -- Format : {user_id}/{v_share.item_path}/[v_clean_subpath/]
    v_search_prefix := v_share.user_id::text || '/' || trim(both '/' from v_share.item_path);
    IF v_clean_subpath != '' THEN
        v_search_prefix := v_search_prefix || '/' || v_clean_subpath;
    END IF;
    v_search_prefix := v_search_prefix || '/';
    v_prefix_len := length(v_search_prefix);

    -- 4. Récupération des fichiers et sous-dossiers immédiats sous ce préfixe
    WITH raw_objects AS (
        SELECT 
            name,
            (metadata->>'size')::BIGINT AS size,
            (metadata->>'mimetype')::TEXT AS mimetype,
            created_at,
            updated_at,
            substring(name from (v_prefix_len + 1)) AS relative_name
        FROM storage.objects
        WHERE bucket_id = 'personal_drive'
          AND name LIKE (v_search_prefix || '%')
    ),
    partitioned AS (
        SELECT 
            CASE 
                WHEN position('/' in relative_name) > 0 THEN 'folder'
                ELSE 'file'
            END AS kind,
            CASE 
                WHEN position('/' in relative_name) > 0 THEN split_part(relative_name, '/', 1)
                ELSE relative_name
            END AS item_name,
            size,
            mimetype,
            updated_at,
            name AS full_storage_path
        FROM raw_objects
        WHERE relative_name != '.keep' AND relative_name != ''
    ),
    aggregated AS (
        SELECT 
            kind,
            item_name,
            MAX(updated_at) AS last_modified,
            CASE WHEN kind = 'file' THEN MAX(size) ELSE NULL END AS file_size,
            CASE WHEN kind = 'file' THEN MAX(mimetype) ELSE NULL END AS mime_type,
            CASE WHEN kind = 'file' THEN MAX(full_storage_path) ELSE NULL END AS storage_path
        FROM partitioned
        GROUP BY kind, item_name
    )
    SELECT json_agg(
        json_build_object(
            'kind', kind,
            'name', item_name,
            'size', file_size,
            'mimetype', mime_type,
            'updated_at', last_modified,
            'storage_path', storage_path
        ) ORDER BY kind DESC, item_name ASC
    ) INTO v_items
    FROM aggregated;

    RETURN json_build_object(
        'success', true,
        'share_name', v_share.item_name,
        'item_type', v_share.item_type,
        'expires_at', v_share.expires_at,
        'is_permanent', v_share.is_permanent,
        'current_subpath', v_clean_subpath,
        'items', COALESCE(v_items, '[]'::json)
    );
END;
$$;

-- 6. FONCTION RPC : TÉLÉCHARGEMENT SÉCURISÉ D'UN FICHIER PARTAGÉ
CREATE OR REPLACE FUNCTION public.get_shared_download_target(
    p_token TEXT,
    p_relative_file_path TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_share RECORD;
    v_target_storage_path TEXT;
    v_clean_rel TEXT := '';
    v_mimetype TEXT := 'application/octet-stream';
    v_size BIGINT := 0;
BEGIN
    SELECT * INTO v_share
    FROM public.drive_shares
    WHERE share_token = p_token
      AND (is_permanent = true OR expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Lien invalide ou expiré');
    END IF;

    IF v_share.item_type = 'file' THEN
        v_target_storage_path := v_share.user_id::text || '/' || trim(both '/' from v_share.item_path);
    ELSE
        -- Pour un dossier partagé : vérification stricte du chemin du fichier demandé
        v_clean_rel := COALESCE(p_relative_file_path, '');
        v_clean_rel := regexp_replace(v_clean_rel, '\.\.', '', 'g');
        v_clean_rel := trim(both '/' from v_clean_rel);

        IF v_clean_rel = '' THEN
            RETURN json_build_object('success', false, 'error', 'Fichier non spécifié');
        END IF;

        v_target_storage_path := v_share.user_id::text || '/' || trim(both '/' from v_share.item_path) || '/' || v_clean_rel;
    END IF;

    -- Récupérer la taille et le type MIME du fichier
    SELECT 
        COALESCE(metadata->>'mimetype', 'application/octet-stream'),
        COALESCE((metadata->>'size')::BIGINT, 0)
    INTO v_mimetype, v_size
    FROM storage.objects
    WHERE bucket_id = 'personal_drive' AND name = v_target_storage_path;

    -- Incrémenter le compteur de téléchargements
    UPDATE public.drive_shares
    SET downloads_count = downloads_count + 1
    WHERE id = v_share.id;

    RETURN json_build_object(
        'success', true,
        'storage_path', v_target_storage_path,
        'filename', COALESCE(nullif(v_clean_rel, ''), v_share.item_name),
        'mimetype', v_mimetype,
        'size', v_size
    );
END;
$$;
