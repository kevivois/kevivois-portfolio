import { useState, useEffect } from "react";
import {
  IconX,
  IconDownload,
  IconArrowsMaximize,
  IconFileText,
  IconFile,
  IconRefresh,
  IconAlertCircle,
  IconFileSpreadsheet,
  IconFileDescription,
  IconPresentation,
  IconExternalLink,
} from "@tabler/icons-react";
import { formatBytes } from "../lib/driveApi";

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  url,
  onDownload,
  shareToken = "",
  filePath = "",
}) {
  const [textContent, setTextContent] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState("");
  const [officeEngine, setOfficeEngine] = useState("microsoft"); // "microsoft" | "google"
  const [officeLoading, setOfficeLoading] = useState(true);

  const filename = file?.name || "Fichier";
  const ext = filename.split(".").pop().toLowerCase();
  const mime = (file?.mimetype || "").toLowerCase();

  // Détection des catégories de médias et documents
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"].includes(ext) || mime.startsWith("image/");
  const isPdf = ext === "pdf" || mime.includes("pdf");
  const isVideo = ["mp4", "webm", "mov", "ogg"].includes(ext) || mime.startsWith("video/");
  const isAudio = ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext) || mime.startsWith("audio/");

  // Documents Microsoft Office & Suites bureautiques
  const isExcel = ["xlsx", "xls", "xlsm", "xlsb"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel");
  const isWord = ["docx", "doc", "docm", "dotx", "dot"].includes(ext) || mime.includes("wordprocessing") || mime.includes("msword");
  const isPowerPoint = ["pptx", "ppt", "ppsx", "pps"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint");
  const isOffice = isExcel || isWord || isPowerPoint;

  const isText = !isOffice && (
    [
      "txt", "md", "json", "js", "jsx", "ts", "tsx", "html", "css",
      "py", "sql", "csv", "xml", "log", "env", "yaml", "yml"
    ].includes(ext) || mime.startsWith("text/") || mime.includes("json")
  );

  // URL plein écran propre hébergée sur le site
  const resolvedPath = file?.path || filePath || filename;
  const previewPageUrl = shareToken
    ? `/preview?token=${encodeURIComponent(shareToken)}${resolvedPath ? `&path=${encodeURIComponent(resolvedPath)}` : ""}&name=${encodeURIComponent(filename)}`
    : `/preview?path=${encodeURIComponent(resolvedPath)}&name=${encodeURIComponent(filename)}`;

  const handleOpenFullscreenPage = () => {
    try {
      sessionStorage.setItem(
        "portfolio_preview_cache",
        JSON.stringify({
          name: filename,
          size: file?.size || 0,
          mimetype: file?.mimetype || "",
          url,
          path: resolvedPath,
          token: shareToken,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Storage error:", e);
    }
  };

  // Réinitialiser le chargement de la visionneuse Office quand l'URL ou le moteur change
  useEffect(() => {
    if (isOffice && url) {
      setOfficeLoading(true);
    }
  }, [isOffice, url, officeEngine]);

  // Charger le contenu texte si fichier texte / code
  useEffect(() => {
    if (!isOpen || !file) {
      setTextContent("");
      setTextError("");
      return;
    }
    if (isText && url) {
      setLoadingText(true);
      setTextError("");
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Impossible de lire le fichier");
          return res.text();
        })
        .then((txt) => {
          setTextContent(txt);
        })
        .catch((err) => {
          setTextError("Erreur lors de la lecture du fichier : " + err.message);
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [isOpen, file, isText, url]);

  // Fermeture avec la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  return (
    <div className="file-preview-overlay" onClick={onClose}>
      <div className="file-preview-container" onClick={(e) => e.stopPropagation()}>
        {/* En-tête de l'aperçu */}
        <div className="preview-header">
          <div className="preview-title-wrap">
            <h3 className="preview-filename">{filename}</h3>
            <span className="preview-meta">
              {file.size ? formatBytes(file.size) : ""} {file.mimetype ? `· ${file.mimetype}` : ""}
            </span>
          </div>

          <div className="preview-header-actions">
            {url && (
              <a
                href={previewPageUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleOpenFullscreenPage}
                className="preview-btn preview-btn-secondary"
                title="Ouvrir en plein écran sur le site"
              >
                <IconArrowsMaximize size={14} stroke={1.8} /> Plein écran
              </a>
            )}

            {onDownload && (
              <button
                type="button"
                className="preview-btn preview-btn-primary"
                onClick={onDownload}
                title="Télécharger le fichier"
              >
                <IconDownload size={14} stroke={1.8} /> Télécharger
              </button>
            )}

            <button
              type="button"
              className="preview-close-btn"
              onClick={onClose}
              title="Fermer l'aperçu (Échap)"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>
        </div>

        {/* Corps de l'aperçu dynamique selon le format */}
        <div className="preview-body">
          {isImage ? (
            <div className="preview-image-wrap">
              <img src={url} alt={filename} className="preview-image" />
            </div>
          ) : isPdf ? (
            <div className="preview-pdf-wrap">
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                title={filename}
                className="preview-pdf-iframe"
              />
            </div>
          ) : isOffice ? (
            <div className="preview-office-wrap">
              <div className="preview-office-toolbar">
                <div className="office-doc-type-badge">
                  {isExcel ? (
                    <>
                      <IconFileSpreadsheet size={16} style={{ color: "#107c41" }} stroke={1.8} />
                      <span>Classeur Excel · {ext.toUpperCase()}</span>
                    </>
                  ) : isWord ? (
                    <>
                      <IconFileDescription size={16} style={{ color: "#185abd" }} stroke={1.8} />
                      <span>Document Word · {ext.toUpperCase()}</span>
                    </>
                  ) : (
                    <>
                      <IconPresentation size={16} style={{ color: "#c43e1c" }} stroke={1.8} />
                      <span>Présentation PowerPoint · {ext.toUpperCase()}</span>
                    </>
                  )}
                </div>

                <div className="office-controls-right">
                  <div className="office-engine-switcher" role="group" aria-label="Moteur de visionneuse">
                    <button
                      type="button"
                      className={`office-engine-btn${officeEngine === "microsoft" ? " is-active" : ""}`}
                      onClick={() => setOfficeEngine("microsoft")}
                      title="Visionneuse officielle Microsoft Office 365 Web"
                    >
                      <span className="engine-dot ms-dot" /> Microsoft 365
                    </button>
                    <button
                      type="button"
                      className={`office-engine-btn${officeEngine === "google" ? " is-active" : ""}`}
                      onClick={() => setOfficeEngine("google")}
                      title="Visionneuse de secours Google Docs"
                    >
                      <span className="engine-dot google-dot" /> Google Docs
                    </button>
                  </div>

                  <a
                    href={
                      officeEngine === "microsoft"
                        ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
                        : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="office-popout-btn"
                    title="Ouvrir la visionneuse dans un nouvel onglet"
                  >
                    <IconExternalLink size={13} stroke={1.8} /> Nouvel onglet
                  </a>
                </div>
              </div>

              <div className="preview-office-frame-box">
                {officeLoading && (
                  <div className="preview-office-loading">
                    <IconRefresh size={22} className="spin-icon" />
                    <span>
                      Chargement de la visionneuse {officeEngine === "microsoft" ? "Microsoft Office 365" : "Google Docs"}...
                    </span>
                  </div>
                )}
                <iframe
                  key={`${officeEngine}-${url}`}
                  src={
                    officeEngine === "microsoft"
                      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
                      : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
                  }
                  title={filename}
                  className="preview-office-iframe"
                  onLoad={() => setOfficeLoading(false)}
                />
              </div>
            </div>
          ) : isVideo ? (
            <div className="preview-video-wrap">
              <video src={url} controls autoPlay className="preview-video" playsInline />
            </div>
          ) : isAudio ? (
            <div className="preview-audio-wrap">
              <IconFileText size={48} stroke={1.4} className="preview-audio-icon" />
              <audio src={url} controls autoPlay className="preview-audio" />
            </div>
          ) : isText ? (
            <div className="preview-text-wrap">
              {loadingText ? (
                <div className="preview-loading">
                  <IconRefresh size={22} className="spin-icon" />
                  <p>Chargement du document...</p>
                </div>
              ) : textError ? (
                <div className="preview-unsupported">
                  <IconAlertCircle size={32} stroke={1.6} color="#dc2626" />
                  <p>{textError}</p>
                </div>
              ) : (
                <pre className="preview-code-block">
                  <code>{textContent}</code>
                </pre>
              )}
            </div>
          ) : (
            /* Format non visualisable directement dans le navigateur (ex: zip, exe, psd) */
            <div className="preview-unsupported">
              <IconFile size={54} stroke={1.2} className="unsupported-icon" />
              <h4>Aperçu direct non disponible pour ce format</h4>
              <p>
                Ce type de fichier ({ext.toUpperCase()}) ne peut pas être prévisualisé dans le navigateur.
                Vous pouvez le télécharger directement sur votre appareil.
              </p>
              {onDownload && (
                <button
                  type="button"
                  className="drive-btn drive-btn-primary"
                  onClick={onDownload}
                  style={{ marginTop: 12 }}
                >
                  <IconDownload size={15} stroke={1.8} /> Télécharger le fichier ({formatBytes(file.size)})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
