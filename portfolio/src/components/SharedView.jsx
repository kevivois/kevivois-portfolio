import { useState, useEffect, useCallback } from "react";
import {
  IconFolder,
  IconDownload,
  IconFile,
  IconFileText,
  IconPhoto,
  IconMusic,
  IconVideo,
  IconArchive,
  IconCode,
  IconChevronRight,
  IconAlertCircle,
  IconClock,
  IconWorld,
  IconArrowLeft,
  IconRefresh,
  IconEye,
  IconFileSpreadsheet,
  IconFileDescription,
  IconPresentation,
} from "@tabler/icons-react";
import { FilePreviewModal } from "./FilePreviewModal";
import {
  formatBytes,
  fetchSharedFolderView,
  getSharedDownloadUrl,
} from "../lib/driveApi";

// Icône selon extension
function getFileIcon(filename = "", mimetype = "") {
  const ext = (filename || "").split(".").pop().toLowerCase();
  const mime = (mimetype || "").toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mime.startsWith("image/")) {
    return <IconPhoto size={18} className="drive-icon-img" />;
  }
  if (["xlsx", "xls", "xlsm", "xlsb"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel")) {
    return <IconFileSpreadsheet size={18} style={{ color: "#107c41" }} />;
  }
  if (["docx", "doc", "docm", "dotx", "dot"].includes(ext) || mime.includes("wordprocessing") || mime.includes("msword")) {
    return <IconFileDescription size={18} style={{ color: "#185abd" }} />;
  }
  if (["pptx", "ppt", "ppsx", "pps"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint")) {
    return <IconPresentation size={18} style={{ color: "#c43e1c" }} />;
  }
  if (["pdf"].includes(ext) || mime.includes("pdf")) {
    return <IconFileText size={18} className="drive-icon-doc" />;
  }
  if (["txt", "md"].includes(ext) || mime.includes("text")) {
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

export function SharedView({ token, onBack }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [shareData, setShareData] = useState(null);
  const [currentSubpath, setCurrentSubpath] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { file, url }

  // Charger le contenu du partage
  const loadSharedContent = useCallback(async () => {
    if (!token) {
      setErrorMsg("Lien de partage manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchSharedFolderView(token, currentSubpath);
      if (!res.success) {
        // Il peut s'agir d'un partage de fichier unique
        if (res.error?.includes("fichier unique")) {
          setShareData({
            isSingleFile: true,
            token,
          });
        } else {
          setErrorMsg(res.error || "Lien de partage introuvable ou expiré.");
        }
      } else {
        setShareData(res);
      }
    } catch (err) {
      console.error("Erreur SharedView:", err);
      // Tentative pour fichier unique
      setShareData({ isSingleFile: true, token });
    } finally {
      setLoading(false);
    }
  }, [token, currentSubpath]);

  useEffect(() => {
    loadSharedContent();
  }, [loadSharedContent]);

  // Prévisualisation en ligne
  const handlePreviewItem = async (item, relativeFilePath = "") => {
    try {
      const { downloadUrl, filename, mimetype, size } = await getSharedDownloadUrl(token, relativeFilePath);
      setPreviewData({
        file: {
          name: filename || item?.name || "Document",
          mimetype: mimetype || item?.mimetype || "",
          size: size || item?.size || 0,
          path: relativeFilePath,
        },
        url: downloadUrl,
      });
    } catch (err) {
      alert("Impossible de prévisualiser ce fichier : " + err.message);
    }
  };

  // Téléchargement d'un fichier dans le dossier partagé
  const handleDownloadItem = async (relativeFilePath) => {
    setDownloading(true);
    try {
      const { downloadUrl, filename } = await getSharedDownloadUrl(token, relativeFilePath);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("Erreur lors du téléchargement : " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Navigation dans les sous-dossiers du dossier partagé (impossible de sortir)
  const subpathParts = currentSubpath ? currentSubpath.split("/").filter(Boolean) : [];

  const handleOpenSubfolder = (subfolderName) => {
    setCurrentSubpath((prev) => (prev ? `${prev}/${subfolderName}` : subfolderName));
  };

  const handleNavigateBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentSubpath("");
    } else {
      const nextSub = subpathParts.slice(0, index + 1).join("/");
      setCurrentSubpath(nextSub);
    }
  };

  return (
    <div className="site-shell shared-view-shell">
      {/* En-tête sobre conforme à la DA */}
      <header className="site-header">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); onBack(); }}>
          <span className="brand-name">Kevin Voisin</span>
          <span className="brand-role">Espace de partage sécurisé</span>
        </a>

        <div className="header-actions">
          <button type="button" className="admin-back-link" onClick={onBack}>
            <IconArrowLeft className="inline-arrow" stroke={1.8} /> Retour au portfolio
          </button>
        </div>
      </header>

      <main className="content shared-content">
        {loading ? (
          <div className="drive-loading-state" style={{ padding: "80px 0" }}>
            <IconRefresh size={28} stroke={1.5} className="spin-icon" />
            <p>Accès au document partagé en cours...</p>
          </div>
        ) : errorMsg ? (
          <div className="shared-error-card">
            <IconAlertCircle size={36} stroke={1.5} className="error-big-icon" />
            <h2>Lien inaccessible ou expiré</h2>
            <p>{errorMsg}</p>
            <button type="button" className="drive-btn drive-btn-primary" onClick={onBack}>
              Retourner au site principal
            </button>
          </div>
        ) : shareData?.isSingleFile ? (
          /* Vue Partage d'un Fichier Unique */
          <div className="shared-file-card">
            <div className="shared-file-icon-wrap">
              <IconFileText size={48} stroke={1.3} />
            </div>
            <span className="shared-pill-badge">Fichier partagé</span>
            <h2 className="shared-file-title">Document prêt</h2>
            <p className="shared-file-sub">
              Ce lien sécurisé vous autorise à consulter et télécharger ce document directement.
            </p>
            <div className="shared-single-actions">
              <button
                type="button"
                className="drive-btn drive-btn-secondary shared-action-btn"
                onClick={() => handlePreviewItem(null, "")}
              >
                <IconEye size={16} stroke={1.8} /> Visualiser en ligne
              </button>
              <button
                type="button"
                className="drive-btn drive-btn-primary shared-action-btn"
                onClick={() => handleDownloadItem("")}
                disabled={downloading}
              >
                <IconDownload size={16} stroke={1.8} />{" "}
                {downloading ? "Téléchargement..." : "Télécharger"}
              </button>
            </div>
          </div>
        ) : (
          /* Vue Partage d'un Dossier Complet */
          <div className="shared-folder-container">
            <div className="shared-folder-header">
              <div className="shared-folder-title-row">
                <span className="shared-folder-avatar">
                  <IconFolder size={24} stroke={1.6} />
                </span>
                <div>
                  <h1 className="shared-folder-name">{shareData.share_name}</h1>
                  <span className="shared-folder-meta">
                    {shareData.is_permanent ? (
                      <span className="meta-tag tag-permanent">
                        <IconWorld size={12} stroke={1.8} /> Partage permanent
                      </span>
                    ) : (
                      <span className="meta-tag tag-temp">
                        <IconClock size={12} stroke={1.8} /> Valide jusqu’au{" "}
                        {new Date(shareData.expires_at).toLocaleString("fr-CH")}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="shared-folder-notice">
                <span>Accès invité autonome : vous explorez exclusivement ce dossier.</span>
              </div>
            </div>

            {/* Fil d'Ariane de navigation dans le dossier partagé */}
            <nav className="drive-breadcrumbs shared-breadcrumbs" aria-label="Navigation dossier partagé">
              <button
                type="button"
                className={`breadcrumb-btn${subpathParts.length === 0 ? " is-current" : ""}`}
                onClick={() => handleNavigateBreadcrumb(-1)}
              >
                <IconFolder size={15} stroke={1.7} /> {shareData.share_name}
              </button>
              {subpathParts.map((part, index) => {
                const isLast = index === subpathParts.length - 1;
                return (
                  <span key={index} className="breadcrumb-segment">
                    <IconChevronRight size={14} stroke={1.8} className="breadcrumb-sep" />
                    <button
                      type="button"
                      className={`breadcrumb-btn${isLast ? " is-current" : ""}`}
                      onClick={() => handleNavigateBreadcrumb(index)}
                      disabled={isLast}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}
            </nav>

            {/* Liste des éléments du dossier partagé */}
            <div className="drive-items-table-wrapper shared-table-wrapper">
              {shareData.items?.length === 0 ? (
                <div className="drive-empty-state">
                  <IconFolder size={36} stroke={1.2} className="empty-folder-icon" />
                  <p>Ce dossier ne contient aucun fichier actuellement.</p>
                </div>
              ) : (
                <table className="drive-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Taille</th>
                      <th>Dernière modification</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareData.items.map((item) => {
                      const isFolder = item.kind === "folder";
                      const relPath = currentSubpath
                        ? `${currentSubpath}/${item.name}`
                        : item.name;

                      return (
                        <tr
                          key={item.name}
                          className={`drive-row ${isFolder ? "drive-row-folder" : "drive-row-file"}`}
                          onDoubleClick={() => isFolder ? handleOpenSubfolder(item.name) : handlePreviewItem(item, relPath)}
                        >
                          <td
                            className="cell-item-name"
                            onClick={() => isFolder ? handleOpenSubfolder(item.name) : handlePreviewItem(item, relPath)}
                            style={{ cursor: "pointer" }}
                            title={isFolder ? "Ouvrir le dossier" : "Visualiser en ligne"}
                          >
                            <div className="cell-item-name-inner">
                              <span className={isFolder ? "folder-icon-wrap" : "file-icon-wrap"}>
                                {isFolder ? (
                                  <IconFolder size={18} stroke={1.7} />
                                ) : (
                                  getFileIcon(item.name, item.mimetype)
                                )}
                              </span>
                              <span className="item-title">{item.name}</span>
                            </div>
                          </td>
                          <td className="cell-muted cell-mono">
                            {isFolder ? "Dossier" : formatBytes(item.size)}
                          </td>
                          <td className="cell-muted cell-mono">
                            {item.updated_at
                              ? new Date(item.updated_at).toLocaleDateString("fr-CH", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                          <td className="cell-actions" style={{ textAlign: "right" }}>
                            {isFolder ? (
                              <button
                                type="button"
                                className="drive-action-btn"
                                onClick={() => handleOpenSubfolder(item.name)}
                              >
                                Ouvrir
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="drive-action-btn btn-preview-action"
                                  onClick={() => handlePreviewItem(item, relPath)}
                                  title="Visualiser en ligne"
                                >
                                  <IconEye size={13} stroke={1.8} /> Aperçu
                                </button>
                                <button
                                  type="button"
                                  className="drive-action-btn btn-primary-action"
                                  onClick={() => handleDownloadItem(relPath)}
                                  disabled={downloading}
                                  title="Télécharger le fichier"
                                >
                                  <IconDownload size={13} stroke={1.8} /> Télécharger
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Modal d'aperçu / Visualisation en ligne pour le partage public */}
        <FilePreviewModal
          isOpen={Boolean(previewData)}
          onClose={() => setPreviewData(null)}
          file={previewData?.file}
          url={previewData?.url}
          shareToken={token}
          filePath={previewData?.file?.path}
          onDownload={() => previewData && handleDownloadItem(previewData.file.path)}
        />
      </main>
    </div>
  );
}
