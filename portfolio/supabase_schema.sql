-- ==============================================================================
-- SCHEMA SUPABASE POUR ANALYTICS PERSONNEL (Kevin Voisin Portfolio)
-- ==============================================================================
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ==============================================================================

-- 1. Création de la table des événements (avec colonnes enrichies)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'page_view', -- 'page_view', 'cv_download', 'contact_click', 'outbound_click', 'scroll_depth', 'session_ping', etc.
    page_path TEXT DEFAULT '/',
    referrer TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    os TEXT,
    screen_res TEXT,
    session_id TEXT, -- hash anonyme pour compter les sessions uniques sans cookie
    event_label TEXT, -- infos supplémentaires (ex: 'LinkedIn', 'CV PDF', 'fr -> en')
    country TEXT,     -- ex: 'Suisse', 'France'
    country_code TEXT, -- ex: 'CH', 'FR', 'DE'
    city TEXT,        -- ex: 'Sion', 'Lausanne', 'Genève', 'Paris'
    region TEXT,      -- ex: 'Valais', 'Vaud', 'Genève', 'Île-de-France'
    postal TEXT,      -- ex: '1950', '1003'
    latitude NUMERIC, -- ex: 46.2330
    longitude NUMERIC, -- ex: 7.3600
    isp TEXT,         -- ex: 'Swisscom AG', 'Sunrise GmbH'
    organization TEXT, -- ex: 'EPFL', 'Google LLC', 'Rolex', 'Banque Cantonale'
    user_language TEXT, -- ex: 'fr-CH', 'fr-FR', 'en-US'
    duration_seconds INTEGER, -- Durée passée sur la page en secondes
    scroll_depth INTEGER,     -- Profondeur maximale de lecture (ex: 25, 50, 75, 100)
    connection_type TEXT,     -- ex: '4G (15 Mbps, 45ms)'
    is_company BOOLEAN DEFAULT false, -- true si entreprise/école/institution, false si FAI résidentiel
    campaign_ref TEXT         -- ex: 'candidature_google', 'linkedin_dm' (via ?ref= ou ?utm_source=)
);

-- Si la table existait déjà, ajout des colonnes géographiques et comportementales
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS postal TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS isp TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS user_language TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS scroll_depth INTEGER;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS connection_type TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT false;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS campaign_ref TEXT;

-- 2. Création d'index pour optimiser les requêtes du dashboard admin
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_country_code ON public.analytics_events (country_code);

-- 3. Activation de la sécurité au niveau des lignes (Row Level Security - RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 4. Politique d'insertion : les visiteurs publics (anonymes) peuvent insérer des événements
DROP POLICY IF EXISTS "Allow public insert" ON public.analytics_events;
CREATE POLICY "Allow public insert"
    ON public.analytics_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 5. Politique de lecture : SEULS les utilisateurs authentifiés (vous connecté en admin) peuvent lire les stats
DROP POLICY IF EXISTS "Allow authenticated read" ON public.analytics_events;
CREATE POLICY "Allow authenticated read"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Politique de suppression/modification : uniquement admin authentifié
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.analytics_events;
CREATE POLICY "Allow authenticated delete"
    ON public.analytics_events
    FOR DELETE
    TO authenticated
    USING (true);

-- 7. Activer le mode temps réel (Realtime) sur la table analytics_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'analytics_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
  END IF;
END $$;
