import { supabase } from "./supabase";

const BUCKET = "personal_drive";

// Helper de formatage de taille (octets -> Ko / Mo / Go)
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 o";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Obtenir l'ID de l'utilisateur connecté
export async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// 1. LISTER LE CONTENU D'UN DOSSIER DU DRIVE
export async function listDriveItems(folderPath = "") {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  // Format du chemin : "{userId}" ou "{userId}/sous-dossier"
  const cleanFolder = folderPath ? folderPath.replace(/^\/+|\/+$/g, "") : "";
  const storagePath = cleanFolder ? `${userId}/${cleanFolder}` : userId;

  const { data, error } = await supabase.storage.from(BUCKET).list(storagePath, {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    // Si le dossier racine de l'utilisateur n'existe pas encore, renvoyer une liste vide
    if (error.message?.includes("not found")) return { folders: [], files: [] };
    throw error;
  }

  const folders = [];
  const files = [];

  (data || []).forEach((item) => {
    if (item.name === ".keep") return; // Fichier placeholder masqué

    // Dans Supabase Storage, les dossiers ont id === null ou metadata === null
    const isFolder = item.id === null || item.metadata === null || !item.metadata?.size;
    if (isFolder) {
      folders.push({
        id: item.id || `folder_${item.name}`,
        name: item.name,
        path: cleanFolder ? `${cleanFolder}/${item.name}` : item.name,
        updated_at: item.updated_at,
      });
    } else {
      files.push({
        id: item.id,
        name: item.name,
        path: cleanFolder ? `${cleanFolder}/${item.name}` : item.name,
        size: item.metadata?.size || 0,
        mimetype: item.metadata?.mimetype || "application/octet-stream",
        updated_at: item.updated_at || item.created_at,
      });
    }
  });

  return { folders, files };
}

// 2. CRÉER UN NOUVEAU DOSSIER
export async function createDriveFolder(folderName, parentPath = "") {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  const cleanName = folderName.trim().replace(/[\\/]/g, "_");
  if (!cleanName) throw new Error("Nom de dossier invalide");

  const cleanParent = parentPath ? parentPath.replace(/^\/+|\/+$/g, "") : "";
  const targetPath = cleanParent
    ? `${userId}/${cleanParent}/${cleanName}/.keep`
    : `${userId}/${cleanName}/.keep`;

  // Création du dossier via un fichier placeholder .keep
  const dummyFile = new Blob([""], { type: "text/plain" });
  const { error } = await supabase.storage.from(BUCKET).upload(targetPath, dummyFile, {
    upsert: true,
  });

  if (error) throw error;
  return cleanParent ? `${cleanParent}/${cleanName}` : cleanName;
}

// 3. TÉLÉVERSER UN FICHIER
export async function uploadDriveFile(file, currentFolder = "", onProgress = null) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  const cleanFolder = currentFolder ? currentFolder.replace(/^\/+|\/+$/g, "") : "";
  const storagePath = cleanFolder
    ? `${userId}/${cleanFolder}/${file.name}`
    : `${userId}/${file.name}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
  });

  if (error) throw error;
  return data;
}

// 4. SUPPRIMER UN FICHIER OU UN DOSSIER COMPLET
export async function deleteDriveItem(itemPath, isFolder = false) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  const cleanPath = itemPath.replace(/^\/+|\/+$/g, "");
  const targetPrefix = `${userId}/${cleanPath}`;

  if (isFolder) {
    // Si c'est un dossier, on liste tous les fichiers récursifs à l'intérieur pour les supprimer
    const { data: objects, error: listErr } = await supabase.storage.from(BUCKET).list(targetPrefix, {
      limit: 1000,
    });
    if (listErr) throw listErr;

    const filesToDelete = (objects || []).map((o) => `${targetPrefix}/${o.name}`);
    filesToDelete.push(`${targetPrefix}/.keep`);

    if (filesToDelete.length > 0) {
      const { error: delErr } = await supabase.storage.from(BUCKET).remove(filesToDelete);
      if (delErr) throw delErr;
    }
  } else {
    const { error } = await supabase.storage.from(BUCKET).remove([targetPrefix]);
    if (error) throw error;
  }
}

// 5. OBTENIR L'URL DE TÉLÉCHARGEMENT DIRECT D'UN FICHIER
export async function getFileDownloadUrl(filePath, expiresIn = 3600) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  const cleanPath = filePath.replace(/^\/+|\/+$/g, "");
  const fullPath = `${userId}/${cleanPath}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fullPath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// 6. GESTION DES LIENS DE PARTAGE (TABLE public.drive_shares)
export async function createShareLink({ itemType, itemPath, itemName, durationOption = "7d" }) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Utilisateur non connecté");

  // Calcul de la date d'expiration
  let expiresAt = null;
  let isPermanent = false;
  const now = new Date();

  if (durationOption === "permanent") {
    isPermanent = true;
  } else if (durationOption === "1h") {
    expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  } else if (durationOption === "24h") {
    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (durationOption === "7d") {
    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (durationOption === "30d") {
    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // Token aléatoire sécurisé (court et élégant)
  const token = (
    Math.random().toString(36).substring(2, 9) +
    Math.random().toString(36).substring(2, 7)
  ).toLowerCase();

  const payload = {
    user_id: userId,
    share_token: token,
    item_type: itemType, // 'file' ou 'folder'
    item_path: itemPath.replace(/^\/+|\/+$/g, ""),
    item_name: itemName,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    is_permanent: isPermanent,
  };

  const { data, error } = await supabase
    .from("drive_shares")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  // URL absolue de partage
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    ...data,
    shareUrl: `${origin}/share/${token}`,
  };
}

// Lister tous les partages de l'utilisateur
export async function listUserShares() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("drive_shares")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur listUserShares:", error);
    return [];
  }
  return data || [];
}

// Supprimer/révoquer un lien de partage
export async function revokeShareLink(shareId) {
  const { error } = await supabase.from("drive_shares").delete().eq("id", shareId);
  if (error) throw error;
}

// 7. OBTENIR LA JAUGE DE STOCKAGE GLOBALE & PERSONNELLE
export async function getDriveStorageMetrics() {
  try {
    const { data, error } = await supabase.rpc("get_drive_storage_metrics");
    if (error) throw error;
    return (
      data || {
        total_bytes_used: 0,
        user_bytes_used: 0,
        total_files_count: 0,
        user_files_count: 0,
        capacity_bytes: 1073741824, // 1 Go
        global_percent_used: 0,
      }
    );
  } catch (err) {
    console.warn("Notice getDriveStorageMetrics fallback:", err);
    return {
      total_bytes_used: 0,
      user_bytes_used: 0,
      total_files_count: 0,
      user_files_count: 0,
      capacity_bytes: 1073741824,
      global_percent_used: 0,
    };
  }
}

// 8. FONCTION PUBLIQUE : EXPLORER UN DOSSIER PARTAGÉ (SANS LOGIN)
export async function fetchSharedFolderView(token, subpath = "") {
  const { data, error } = await supabase.rpc("get_shared_folder_view", {
    p_token: token,
    p_subpath: subpath,
  });

  if (error) throw error;
  return data;
}

// 9. FONCTION PUBLIQUE : OBTENIR L'URL DE TÉLÉCHARGEMENT OU D'APERÇU D'UN FICHIER PARTAGÉ
export async function getSharedDownloadUrl(token, relativeFilePath = "") {
  const { data, error } = await supabase.rpc("get_shared_download_target", {
    p_token: token,
    p_relative_file_path: relativeFilePath,
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Fichier introuvable");

  // 1. Tenter la génération d'une URL signée publique (validité 2h)
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, 7200);

  if (!signErr && signed?.signedUrl) {
    return {
      downloadUrl: signed.signedUrl,
      filename: data.filename,
      mimetype: data.mimetype,
      size: data.size,
    };
  }

  // 2. Si l'URL signée échoue, tentative de téléchargement direct en Blob
  const { data: blobData, error: blobErr } = await supabase.storage
    .from(BUCKET)
    .download(data.storage_path);

  if (blobErr) {
    throw new Error(
      `Accès refusé ou fichier introuvable (${signErr?.message || blobErr?.message}). Assurez-vous d'avoir exécuté la mise à jour de supabase_drive_schema.sql dans Supabase SQL Editor.`
    );
  }

  const blobUrl = URL.createObjectURL(blobData);
  return {
    downloadUrl: blobUrl,
    filename: data.filename,
    mimetype: data.mimetype || blobData.type,
    size: data.size || blobData.size,
  };
}
