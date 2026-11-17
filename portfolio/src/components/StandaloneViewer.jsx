import { useState, useEffect, useRef } from "react";
import {
  IconArrowLeft,
  IconDownload,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconFileText,
  IconFile,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconShare,
} from "@tabler/icons-react";
import { formatBytes, getFileDownloadUrl, getSharedDownloadUrl } from "../lib/driveApi";
import { supabase } from "../lib/supabase";

export function StandaloneViewer({ token = "", filePath = "", fileName = "", onBack }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileInfo, setFileInfo] = useState({
    name: fileName || "Fichier",
    size: 0,
    mimetype: "",
    url: "",
  });
  const [textContent, setTextContent] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const viewerRef = useRef(null);

  // Écoute du changement d'état plein écran natif (F11 ou API HTML5)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Détection des catégories de médias
  const filename = fileInfo.name || fileName || "Fichier";
  const ext = filename.split(".").pop().toLowerCase();
  const mime = (fileInfo.mimetype || "").toLowerCase();

  const isImage =
    ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"].includes(ext) ||
    mime.startsWith("image/");
  const isPdf = ext === "pdf" || mime.includes("pdf");
  const isVideo = ["mp4", "webm", "mov", "ogg"].includes(ext) || mime.startsWith("video/");
  const isAudio = ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext) || mime.startsWith("audio/");
  const isText =
    [
      "txt", "md", "json", "js", "jsx", "ts", "tsx", "html", "css",
      "py", "sql", "csv", "xml", "log", "env", "yaml", "yml"
    ].includes(ext) ||
    mime.startsWith("text/") ||
    mime.includes("json");

  // Chargement du fichier
  useEffect(() => {
    let isCancelled = false;

    const loadContent = async () => {
      setLoading(true);
      setErrorMsg("");

      // 1. Tenter la lecture instantanée depuis le cache de session
      try {
        const cachedRaw = sessionStorage.getItem("portfolio_preview_cache");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          // Si le cache est récent (< 3h) et correspond au fichier demandé (ou aucun nom spécifié)
          if (
            cached.url &&
            (!fileName || cached.name === fileName || cached.path === filePath) &&
            Date.now() - (cached.timestamp || 0) < 3 * 3600 * 1000
          ) {
            if (!isCancelled) {
              setFileInfo({
                name: cached.name || fileName || "Document",
                size: cached.size || 0,
                mimetype: cached.mimetype || "",
                url: cached.url,
              });
              document.title = `${cached.name || fileName} · Plein écran | Kevin Voisin`;
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Erreur lecture cache preview:", err);
      }

      // 2. Si non présent dans le cache ou lien partagé avec token
      try {
        if (token) {
          // Accès invité via lien partagé
          const res = await getSharedDownloadUrl(token, filePath);
          if (isCancelled) return;
          setFileInfo({
            name: res.filename || fileName || "Document",
            size: res.size || 0,
            mimetype: res.mimetype || "",
            url: res.downloadUrl,
          });
          document.title = `${res.filename || fileName} · Plein écran | Kevin Voisin`;
        } else if (filePath) {
          // Accès administrateur
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Authentification requise pour prévisualiser ce document du drive.");
          }
          const downloadUrl = await getFileDownloadUrl(filePath, 7200);
          if (isCancelled) return;
          setFileInfo((prev) => ({
            ...prev,
            name: fileName || filePath.split("/").pop() || "Document",
            url: downloadUrl,
          }));
          document.title = `${fileName || filePath.split("/").pop()} · Plein écran | Kevin Voisin`;
        } else {
          throw new Error("Paramètres de fichier manquants (aucun chemin ou token fourni).");
        }
      } catch (err) {
        if (!isCancelled) {
          setErrorMsg(err.message || "Impossible de charger le document.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isCancelled = true;
    };
  }, [token, filePath, fileName]);

  // Si c'est un document texte, charger son contenu brut pour l'afficher
  useEffect(() => {
    if (isText && fileInfo.url) {
      setLoadingText(true);
      fetch(fileInfo.url)
        .then((res) => {
          if (!res.ok) throw new Error("Erreur de lecture");
          return res.text();
        })
        .then((txt) => setTextContent(txt))
        .catch((err) => console.warn("Erreur lecture texte:", err))
        .finally(() => setLoadingText(false));
    }
  }, [isText, fileInfo.url]);

  // Plein écran natif (API HTML5 Fullscreen)
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      const target = viewerRef.current || document.documentElement;
      if (target.requestFullscreen) {
        target.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Téléchargement direct
  const handleDownload = () => {
    if (!fileInfo.url) return;
    const a = document.createElement("a");
    a.href = fileInfo.url;
    a.download = fileInfo.name || "fichier";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copier le lien de la page
  const handleCopyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copier le code (si fichier texte)
  const handleCopyCode = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Bouton retour
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = token ? `/share/${token}` : "/admin";
    }
  };

  return (
    <div className="standalone-viewer-shell" ref={viewerRef}>
      {/* Barre d'en-tête du visualiseur pleine page */}
      <header className="standalone-header">
        <div className="standalone-left">
          <button
            type="button"
            className="standalone-btn standalone-back-btn"
            onClick={handleBack}
            title="Retour à la page précédente"
          >
            <IconArrowLeft size={16} stroke={2} />
            <span>Retour</span>
          </button>

          <div className="standalone-meta-wrap">
            <h1 className="standalone-filename" title={filename}>
              {filename}
            </h1>
            <span className="standalone-tags">
              {fileInfo.size > 0 && <span>{formatBytes(fileInfo.size)}</span>}
              {ext && <span className="standalone-ext-tag">{ext.toUpperCase()}</span>}
            </span>
          </div>
        </div>

        <div className="standalone-actions">
          {isText && textContent && (
            <button
              type="button"
              className="standalone-btn"
              onClick={handleCopyCode}
              title="Copier le code"
            >
              {copiedCode ? <IconCheck size={15} stroke={2} /> : <IconCopy size={15} stroke={1.8} />}
              <span>{copiedCode ? "Copié !" : "Copier"}</span>
            </button>
          )}

          <button
            type="button"
            className="standalone-btn"
            onClick={handleCopyPageLink}
            title="Copier le lien plein écran de ce fichier"
          >
            {copiedLink ? <IconCheck size={15} stroke={2} /> : <IconShare size={15} stroke={1.8} />}
            <span>{copiedLink ? "Lien copié" : "Partager"}</span>
          </button>

          <button
            type="button"
            className="standalone-btn"
            onClick={toggleNativeFullscreen}
            title={isFullscreen ? "Quitter le plein écran (Échap)" : "Plein écran complet"}
          >
            {isFullscreen ? (
              <>
                <IconArrowsMinimize size={15} stroke={1.8} />
                <span>Fenêtré</span>
              </>
            ) : (
              <>
                <IconArrowsMaximize size={15} stroke={1.8} />
                <span>Plein écran</span>
              </>
            )}
          </button>

          {fileInfo.url && (
            <button
              type="button"
              className="standalone-btn standalone-btn-primary"
              onClick={handleDownload}
              title="Télécharger le fichier"
            >
              <IconDownload size={15} stroke={2} />
              <span>Télécharger</span>
            </button>
          )}
        </div>
      </header>

      {/* Corps du visualiseur pleine page */}
      <main className="standalone-body">
        {loading ? (
          <div className="standalone-loading">
            <IconRefresh size={32} className="spin-icon" stroke={1.5} />
            <p>Chargement du document...</p>
          </div>
        ) : errorMsg ? (
          <div className="standalone-error-box">
            <IconAlertCircle size={36} stroke={1.5} color="#dc2626" />
            <h3>Impossible d'afficher le document</h3>
            <p>{errorMsg}</p>
            <button
              type="button"
              className="drive-btn drive-btn-secondary"
              onClick={handleBack}
              style={{ marginTop: 14 }}
            >
              Retourner à l'accueil
            </button>
          </div>
        ) : (
          <div className="standalone-content-canvas">
            {isImage ? (
              <div className="standalone-image-canvas">
                <img
                  src={fileInfo.url}
                  alt={filename}
                  className="standalone-image-element"
                />
              </div>
            ) : isPdf ? (
              <div className="standalone-pdf-canvas">
                <iframe
                  src={`${fileInfo.url}#toolbar=1&navpanes=0`}
                  title={filename}
                  className="standalone-pdf-frame"
                />
              </div>
            ) : isVideo ? (
              <div className="standalone-video-canvas">
                <video
                  src={fileInfo.url}
                  controls
                  autoPlay
                  className="standalone-video-element"
                  playsInline
                />
              </div>
            ) : isAudio ? (
              <div className="standalone-audio-canvas">
                <div className="standalone-audio-card">
                  <IconFileText size={56} stroke={1.3} className="standalone-audio-icon" />
                  <h3>{filename}</h3>
                  <audio
                    src={fileInfo.url}
                    controls
                    autoPlay
                    className="standalone-audio-element"
                  />
                </div>
              </div>
            ) : isText ? (
              <div className="standalone-text-canvas">
                {loadingText ? (
                  <div className="standalone-loading">
                    <IconRefresh size={24} className="spin-icon" />
                    <p>Lecture du document textuel...</p>
                  </div>
                ) : (
                  <pre className="standalone-code-element">
                    <code>{textContent}</code>
                  </pre>
                )}
              </div>
            ) : (
              <div className="standalone-unsupported-canvas">
                <IconFile size={64} stroke={1.2} className="standalone-unsupported-icon" />
                <h3>Aperçu direct non pris en charge</h3>
                <p>
                  Le format de ce fichier (<strong>{ext.toUpperCase()}</strong>) ne peut pas être
                  affiché nativement dans le navigateur. Vous pouvez le télécharger directement sur votre appareil.
                </p>
                <button
                  type="button"
                  className="drive-btn drive-btn-primary"
                  onClick={handleDownload}
                  style={{ marginTop: 16 }}
                >
                  <IconDownload size={15} stroke={2} /> Télécharger ({formatBytes(fileInfo.size)})
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
