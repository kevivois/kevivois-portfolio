import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  IconCamera,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconCircleCheck,
  IconRotateClockwise,
  IconSearch,
  IconHistory,
  IconUser,
  IconTicket,
} from "@tabler/icons-react";
import { validateAndScanTicket } from "../lib/ticketsApi";

// Synthétiseur audio léger natif (Web Audio API) pour le feedback du scan
function playScanSound(type = "success") {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "success") {
      // Bip ascendant aigu agréable
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Double buzzer grave d'erreur
      [0, 0.15].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.12);
      });
    }
  } catch (err) {
    console.warn("Audio non supporté:", err);
  }
}

export function TicketScannerModal({ isOpen, onClose, onTicketScanned }) {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const processingLockRef = useRef(false);

  // Arrêter le flux caméra
  const stopStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Traiter un code scanné ou saisi manuellement
  const handleProcessCode = useCallback(async (code) => {
    if (!code || processingLockRef.current) return;
    processingLockRef.current = true;
    setIsProcessing(true);

    try {
      const res = await validateAndScanTicket(code, "Scanner Caméra");

      if (res.success) {
        playScanSound("success");
      } else {
        playScanSound("error");
      }

      setScanResult(res);

      const historyEntry = {
        id: Date.now(),
        code,
        success: res.success,
        reason: res.reason,
        attendeeName: res.ticket?.attendee_name || "Inconnu",
        category: res.ticket?.ticket_category || "-",
        time: new Date().toLocaleTimeString("fr-CH"),
      };
      setScanHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);

      if (onTicketScanned) {
        onTicketScanned(res);
      }
    } catch (err) {
      playScanSound("error");
      setScanResult({
        success: false,
        reason: "error",
        message: "Erreur de validation : " + (err.message || "Erreur réseau"),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onTicketScanned]);

  // Boucle de détection vidéo (BarcodeDetector natif ou fallback jsQR)
  const startDetectionLoop = useCallback(() => {
    const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    let detector = null;
    if (hasBarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code", "data_matrix"] });
      } catch {
        detector = null;
      }
    }

    const checkFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      if (processingLockRef.current) {
        // En attente du billet suivant
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      try {
        if (detector) {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleProcessCode(barcodes[0].rawValue);
            animationFrameRef.current = requestAnimationFrame(checkFrame);
            return;
          }
        }
      } catch {
        // Si BarcodeDetector échoue, repli sur jsQR
      }

      // Fallback jsQR
      try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            handleProcessCode(code.data);
          }
        }
      } catch {
        // Ignorer erreurs trame
      }

      animationFrameRef.current = requestAnimationFrame(checkFrame);
    };

    animationFrameRef.current = requestAnimationFrame(checkFrame);
  }, [handleProcessCode]);

  // Démarrer la caméra
  const startCamera = useCallback(async (deviceId = "") => {
    stopStream();
    setCameraError(null);

    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        startDetectionLoop();
      }

      // Lister les périphériques disponibles pour sélection
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);
    } catch (err) {
      console.warn("Erreur accès caméra:", err);
      setCameraError(
        "Accès à la caméra refusé ou indisponible. Vous pouvez saisir manuellement le code du billet."
      );
    }
  }, [stopStream, startDetectionLoop]);

  // Gestion ouverture / fermeture
  useEffect(() => {
    if (isOpen) {
      processingLockRef.current = false;
      setScanResult(null);
      startCamera(selectedCameraId);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, selectedCameraId, startCamera, stopStream]);

  // Passer au billet suivant (déverrouiller le scanner)
  const handleNextScan = () => {
    processingLockRef.current = false;
    setScanResult(null);
  };

  // Saisie manuelle
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode.trim());
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-modal-backdrop" onClick={onClose}>
      <div className="scanner-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* En-tête du scanner */}
        <div className="scanner-modal-header">
          <div className="scanner-modal-title">
            <span className="scanner-live-dot" />
            <IconCamera size={18} stroke={1.8} />
            <h3>Contrôle d'accès & Scanner QR</h3>
          </div>
          <button
            type="button"
            className="scanner-close-btn"
            onClick={onClose}
            title="Fermer le scanner"
          >
            <IconX size={18} stroke={1.8} />
          </button>
        </div>

        {/* Corps du scanner */}
        <div className="scanner-modal-body">
          {/* Zone vidéo */}
          <div className="scanner-camera-container">
            <video
              ref={videoRef}
              className="scanner-video-feed"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Viseur animé de scan */}
            <div className="scanner-overlay-reticle">
              <div className="reticle-corner top-left" />
              <div className="reticle-corner top-right" />
              <div className="reticle-corner bottom-left" />
              <div className="reticle-corner bottom-right" />
              <div className="scanner-laser-line" />
            </div>

            {cameraError && (
              <div className="scanner-camera-error">
                <IconAlertTriangle size={24} stroke={1.8} />
                <p>{cameraError}</p>
                <small>Vous pouvez utiliser la saisie manuelle ci-dessous.</small>
              </div>
            )}
          </div>

          {/* Sélecteur de caméra si multiples */}
          {cameras.length > 1 && (
            <div className="camera-switch-bar">
              <IconRotateClockwise size={14} stroke={1.8} />
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="camera-select"
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId || i} value={c.deviceId}>
                    {c.label || `Caméra ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Résultat du Scan Instantané */}
          {scanResult && (
            <div
              className={`scan-result-card result-${
                scanResult.reason || (scanResult.success ? "valid" : "error")
              }`}
            >
              <div className="result-header">
                {scanResult.success ? (
                  <div className="result-badge badge-valid">
                    <IconCircleCheck size={20} stroke={2.2} />
                    <span>ACCÈS AUTORISÉ</span>
                  </div>
                ) : scanResult.reason === "already_used" ? (
                  <div className="result-badge badge-warning">
                    <IconAlertTriangle size={20} stroke={2.2} />
                    <span>DÉJÀ COMPOSTÉ !</span>
                  </div>
                ) : (
                  <div className="result-badge badge-danger">
                    <IconX size={20} stroke={2.2} />
                    <span>BILLET INVALIDE</span>
                  </div>
                )}
              </div>

              <div className="result-content">
                <p className="result-main-message">{scanResult.message}</p>

                {scanResult.ticket && (
                  <div className="result-ticket-details">
                    <div className="result-detail-row">
                      <span className="detail-label">
                        <IconUser size={13} stroke={1.7} /> Participant :
                      </span>
                      <strong>{scanResult.ticket.attendee_name}</strong>
                    </div>

                    <div className="result-detail-row">
                      <span className="detail-label">
                        <IconTicket size={13} stroke={1.7} /> Catégorie :
                      </span>
                      <span className="ticket-cat-badge">
                        {scanResult.ticket.ticket_category}
                      </span>
                      <span className="ticket-code-tag">
                        {scanResult.ticket.ticket_code}
                      </span>
                    </div>

                    {scanResult.reason === "already_used" && scanResult.scanned_at && (
                      <div className="result-detail-row alert-sub">
                        <span>Premier scan enregistré le :</span>
                        <strong>
                          {new Date(scanResult.scanned_at).toLocaleString("fr-CH")}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="scanner-next-btn"
                onClick={handleNextScan}
              >
                Scanner le billet suivant →
              </button>
            </div>
          )}

          {/* Saisie manuelle de référence */}
          <div className="scanner-manual-box">
            <span className="manual-box-title">Saisie manuelle de référence</span>
            <form onSubmit={handleManualSubmit} className="manual-input-form">
              <input
                type="text"
                placeholder="Ex: KV-VIP-001 ou token..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="manual-text-input"
                disabled={isProcessing}
              />
              <button
                type="submit"
                className="manual-submit-btn"
                disabled={isProcessing || !manualCode.trim()}
              >
                <IconSearch size={14} stroke={1.8} /> Valider
              </button>
            </form>
          </div>

          {/* Historique récent de session */}
          {scanHistory.length > 0 && (
            <div className="scanner-session-history">
              <div className="history-head">
                <IconHistory size={14} stroke={1.8} />
                <span>Derniers contrôles ({scanHistory.length})</span>
              </div>
              <ul className="history-list">
                {scanHistory.slice(0, 5).map((h) => (
                  <li
                    key={h.id}
                    className={`history-item ${h.success ? "is-valid" : "is-failed"}`}
                  >
                    <span className="hist-status-icon">
                      {h.success ? (
                        <IconCheck size={12} stroke={2.5} />
                      ) : (
                        <IconX size={12} stroke={2.5} />
                      )}
                    </span>
                    <strong className="hist-name">{h.attendeeName}</strong>
                    <span className="hist-cat">{h.category}</span>
                    <span className="hist-time">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketScannerModal;
