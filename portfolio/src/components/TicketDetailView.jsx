import React, { useEffect, useState } from "react";
import {
  IconCalendarEvent,
  IconMapPin,
  IconUser,
  IconMail,
  IconPrinter,
  IconCalendarPlus,
  IconShare,
  IconCheck,
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowLeft,
  IconExternalLink,
  IconCreditCard,
} from "@tabler/icons-react";
import { generateQrCodeDataUrl, generateTicketIcs, markTicketPaid } from "../lib/ticketsApi";
import { TwintPaymentModal } from "./TwintPaymentModal";

export function TicketDetailView({ ticket: initialTicket, onBack, onValidateScan }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTwintModalOpen, setIsTwintModalOpen] = useState(false);

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  useEffect(() => {
    if (!ticket?.barcode_hash && !ticket?.ticket_code) return;
    const code = ticket.barcode_hash || ticket.ticket_code;
    generateQrCodeDataUrl(code, { width: 320, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Erreur QR Code:", err));
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="ticket-not-found-card">
        <h3>Billet introuvable</h3>
        <p>Le billet demandé n'existe pas ou le lien est expiré.</p>
        {onBack && (
          <button type="button" className="drive-btn" onClick={onBack}>
            ← Retour aux événements
          </button>
        )}
      </div>
    );
  }

  const event = ticket.event || {};
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const isUsed = ticket.status === "used";
  const isCancelled = ticket.status === "cancelled";
  const isPendingPayment = ticket.status === "pending_payment" || ticket.payment_status === "unpaid";
  const isValid = ticket.status === "valid" && !isPendingPayment;

  const handlePrint = () => {
    window.print();
  };

  const handleAddToCalendar = () => {
    generateTicketIcs(event, ticket);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/tickets?token=${ticket.barcode_hash || ticket.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePaymentSuccess = async () => {
    const updated = await markTicketPaid(ticket.id, {
      amount: ticket.amount_paid || ticket.category?.price,
      method: "twint",
    });
    setTicket((prev) => ({ ...prev, ...updated, status: "valid", payment_status: "paid" }));
    setIsTwintModalOpen(false);
  };

  const googleMapsUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;

  return (
    <div className="ticket-view-wrapper">
      {onBack && (
        <div className="ticket-top-nav no-print">
          <button type="button" className="ticket-back-btn" onClick={onBack}>
            <IconArrowLeft size={16} stroke={1.8} /> Retour aux événements
          </button>
        </div>
      )}

      {/* Carte du billet façon Swiss Modernist Boarding Pass */}
      <div className="swiss-ticket-card">
        {/* Bandeau supérieur */}
        <div className="ticket-card-header">
          <div className="ticket-brand">
            <span className="ticket-brand-badge">BILLET OFFICIEL</span>
            <span className="ticket-code-display">{ticket.ticket_code}</span>
          </div>
          <div className={`ticket-status-pill status-${ticket.status}`}>
            {isValid && (
              <>
                <IconCircleCheck size={14} stroke={2} /> BILLET VALIDE
              </>
            )}
            {isPendingPayment && (
              <>
                <IconAlertTriangle size={14} stroke={2} /> PAIEMENT REQUIS (TWINT)
              </>
            )}
            {isUsed && (
              <>
                <IconCheck size={14} stroke={2} /> COMPOSTÉ / UTILISÉ
              </>
            )}
            {isCancelled && (
              <>
                <IconAlertTriangle size={14} stroke={2} /> ANNULÉ
              </>
            )}
          </div>
        </div>

        {/* Corps principal : deux volets (Détails de l'événement et Coupon de contrôle QR) */}
        <div className="ticket-card-body">
          {/* Volet gauche : Infos événement et participant */}
          <div className="ticket-main-info">
            <div className="ticket-event-section">
              <span className="ticket-meta-label">ÉVÉNEMENT</span>
              <h2 className="ticket-event-title">{event.title || "Événement sans titre"}</h2>
              {event.description && (
                <p className="ticket-event-desc">{event.description}</p>
              )}
            </div>

            <div className="ticket-info-grid">
              <div className="ticket-info-block">
                <span className="ticket-meta-label">
                  <IconCalendarEvent size={13} stroke={1.8} /> DATE &amp; HEURE
                </span>
                <strong className="ticket-info-val">
                  {eventDate
                    ? eventDate.toLocaleDateString("fr-CH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Date à confirmer"}
                </strong>
                <span className="ticket-info-sub">
                  {eventDate
                    ? eventDate.toLocaleTimeString("fr-CH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) + " (Heure de Suisse)"
                    : ""}
                </span>
              </div>

              <div className="ticket-info-block">
                <span className="ticket-meta-label">
                  <IconMapPin size={13} stroke={1.8} /> LIEU &amp; SALLE
                </span>
                <strong className="ticket-info-val">{event.location || "Genève, Suisse"}</strong>
                {event.venue_hall && (
                  <span className="ticket-hall-sub">
                    🏛 <strong>{event.venue_hall}</strong>
                  </span>
                )}
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ticket-maps-link no-print"
                  >
                    Ouvrir sur Google Maps <IconExternalLink size={12} stroke={1.8} />
                  </a>
                )}
              </div>

              <div className="ticket-info-block">
                <span className="ticket-meta-label">
                  <IconUser size={13} stroke={1.8} /> PARTICIPANT
                </span>
                <strong className="ticket-info-val">{ticket.attendee_name}</strong>
                <span className="ticket-info-sub">
                  <IconMail size={11} stroke={1.6} /> {ticket.attendee_email}
                </span>
              </div>

              <div className="ticket-info-block">
                <span className="ticket-meta-label">FORMULE &amp; PAIEMENT</span>
                <span className="ticket-category-tag">{ticket.ticket_category}</span>
                <span className="ticket-info-sub">
                  {ticket.amount_paid > 0 ? (
                    ticket.payment_status === "paid" ? (
                      <span className="tkt-paid-tag">✓ Payé {ticket.amount_paid} CHF (TWINT/Stripe)</span>
                    ) : (
                      <span className="tkt-unpaid-tag">⚠ {ticket.amount_paid} CHF (En attente)</span>
                    )
                  ) : (
                    "Entrée Gratuite"
                  )}
                </span>
              </div>
            </div>

            {/* Bloc Conditionnement / Placement assis numéroté ou atelier */}
            {(ticket.seat_number || ticket.row_number || event.venue_hall || event.seating_type) && (
              <div className="ticket-seating-strip">
                {event.venue_hall && (
                  <div className="seating-item">
                    <span className="seating-label">ESPACE / SALLE</span>
                    <strong className="seating-val">{event.venue_hall}</strong>
                  </div>
                )}
                {ticket.zone_section && (
                  <div className="seating-item">
                    <span className="seating-label">ZONE / NIVEAU</span>
                    <strong className="seating-val">{ticket.zone_section}</strong>
                  </div>
                )}
                {ticket.row_number && (
                  <div className="seating-item">
                    <span className="seating-label">RANGÉE</span>
                    <strong className="seating-val is-highlight">{ticket.row_number}</strong>
                  </div>
                )}
                {ticket.seat_number && (
                  <div className="seating-item">
                    <span className="seating-label">PLACE / SIÈGE</span>
                    <strong className="seating-val is-highlight">{ticket.seat_number}</strong>
                  </div>
                )}
                {!ticket.seat_number && event.seating_type === "open" && (
                  <div className="seating-item">
                    <span className="seating-label">PLACEMENT</span>
                    <strong className="seating-val">Libre / Debout</strong>
                  </div>
                )}
              </div>
            )}

            {/* Conditions d'accès de l'événement si spécifiées */}
            {event.access_conditions && (
              <div className="ticket-conditions-strip">
                <span className="cond-tag">CONDITIONS D'ACCÈS</span>
                <p className="cond-text">{event.access_conditions}</p>
              </div>
            )}

            {/* Note d'utilisation */}
            <div className="ticket-notice-bar">
              <span className="notice-icon">ℹ</span>
              <span>
                {isPendingPayment
                  ? "Attention : ce billet n'est pas encore actif. Veuillez finaliser le règlement TWINT pour recevoir l'accès."
                  : "Veuillez présenter ce QR code à l'entrée sur votre smartphone ou imprimé. Un justificatif d'identité pourra être demandé lors du contrôle d'accès."}
              </span>
            </div>
          </div>

          {/* Ligne pointillée de détachement stylisée (style boarding pass) */}
          <div className="ticket-stub-divider">
            <div className="stub-notch top" />
            <div className="stub-line" />
            <div className="stub-notch bottom" />
          </div>

          {/* Volet droit : Code QR et contrôle de validité */}
          <div className="ticket-qr-section">
            {isPendingPayment ? (
              <div className="tkt-qr-pending-box">
                <div className="twint-lock-icon">🔒</div>
                <h4>Pass verrouillé</h4>
                <p>
                  Paiement TWINT requis pour activer votre code QR officiel ({ticket.amount_paid || ticket.category?.price || 0} CHF).
                </p>
                <button
                  type="button"
                  className="twint-pay-trigger-btn"
                  onClick={() => setIsTwintModalOpen(true)}
                >
                  <span className="twint-badge-dot" /> Payer avec TWINT
                </button>
              </div>
            ) : (
              <>
                <div className="qr-box-container">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Billet ${ticket.ticket_code}`}
                      className="ticket-qr-image"
                    />
                  ) : (
                    <div className="qr-loading-placeholder">Génération QR...</div>
                  )}
                </div>

                <div className="qr-security-token">
                  <span className="token-label">TOKEN SÉCURISÉ</span>
                  <code className="token-code">{ticket.barcode_hash ? ticket.barcode_hash.substring(0, 16) + "..." : ticket.ticket_code}</code>
                </div>

                {(ticket.seat_number || ticket.row_number) && (
                  <div className="qr-seat-callout">
                    <span>{ticket.row_number || ""} · {ticket.seat_number || ""}</span>
                  </div>
                )}

                {isUsed && (
                  <div className="used-stamp-overlay">
                    <span>COMPOSTÉ</span>
                    {ticket.scanned_at && (
                      <small>
                        {new Date(ticket.scanned_at).toLocaleDateString("fr-CH", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pied de carte avec informations légales / horodatage */}
        <div className="ticket-card-footer">
          <span>Émis le {new Date(ticket.created_at).toLocaleDateString("fr-CH")} • Kevin Voisin Ticketing Service</span>
          <span className="footer-doc-id">ID: {ticket.id}</span>
        </div>
      </div>

      {/* Barre d'actions sous le ticket */}
      <div className="ticket-actions-bar no-print">
        <button
          type="button"
          className="drive-btn drive-btn-primary"
          onClick={handlePrint}
          title="Imprimer ou enregistrer en PDF"
        >
          <IconPrinter size={16} stroke={1.8} /> Imprimer / Enregistrer PDF
        </button>

        <button
          type="button"
          className="drive-btn drive-btn-secondary"
          onClick={handleAddToCalendar}
          title="Ajouter au calendrier Apple, Google ou Outlook (.ics)"
        >
          <IconCalendarPlus size={16} stroke={1.8} /> Ajouter au calendrier
        </button>

        <button
          type="button"
          className="drive-btn drive-btn-secondary"
          onClick={handleCopyLink}
          title="Copier le lien direct de ce pass"
        >
          {copiedLink ? (
            <>
              <IconCheck size={16} stroke={2} style={{ color: "#059669" }} /> Lien copié !
            </>
          ) : (
            <>
              <IconShare size={16} stroke={1.8} /> Copier le lien
            </>
          )}
        </button>

        {isPendingPayment && (
          <button
            type="button"
            className="drive-btn btn-twint-action"
            onClick={() => setIsTwintModalOpen(true)}
          >
            Payer avec TWINT →
          </button>
        )}
      </div>

      {/* Modal de paiement TWINT si le pass est en attente */}
      <TwintPaymentModal
        isOpen={isTwintModalOpen}
        ticket={ticket}
        event={event}
        category={ticket.category}
        onClose={() => setIsTwintModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default TicketDetailView;
