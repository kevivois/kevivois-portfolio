import { useState, useEffect, useCallback, useRef } from "react";
import {
  IconFolder,
  IconFolderPlus,
  IconUpload,
  IconShare,
  IconTrash,
  IconDownload,
  IconRefresh,
  IconFile,
  IconFileText,
  IconPhoto,
  IconMusic,
  IconVideo,
  IconArchive,
  IconCode,
  IconChevronRight,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconWorld,
  IconLock,
  IconX,
  IconDatabase,
  IconEye,
} from "@tabler/icons-react";
import { FilePreviewModal } from "./FilePreviewModal";
import {
  formatBytes,
  listDriveItems,
  createDriveFolder,
  uploadDriveFile,
  deleteDriveItem,
  getFileDownloadUrl,
  createShareLink,
  listUserShares,
  revokeShareLink,
  getDriveStorageMetrics,
} from "../lib/driveApi";

// Helper icône selon le type MIME du fichier
function getFileIcon(filename = "", mimetype = "") {
  const ext = filename.split(".").pop().toLowerCase();
  const mime = mimetype.toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mime.startsWith("image/")) {
    return <IconPhoto size={18} className="drive-icon-img" />;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext) || mime.includes("pdf") || mime.includes("text")) {
    return <IconFileText size={18} className="drive-icon-doc" />;
  }
  if (["mp3", "wav", "ogg", "flac"].includes(ext) || mime.startsWith("audio/")) {
    return <IconMusic size={18} className="drive-icon-audio" />;
  }
  if (["mp4", "webm", "mov", "avi"].includes(ext) || mime.startsWith("video/")) {
    return <IconVideo size={18} className="drive-icon-video" />;
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return <IconArchive size={18} className="drive-icon-zip" />;
  }
  if (["js", "jsx", "ts", "tsx", "json", "html", "css", "py", "sql"].includes(ext)) {
    return <IconCode size={18} className="drive-icon-code" />;
  }
  return <IconFile size={18} className="drive-icon-file" />;
}

export function AdminDrive() {
  const [currentFolder, setCurrentFolder] = useState("");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Jauge de stockage
  const [metrics, setMetrics] = useState({
    total_bytes_used: 0,
    user_bytes_used: 0,
    total_files_count: 0,
    user_files_count: 0,
    capacity_bytes: 1073741824, // 1 Go
    global_percent_used: 0,
  });

  // Modal Nouveau dossier
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Modal Partage
  const [shareItem, setShareItem] = useState(null); // { itemType, itemPath, itemName }
  const [shareDuration, setShareDuration] = useState("7d");
  const [generatedShare, setGeneratedShare] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeShares, setActiveShares] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState("create"); // "create" | "manage"

  // Modal Visualisation / Aperçu en ligne
  const [previewData, setPreviewData] = useState(null); // { file, url }

  const handlePreviewFile = async (file) => {
    try {
      const url = await getFileDownloadUrl(file.path, 3600);
      setPreviewData({ file, url });
    } catch (err) {
      alert("Impossible de prévisualiser ce fichier : " + err.message);
    }
  };

  const fileInputRef = useRef(null);

  // Charger le contenu du dossier et les métriques
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [items, stats] = await Promise.all([
        listDriveItems(currentFolder),
        getDriveStorageMetrics(),
      ]);
      setFolders(items.folders);
      setFiles(items.files);
      setMetrics(stats);
    } catch (err) {
      console.error("Erreur chargement Drive:", err);
      setErrorMsg(err.message || "Impossible de charger le dossier");
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation dans l'arborescence (Breadcrumbs)
  const breadcrumbParts = currentFolder ? currentFolder.split("/").filter(Boolean) : [];

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentFolder("");
    } else {
      const target = breadcrumbParts.slice(0, index + 1).join("/");
      setCurrentFolder(target);
    }
  };

  const handleOpenFolder = (folderName) => {
    setCurrentFolder((prev) => (prev ? `${prev}/${folderName}` : folderName));
  };

  // Création de dossier
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createDriveFolder(newFolderName, currentFolder);
      setNewFolderName("");
      setIsFolderModalOpen(false);
      loadData();
    } catch (err) {
      alert("Erreur lors de la création du dossier : " + err.message);
    }
  };

  // Téléversement de fichiers
  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setErrorMsg("");
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await uploadDriveFile(selectedFiles[i], currentFolder);
      }
      loadData();
    } catch (err) {
      setErrorMsg("Erreur lors du téléversement : " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Suppression
  const handleDelete = async (itemPath, isFolder, itemName) => {
    const confirmMsg = isFolder
      ? `Supprimer définitivement le dossier « ${itemName} » et tout son contenu ?`
      : `Supprimer définitivement le fichier « ${itemName} » ?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDriveItem(itemPath, isFolder);
      loadData();
    } catch (err) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  // Téléchargement direct
  const handleDownload = async (filePath) => {
    try {
      const url = await getFileDownloadUrl(filePath, 300);
      window.open(url, "_blank");
    } catch (err) {
      alert("Impossible d'obtenir le lien de téléchargement : " + err.message);
    }
  };

  // Gestion des partages
  const handleOpenShare = async (item, isFolder) => {
    setShareItem({
      itemType: isFolder ? "folder" : "file",
      itemPath: item.path,
      itemName: item.name,
    });
    setGeneratedShare(null);
    setCopiedShare(false);
    setActiveShareTab("create");
    setIsShareModalOpen(true);

    try {
      const shares = await listUserShares();
      setActiveShares(shares);
    } catch {}
  };

  const handleGenerateShare = async () => {
    if (!shareItem) return;
    try {
      const res = await createShareLink({
        itemType: shareItem.itemType,
        itemPath: shareItem.itemPath,
        itemName: shareItem.itemName,
        durationOption: shareDuration,
      });
      setGeneratedShare(res);

      const shares = await listUserShares();
      setActiveShares(shares);
    } catch (err) {
      alert("Erreur lors de la création du partage : " + err.message);
    }
  };

  const handleCopyLink = () => {
    if (!generatedShare?.shareUrl) return;
    navigator.clipboard.writeText(generatedShare.shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm("Révoquer ce lien de partage ? Les personnes disposant de l'URL ne pourront plus y accéder.")) return;
    try {
      await revokeShareLink(shareId);
      const shares = await listUserShares();
      setActiveShares(shares);
      if (generatedShare?.id === shareId) setGeneratedShare(null);
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  // Couleur de la jauge selon le % d'utilisation
  const percentUsed = Math.min(100, metrics.global_percent_used || 0);
  const meterColor = percentUsed >= 90 ? "#dc2626" : percentUsed >= 75 ? "#d97706" : "#245b46";

  return (
    <div className="admin-drive-container">
      {/* 1. Jauge globale de stockage backend & quota */}
      <div className="drive-storage-banner">
        <div className="drive-storage-info">
          <div className="storage-text-left">
            <span className="storage-badge-title">
              <IconDatabase size={14} stroke={1.8} /> Capacité globale Backend (Supabase Storage)
            </span>
            <h3 className="storage-numbers">
              <strong>{formatBytes(metrics.total_bytes_used)}</strong>
              <span className="storage-capacity"> / {formatBytes(metrics.capacity_bytes)}</span>
              <span className="storage-percent" style={{ color: meterColor }}>
                ({percentUsed.toFixed(1)}% utilisé)
              </span>
            </h3>
          </div>

          <div className="storage-text-right">
            <span className="storage-user-usage">
              Votre espace : <strong>{formatBytes(metrics.user_bytes_used)}</strong> ({metrics.user_files_count} fichier{metrics.user_files_count > 1 ? "s" : ""})
            </span>
            <span className="storage-user-meta">
              Total base : {metrics.total_files_count} fichiers stockés
            </span>
          </div>
        </div>

        {/* Barre de progression visuelle */}
        <div className="drive-meter-track" role="progressbar" aria-valuenow={percentUsed} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="drive-meter-fill"
            style={{ width: `${percentUsed}%`, backgroundColor: meterColor }}
          />
        </div>
      </div>

      {/* 2. Barre d'outils et Fil d'Ariane */}
      <div className="drive-toolbar">
        {/* Fil d'Ariane (Breadcrumbs) */}
        <nav className="drive-breadcrumbs" aria-label="Arborescence Drive">
          <button
            type="button"
            className={`breadcrumb-btn${breadcrumbParts.length === 0 ? " is-current" : ""}`}
            onClick={() => navigateToBreadcrumb(-1)}
          >
            <IconFolder size={15} stroke={1.7} /> Mon Drive
          </button>
          {breadcrumbParts.map((part, index) => {
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <span key={index} className="breadcrumb-segment">
                <IconChevronRight size={14} stroke={1.8} className="breadcrumb-sep" />
                <button
                  type="button"
                  className={`breadcrumb-btn${isLast ? " is-current" : ""}`}
                  onClick={() => navigateToBreadcrumb(index)}
                  disabled={isLast}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </nav>

        {/* Actions principales */}
        <div className="drive-actions-group">
          <button
            type="button"
            className="drive-btn drive-btn-secondary"
            onClick={() => setIsFolderModalOpen(true)}
            title="Créer un nouveau sous-dossier"
          >
            <IconFolderPlus size={15} stroke={1.8} /> Nouveau dossier
          </button>

          <label className="drive-btn drive-btn-primary" title="Téléverser un ou plusieurs fichiers">
            <IconUpload size={15} stroke={1.8} /> {uploading ? "Téléversement..." : "Téléverser"}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={uploading}
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>

          <button
            type="button"
            className="drive-btn drive-btn-icon"
            onClick={loadData}
            title="Actualiser la liste des fichiers"
          >
            <IconRefresh size={15} stroke={1.8} className={loading ? "spin-icon" : ""} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="drive-notice-error">
          <IconAlertCircle size={16} stroke={2} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Explorateur de fichiers et dossiers */}
      <div className="drive-explorer-view">
        {loading ? (
          <div className="drive-loading-state">
            <IconRefresh size={24} stroke={1.5} className="spin-icon" />
            <p>Chargement des fichiers...</p>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="drive-empty-state">
            <IconFolder size={44} stroke={1.2} className="empty-folder-icon" />
            <h4>Ce dossier est vide</h4>
            <p>Glissez-déposez des fichiers ici ou cliquez sur <strong>Téléverser</strong>.</p>
          </div>
        ) : (
          <div className="drive-items-table-wrapper">
            <table className="drive-table">
              <thead>
                <tr>
                  <th>Nom de l’élément</th>
                  <th>Dernière modification</th>
                  <th>Taille</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Liste des Dossiers */}
                {folders.map((folder) => (
                  <tr
                    key={folder.name}
                    className="drive-row drive-row-folder"
                    onDoubleClick={() => handleOpenFolder(folder.name)}
                  >
                    <td className="cell-item-name" onClick={() => handleOpenFolder(folder.name)}>
                      <span className="folder-icon-wrap">
                        <IconFolder size={18} stroke={1.7} />
                      </span>
                      <strong className="item-title">{folder.name}</strong>
                    </td>
                    <td className="cell-muted cell-mono">-</td>
                    <td className="cell-muted cell-mono">Dossier</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => handleOpenFolder(folder.name)}
                        title="Ouvrir le dossier"
                      >
                        Ouvrir
                      </button>
                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => handleOpenShare(folder, true)}
                        title="Créer un lien de partage pour ce dossier"
                      >
                        <IconShare size={13} stroke={1.8} /> Partager
                      </button>
                      <button
                        type="button"
                        className="drive-action-btn btn-delete"
                        onClick={() => handleDelete(folder.path, true, folder.name)}
                        title="Supprimer le dossier"
                      >
                        <IconTrash size={13} stroke={1.8} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Liste des Fichiers */}
                {files.map((file) => (
                  <tr key={file.name} className="drive-row drive-row-file">
                    <td
                      className="cell-item-name"
                      onClick={() => handlePreviewFile(file)}
                      style={{ cursor: "pointer" }}
                      title="Cliquer pour prévisualiser en ligne"
                    >
                      <span className="file-icon-wrap">{getFileIcon(file.name, file.mimetype)}</span>
                      <span className="item-title">{file.name}</span>
                    </td>
                    <td className="cell-muted cell-mono">
                      {file.updated_at
                        ? new Date(file.updated_at).toLocaleDateString("fr-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="cell-muted cell-mono">{formatBytes(file.size)}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="drive-action-btn btn-preview-action"
                        onClick={() => handlePreviewFile(file)}
                        title="Visualiser en ligne"
                      >
                        <IconEye size={13} stroke={1.8} /> Aperçu
                      </button>
                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => handleDownload(file.path)}
                        title="Télécharger le fichier"
                      >
                        <IconDownload size={13} stroke={1.8} />
                      </button>
                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => handleOpenShare(file, false)}
                        title="Partager ce fichier"
                      >
                        <IconShare size={13} stroke={1.8} /> Partager
                      </button>
                      <button
                        type="button"
                        className="drive-action-btn btn-delete"
                        onClick={() => handleDelete(file.path, false, file.name)}
                        title="Supprimer le fichier"
                      >
                        <IconTrash size={13} stroke={1.8} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL CRÉATION DE DOSSIER */}
      {isFolderModalOpen && (
        <div className="drive-modal-overlay" onClick={() => setIsFolderModalOpen(false)}>
          <div className="drive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drive-modal-head">
              <h4>Nouveau dossier</h4>
              <button
                type="button"
                className="drive-modal-close"
                onClick={() => setIsFolderModalOpen(false)}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="drive-modal-form">
              <div className="admin-field">
                <label htmlFor="folder-input">Nom du dossier</label>
                <input
                  id="folder-input"
                  type="text"
                  required
                  placeholder="Ex : Documents, Projets, Photos..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="drive-modal-footer">
                <button
                  type="button"
                  className="drive-btn drive-btn-secondary"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="drive-btn drive-btn-primary">
                  Créer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL DE PARTAGE SÉCURISÉ (TEMPORAIRE / PERMANENT) */}
      {isShareModalOpen && shareItem && (
        <div className="drive-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="drive-modal drive-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drive-modal-head">
              <div>
                <span className="modal-kicker">Partage sécurisé</span>
                <h4>
                  {shareItem.itemType === "folder" ? "📁 Dossier : " : "📄 Fichier : "}
                  {shareItem.itemName}
                </h4>
              </div>
              <button
                type="button"
                className="drive-modal-close"
                onClick={() => setIsShareModalOpen(false)}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>

            {/* Onglets Créer / Liens existants */}
            <div className="share-tab-switcher">
              <button
                type="button"
                className={`share-tab-btn${activeShareTab === "create" ? " is-active" : ""}`}
                onClick={() => setActiveShareTab("create")}
              >
                Générer un lien
              </button>
              <button
                type="button"
                className={`share-tab-btn${activeShareTab === "manage" ? " is-active" : ""}`}
                onClick={() => setActiveShareTab("manage")}
              >
                Liens actifs ({activeShares.length})
              </button>
            </div>

            <div className="drive-modal-body">
              {activeShareTab === "create" ? (
                <>
                  <div className="share-security-notice">
                    <IconLock size={15} stroke={1.8} />
                    <p>
                      {shareItem.itemType === "folder"
                        ? "Le destinataire pourra explorer et télécharger exclusivement le contenu de ce dossier sans se connecter. L'accès aux dossiers parents ou à vos autres fichiers est strictement impossible."
                        : "Le destinataire pourra télécharger ce fichier spécifique sans se connecter à votre compte."}
                    </p>
                  </div>

                  <div className="share-settings-box">
                    <label className="share-setting-label">Durée de validité du lien</label>
                    <div className="duration-pill-group">
                      {[
                        { id: "1h", label: "1 heure" },
                        { id: "24h", label: "24 heures" },
                        { id: "7d", label: "7 jours (conseillé)" },
                        { id: "30d", label: "30 jours" },
                        { id: "permanent", label: "Permanent" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`duration-pill-btn${shareDuration === opt.id ? " is-active" : ""}`}
                          onClick={() => setShareDuration(opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!generatedShare ? (
                    <button
                      type="button"
                      className="drive-btn drive-btn-primary btn-generate-share"
                      onClick={handleGenerateShare}
                    >
                      <IconShare size={15} stroke={1.8} /> Créer le lien de partage
                    </button>
                  ) : (
                    <div className="generated-link-box">
                      <label className="share-setting-label">Lien public prêt à être partagé</label>
                      <div className="link-copy-row">
                        <input
                          type="text"
                          readOnly
                          value={generatedShare.shareUrl}
                          className="share-url-input"
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          className={`share-copy-btn${copiedShare ? " is-copied" : ""}`}
                          onClick={handleCopyLink}
                        >
                          {copiedShare ? (
                            <>
                              <IconCheck size={14} stroke={2} /> Copié !
                            </>
                          ) : (
                            <>
                              <IconCopy size={14} stroke={1.8} /> Copier
                            </>
                          )}
                        </button>
                      </div>

                      <div className="generated-meta">
                        {generatedShare.is_permanent ? (
                          <span className="meta-tag tag-permanent">
                            <IconWorld size={12} stroke={1.8} /> Lien permanent
                          </span>
                        ) : (
                          <span className="meta-tag tag-temp">
                            <IconClock size={12} stroke={1.8} /> Expire le{" "}
                            {new Date(generatedShare.expires_at).toLocaleString("fr-CH")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Liste des partages actifs */
                <div className="active-shares-list">
                  {activeShares.length === 0 ? (
                    <p className="admin-empty-note">Aucun lien de partage actif pour le moment.</p>
                  ) : (
                    activeShares.map((s) => {
                      const isExpired = s.expires_at && new Date(s.expires_at).getTime() < Date.now();
                      const shareUrl = `${window.location.origin}/share/${s.share_token}`;
                      return (
                        <div key={s.id} className="active-share-card">
                          <div className="active-share-header">
                            <div>
                              <strong className="share-item-name">
                                {s.item_type === "folder" ? "📁 " : "📄 "}
                                {s.item_name}
                              </strong>
                              <span className="share-expiry-sub">
                                {s.is_permanent
                                  ? "Permanent"
                                  : isExpired
                                  ? "Expiré"
                                  : `Expire le ${new Date(s.expires_at).toLocaleDateString("fr-CH")}`}
                                {s.downloads_count > 0 && ` · ${s.downloads_count} téléchargement(s)`}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn-revoke-share"
                              onClick={() => handleRevokeShare(s.id)}
                              title="Révoquer ce lien"
                            >
                              Révoquer
                            </button>
                          </div>
                          <div className="share-url-mini-row">
                            <code className="mini-url">{shareUrl}</code>
                            <button
                              type="button"
                              className="mini-copy-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                                alert("Lien copié dans le presse-papier !");
                              }}
                            >
                              Copier
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="drive-modal-footer">
              <button
                type="button"
                className="drive-btn drive-btn-secondary"
                onClick={() => setIsShareModalOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL D'APERÇU / VISUALISATION EN LIGNE */}
      <FilePreviewModal
        isOpen={Boolean(previewData)}
        onClose={() => setPreviewData(null)}
        file={previewData?.file}
        url={previewData?.url}
        filePath={previewData?.file?.path}
        onDownload={() => previewData && handleDownload(previewData.file.path)}
      />
    </div>
  );
}
