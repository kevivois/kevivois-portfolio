import React, { useState, useEffect } from "react";
import {
  IconDeviceMobile,
  IconQrcode,
  IconCheck,
  IconX,
  IconShieldCheck,
  IconCreditCard,
  IconExternalLink,
} from "@tabler/icons-react";
import { generateQrCodeDataUrl } from "../lib/ticketsApi";

export function TwintPaymentModal({
  isOpen,
  ticket,
  event,
  category,
  onClose,
  onPaymentSuccess,
}) {
  const [activeTab, setActiveTab] = useState("qr"); // "qr" | "code"
  const [qrUrl, setQrUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [twintPin, setTwintPin] = useState("48291");

  useEffect(() => {
    if (isOpen && ticket) {
      // Générer un code à 5 chiffres aléatoire réaliste TWINT
      const randomPin = Math.floor(10000 + Math.random() * 90000).toString();
      setTwintPin(randomPin);

      // Générer le QR code de paiement TWINT
      const payload = `twint://payment?amount=${category?.price || ticket?.amount_paid || 0}&currency=CHF&ref=${ticket.ticket_code}`;
      generateQrCodeDataUrl(payload, { width: 280, margin: 1, color: { dark: "#111111", light: "#ffffff" } })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("Erreur génération QR TWINT:", err));
    }
  }, [isOpen, ticket, category]);

  if (!isOpen || !ticket) return null;

  const amount = Number(category?.price || ticket.amount_paid || 0).toFixed(2);
  const currency = category?.currency || "CHF";

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      if (onPaymentSuccess) {
        await onPaymentSuccess(ticket);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tkt-modal-backdrop" onClick={onClose}>
      <div
        className="tkt-modal-card twint-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête officiel façon TWINT */}
        <div className="twint-modal-header">
          <div className="twint-brand-lockup">
            <div className="twint-logo-badge">
              <span className="twint-logo-text">TWINT</span>
            </div>
            <div className="twint-title-text">
              <span className="twint-kicker">PAIEMENT SÉCURISÉ SUISSE</span>
              <h3 className="twint-heading">Payer avec TWINT</h3>
            </div>
          </div>
          <button
            type="button"
            className="tkt-modal-close twint-close-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="twint-modal-body">
          {/* Montant & Récapitulatif */}
          <div className="twint-amount-banner">
            <div className="twint-amount-left">
              <span className="twint-amount-label">MONTANT TOTAL</span>
              <strong className="twint-amount-value">
                {amount} <span className="twint-currency">{currency}</span>
              </strong>
            </div>
            <div className="twint-details-right">
              <span className="twint-item-title">{event?.title || "Billet Événement"}</span>
              <span className="twint-item-cat">
                Formule : <strong>{category?.name || ticket.ticket_category}</strong>
              </span>
              <span className="twint-item-ref">Réf: {ticket.ticket_code}</span>
            </div>
          </div>

          {/* Onglets de paiement TWINT : QR Code vs Code à 5 chiffres */}
          <div className="twint-tabs-switch">
            <button
              type="button"
              className={`twint-tab-btn ${activeTab === "qr" ? "is-active" : ""}`}
              onClick={() => setActiveTab("qr")}
            >
              <IconQrcode size={15} stroke={2} /> Scanner QR Code
            </button>
            <button
              type="button"
              className={`twint-tab-btn ${activeTab === "code" ? "is-active" : ""}`}
              onClick={() => setActiveTab("code")}
            >
              <IconDeviceMobile size={15} stroke={2} /> Code à 5 chiffres
            </button>
          </div>

          {/* Volet 1 : QR Code TWINT */}
          {activeTab === "qr" && (
            <div className="twint-panel-qr">
              <p className="twint-instructions">
                1. Ouvrez l'application <strong>TWINT</strong> sur votre smartphone.<br />
                2. Appuyez sur l'icône <strong>QR code</strong> et scannez l'image ci-dessous :
              </p>

              <div className="twint-qr-wrapper">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt={`Paiement TWINT ${amount} CHF`}
                    className="twint-qr-img"
                  />
                ) : (
                  <div className="twint-qr-loading">Génération du QR Code...</div>
                )}
                <div className="twint-qr-center-pill">
                  <span>TWINT</span>
                </div>
              </div>

              <span className="twint-scan-hint">
                <IconShieldCheck size={14} stroke={2} /> Confirmation instantanée et sécurisée
              </span>
            </div>
          )}

          {/* Volet 2 : Code 5 chiffres */}
          {activeTab === "code" && (
            <div className="twint-panel-code">
              <p className="twint-instructions">
                Entrez ce code numérique dans votre application TWINT (option « Entrer le code ») :
              </p>

              <div className="twint-pin-box">
                {twintPin.split("").map((digit, i) => (
                  <span key={i} className="twint-pin-digit">
                    {digit}
                  </span>
                ))}
              </div>

              <span className="twint-scan-hint">
                Valable 5 minutes pour régler {amount} {currency}
              </span>
            </div>
          )}

          {/* Actions & Simulation de validation */}
          <div className="twint-modal-actions">
            <button
              type="button"
              className="twint-btn-cancel"
              onClick={onClose}
              disabled={processing}
            >
              Annuler
            </button>

            <button
              type="button"
              className="twint-btn-confirm"
              onClick={handleConfirmPayment}
              disabled={processing}
            >
              {processing ? (
                "Validation du paiement..."
              ) : (
                <>
                  <IconCheck size={16} stroke={2.2} /> Valider le paiement TWINT ({amount} CHF)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="twint-modal-footer">
          <span>Paiement protégé par le standard bancaire suisse • TWINT SA</span>
        </div>
      </div>
    </div>
  );
}

export default TwintPaymentModal;
