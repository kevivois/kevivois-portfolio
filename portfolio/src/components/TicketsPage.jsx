import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconTicket,
  IconCamera,
  IconCalendarEvent,
  IconMapPin,
  IconSearch,
  IconExternalLink,
  IconLock,
  IconArrowLeft,
  IconSparkles,
  IconUser,
  IconMail,
  IconShieldLock,
  IconArmchair,
} from "@tabler/icons-react";
import {
  listEvents,
  listCategories,
  listTickets,
  issueTicket,
  getTicketByHashOrId,
  createCheckoutSession,
  markTicketPaid,
  EVENT_TYPE_LABELS,
  SEATING_TYPE_LABELS,
} from "../lib/ticketsApi";
import { TicketDetailView } from "./TicketDetailView";
import { TicketScannerModal } from "./TicketScannerModal";
import { TwintPaymentModal } from "./TwintPaymentModal";
import { SeatPicker } from "./SeatPicker";

export function TicketsPage({ onNavigateHome }) {
  const [events, setEvents] = useState([]);
  const [categoriesByEvent, setCategoriesByEvent] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Billet actif en cours de visualisation (pass)
  const [viewingTicket, setViewingTicket] = useState(null);

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Modal de réservation publique
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingEvent, setBookingEvent] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Standard");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Sélection visuelle de siège (Places numérotées)
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatPicker, setShowSeatPicker] = useState(false);
  const [eventExistingTickets, setEventExistingTickets] = useState([]);

  // Modal de paiement TWINT & Stripe
  const [isTwintModalOpen, setIsTwintModalOpen] = useState(false);
  const [pendingTwintData, setPendingTwintData] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);

  // Charger les événements et leurs formules de billets (table ticket_categories)
  const loadPublicEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const [eventsData, allCategories] = await Promise.all([
        listEvents(),
        listCategories(),
      ]);
      setEvents(eventsData || []);

      const catMap = {};
      (allCategories || []).forEach((cat) => {
        if (!catMap[cat.event_id]) catMap[cat.event_id] = [];
        catMap[cat.event_id].push(cat);
      });
      Object.keys(catMap).forEach((eid) => {
        catMap[eid].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      });
      setCategoriesByEvent(catMap);
    } catch (err) {
      console.warn("Erreur chargement billetterie publique:", err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadPublicEvents();
  }, [loadPublicEvents]);

  // Synchronisation profonde avec l'URL (Deep linking)
  useEffect(() => {
    const handleUrlState = async () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const params = url.searchParams;

      // 1. Retour de paiement Stripe / TWINT (?payment=success&id=...)
      const paymentParam = params.get("payment");
      const ticketIdParam = params.get("id");
      if (paymentParam === "success" && ticketIdParam) {
        try {
          const updated = await markTicketPaid(ticketIdParam, { method: "twint" });
          if (updated) {
            setViewingTicket(updated);
            setPaymentNotice("Paiement TWINT / Stripe validé avec succès ! Votre pass officiel est actif.");
          }
        } catch (err) {
          console.warn("Erreur validation retour paiement :", err);
        }
      } else if (paymentParam === "cancelled") {
        setPaymentNotice("Le paiement a été interrompu. Vous pouvez réessayer quand vous le souhaitez.");
      }

      // 2. Pass demandé par token ou code (?pass=... ou ?token=... ou ?id=...)
      const passParam = params.get("pass") || params.get("token") || params.get("id");
      if (passParam && paymentParam !== "success") {
        try {
          const t = await getTicketByHashOrId(passParam);
          if (t) {
            setViewingTicket(t);
          }
        } catch (err) {
          console.warn("Erreur chargement pass URL:", err);
        }
      } else if (!passParam && paymentParam !== "success") {
        setViewingTicket(null);
      }

      // 3. Événement à réserver directement (?book=eventId)
      const bookParam = params.get("book");
      if (bookParam && events.length > 0) {
        const found = events.find((e) => e.id === bookParam);
        if (found && found.is_public !== false) {
          setBookingEvent(found);
          const evCats = categoriesByEvent[found.id] || [];
          const defaultCat = evCats[0];
          setSelectedCategoryId(defaultCat ? defaultCat.id : "");
          setSelectedCategory(defaultCat ? defaultCat.name : "Standard");
          setIsBookingOpen(true);
        }
      }

      // 4. Scanner demandé (?scanner=1 ou #scanner)
      if (params.get("scanner") === "1" || window.location.hash.includes("scanner")) {
        setIsScannerOpen(true);
      }
    };

    handleUrlState();
    window.addEventListener("popstate", handleUrlState);
    return () => window.removeEventListener("popstate", handleUrlState);
  }, [events, categoriesByEvent]);

  // Ouvrir la réservation d'un événement avec mise à jour d'URL
  const handleOpenBooking = async (evt) => {
    setBookingEvent(evt);
    const evCats = categoriesByEvent[evt.id] || [];
    const defaultCat = evCats[0];
    setSelectedCategoryId(defaultCat ? defaultCat.id : "");
    setSelectedCategory(defaultCat ? defaultCat.name : "Standard");
    setIsBookingOpen(true);
    setShowSeatPicker(false);

    try {
      const existing = await listTickets(evt.id);
      setEventExistingTickets(existing || []);

      if (evt.seating_type === "numbered") {
        const taken = new Set((existing || []).map((t) => `${t.row_number}_${t.seat_number}`));
        let found = null;
        for (const row of ["Rang A", "Rang B", "Rang C", "Rang D"]) {
          for (let s = 1; s <= 12; s++) {
            const sn = `Siège ${String(s).padStart(2, "0")}`;
            if (!taken.has(`${row}_${sn}`)) {
              found = {
                zoneSection: row.includes("A") || row.includes("B") ? "Loge Balcon VIP" : "Orchestre Parterre",
                rowNumber: row,
                seatNumber: sn,
              };
              break;
            }
          }
          if (found) break;
        }
        setSelectedSeat(found || { zoneSection: "Orchestre Parterre", rowNumber: "Rang C", seatNumber: "Siège 01" });
      } else {
        setSelectedSeat(null);
      }
    } catch {
      setSelectedSeat(null);
    }

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("book", evt.id);
    window.history.pushState(null, "", newUrl.toString());
  };

  // Fermer la réservation et nettoyer l'URL
  const handleCloseBooking = () => {
    setIsBookingOpen(false);
    setBookingEvent(null);
    setSelectedCategoryId("");
    setSelectedCategory("Standard");
    setSelectedSeat(null);
    setShowSeatPicker(false);
    setAttendeeName("");
    setAttendeeEmail("");

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("book");
    window.history.pushState(null, "", newUrl.toString());
  };

  // Fermer la vue du billet et nettoyer l'URL
  const handleClosePassView = () => {
    setViewingTicket(null);
    setPaymentNotice(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("pass");
    newUrl.searchParams.delete("token");
    newUrl.searchParams.delete("id");
    newUrl.searchParams.delete("payment");
    window.history.pushState(null, "", newUrl.toString());
  };

  // Validation du formulaire de réservation
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim() || !bookingEvent) return;

    setBookingLoading(true);
    try {
      const currentCats = categoriesByEvent[bookingEvent.id] || [];
      const chosenCat = currentCats.find((c) => c.id === selectedCategoryId);
      const isPaid = chosenCat && Number(chosenCat.price) > 0;

      const ticket = await issueTicket({
        eventId: bookingEvent.id,
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.trim(),
        categoryId: selectedCategoryId || null,
        ticketCategory: chosenCat ? chosenCat.name : selectedCategory || "Standard",
        paymentStatus: isPaid ? "unpaid" : "free",
        amountPaid: isPaid ? chosenCat.price : 0,
        seatNumber: selectedSeat?.seatNumber || null,
        rowNumber: selectedSeat?.rowNumber || null,
        zoneSection: selectedSeat?.zoneSection || null,
      });

      handleCloseBooking();
      const ticketWithEvent = { ...ticket, event: bookingEvent, category: chosenCat };

      if (isPaid) {
        // Formule payante : Déclencher Stripe Checkout (avec TWINT) ou Modal TWINT
        const sessionRes = await createCheckoutSession({
          ticket,
          event: bookingEvent,
          category: chosenCat,
          returnUrl: window.location.origin + "/tickets",
        });

        if (sessionRes?.url) {
          window.location.href = sessionRes.url;
          return;
        }

        // Mode interactif TWINT
        setPendingTwintData({ ticket: ticketWithEvent, event: bookingEvent, category: chosenCat });
        setIsTwintModalOpen(true);
        return;
      }

      // Formule gratuite : affichage immédiat
      setViewingTicket(ticketWithEvent);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("pass", ticket.ticket_code);
      window.history.pushState(null, "", newUrl.toString());
    } catch (err) {
      alert("Erreur lors de la réservation : " + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Succès de la confirmation TWINT
  const handleTwintPaymentSuccess = async (tkt) => {
    const updated = await markTicketPaid(tkt.id, {
      amount: tkt.amount_paid || tkt.category?.price,
      method: "twint",
    });
    setIsTwintModalOpen(false);
    const finalTicket = { ...tkt, ...updated, status: "valid", payment_status: "paid" };
    setViewingTicket(finalTicket);
    setPaymentNotice("Paiement TWINT validé avec succès ! Votre pass d'accès est activé.");

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("pass", finalTicket.ticket_code);
    window.history.pushState(null, "", newUrl.toString());
  };

  // Filtrer les événements
  const visibleEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSearch =
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [events, searchQuery]);

  // Si l'utilisateur consulte un billet spécifique (?pass=...)
  if (viewingTicket) {
    return (
      <div className="tickets-page-container">
        {paymentNotice && (
          <div className="tkt-payment-banner-success no-print">
            <span>✓ {paymentNotice}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setPaymentNotice(null)}
            >
              ✕
            </button>
          </div>
        )}

        <header className="tickets-header">
          <div className="tickets-header-left">
            <div className="tickets-tag-row">
              <span className="tickets-kicker">PASS ÉVÉNEMENT // CONTRÔLE D'ACCÈS</span>
              <span className="tickets-live-badge">BILLET OFFICIEL</span>
            </div>
            <h1 className="tickets-title">Votre Billet d'Accès</h1>
          </div>
          <div className="tickets-header-actions no-print">
            <button
              type="button"
              className="tickets-action-btn btn-secondary-plain"
              onClick={handleClosePassView}
            >
              <IconArrowLeft size={16} stroke={1.8} /> Voir tous les événements
            </button>
          </div>
        </header>

        <TicketDetailView
          ticket={viewingTicket}
          onBack={handleClosePassView}
        />
      </div>
    );
  }

  return (
    <div className="tickets-page-container">
      {/* 1. En-tête Swiss Modernist de la Billetterie Publique */}
      <header className="tickets-header">
        <div className="tickets-header-left">
          <div className="tickets-tag-row">
            <span className="tickets-kicker">SUISSE // BILLETTERIE PUBLIQUE</span>
            <span className="tickets-live-badge">RÉSERVATIONS EN DIRECT</span>
          </div>
          <h1 className="tickets-title">Événements &amp; Billetterie</h1>
          <p className="tickets-subtitle">
            Découvrez nos conférences, workshops et rencontres exclusives. Réservez votre place instantanément et recevez votre pass sécurisé avec QR code.
          </p>
        </div>

        <div className="tickets-header-actions no-print">
          <button
            type="button"
            className="tickets-action-btn btn-scanner-cta"
            onClick={() => setIsScannerOpen(true)}
            title="Vérifier la validité d'un pass avec la caméra"
          >
            <IconCamera size={16} stroke={1.8} /> Scanner un pass
          </button>

          {/* Lien direct et séparé vers le Panel Admin / Organisateur */}
          <a
            href="/admin/tickets"
            className="tickets-action-btn btn-login-cta"
            title="Accéder au panneau d'administration de la billetterie (/admin/tickets)"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, "", "/admin/tickets");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            <IconShieldLock size={16} stroke={1.8} /> Espace Organisateur (Admin) →
          </a>

          {onNavigateHome && (
            <button
              type="button"
              className="tickets-action-btn btn-secondary-plain"
              onClick={onNavigateHome}
            >
              ← Portfolio
            </button>
          )}
        </div>
      </header>

      {/* 2. Barre de recherche si plusieurs événements */}
      {events.length > 2 && (
        <div className="tickets-search-bar-wrap no-print">
          <IconSearch size={16} stroke={1.8} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par titre, ville, mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tkt-search-input"
          />
        </div>
      )}

      {/* 3. Grille des événements publics */}
      <section className="tickets-public-section">
        {loadingEvents ? (
          <div className="drive-loading-state">
            <p>Chargement des événements...</p>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="tkt-empty-card">
            <IconCalendarEvent size={48} stroke={1.2} />
            <h3>Aucun événement trouvé</h3>
            <p>Aucune session publique ne correspond à vos critères de recherche.</p>
          </div>
        ) : (
          <div className="tkt-cards-grid">
            {visibleEvents.map((evt) => {
              const evtDate = new Date(evt.event_date);
              const isPast = evtDate < new Date();
              const isOpenPublic = evt.is_public !== false;
              const googleMapsUrl = evt.location
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evt.location)}`
                : null;

              return (
                <div key={evt.id} className={`tkt-event-card ${!isOpenPublic ? "is-private" : ""}`}>
                  {/* Bandeau d'en-tête de carte */}
                  <div className="tkt-card-banner">
                    <div className="tkt-card-badge-row">
                      {isOpenPublic ? (
                        <span className="tkt-status-badge is-open">
                          Inscriptions Ouvertes
                        </span>
                      ) : (
                        <span className="tkt-status-badge is-locked">
                          <IconLock size={11} stroke={2} /> Sur Invitation
                        </span>
                      )}

                      <span className="tkt-seating-pill">
                        {SEATING_TYPE_LABELS[evt.seating_type] || "Placement Libre"}
                      </span>

                      <span className="tkt-price-pill">
                        {evt.price > 0 ? `${evt.price} ${evt.currency || "CHF"}` : "Entrée Libre"}
                      </span>
                    </div>
                  </div>

                  {/* Corps de carte */}
                  <div className="tkt-card-body">
                    <div className="tkt-meta-line">
                      <span className="tkt-meta-item">
                        <IconCalendarEvent size={13} stroke={1.8} />
                        {evtDate.toLocaleDateString("fr-CH", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" • "}
                        {evtDate.toLocaleTimeString("fr-CH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {googleMapsUrl ? (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tkt-meta-item tkt-map-link"
                          title="Ouvrir l'adresse dans Google Maps"
                        >
                          <IconMapPin size={13} stroke={1.8} />
                          {evt.location}
                          <IconExternalLink size={10} stroke={1.8} />
                        </a>
                      ) : (
                        <span className="tkt-meta-item">
                          <IconMapPin size={13} stroke={1.8} />
                          {evt.location}
                        </span>
                      )}
                    </div>

                    {evt.venue_hall && (
                      <div className="tkt-card-venue-hall">
                        🏛 <strong>{evt.venue_hall}</strong>
                      </div>
                    )}

                    <h3 className="tkt-event-title">{evt.title}</h3>
                    {evt.description && <p className="tkt-event-desc">{evt.description}</p>}

                    {evt.access_conditions && (
                      <div className="tkt-card-conditions">
                        <span>ℹ {evt.access_conditions}</span>
                      </div>
                    )}

                    <div className="tkt-category-tags">
                      {(categoriesByEvent[evt.id] || []).length > 0 ? (
                        categoriesByEvent[evt.id].map((cat) => (
                          <span key={cat.id} className="tkt-cat-tag">
                            <span
                              className="cat-dot-small"
                              style={{ backgroundColor: cat.color || "#245b46" }}
                            />
                            {cat.name}
                            <span className="tkt-cat-price">
                              {cat.price > 0 ? `${cat.price} ${cat.currency || "CHF"}` : "Gratuit"}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="tkt-cat-tag">Pass Standard (Gratuit)</span>
                      )}
                    </div>

                    <div className="tkt-card-footer">
                      <div className="tkt-capacity-info">
                        <div className="tkt-cap-numbers">
                          <span>Places limitées</span>
                          <strong>{evt.capacity} max</strong>
                        </div>
                      </div>

                      {isOpenPublic ? (
                        <button
                          type="button"
                          className="tkt-book-btn"
                          onClick={() => handleOpenBooking(evt)}
                          disabled={isPast}
                        >
                          {isPast ? "Événement passé" : "Obtenir mon billet →"}
                        </button>
                      ) : (
                        <div className="tkt-private-badge">
                          <span>Inscriptions privées (Sur invitation)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1 : SCANNER CAMÉRA RAPIDE */}
      <TicketScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* MODAL 2 : FORMULAIRE DE RÉSERVATION FLOTTANT */}
      {isBookingOpen && bookingEvent && (
        <div className="tkt-modal-backdrop" onClick={handleCloseBooking}>
          <div className="tkt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tkt-modal-header">
              <div className="tkt-modal-header-text">
                <span className="tkt-modal-kicker">RÉSERVATION EN LIGNE</span>
                <h3>Obtenir mon billet</h3>
              </div>
              <button
                type="button"
                className="tkt-modal-close"
                onClick={handleCloseBooking}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="tkt-modal-body">
              <div className="tkt-booking-summary-box">
                <strong className="tkt-summary-title">{bookingEvent.title}</strong>
                <span className="tkt-summary-date">
                  <IconCalendarEvent size={13} stroke={1.8} />
                  {new Date(bookingEvent.event_date).toLocaleDateString("fr-CH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  à{" "}
                  {new Date(bookingEvent.event_date).toLocaleTimeString("fr-CH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="tkt-summary-loc">
                  <IconMapPin size={13} stroke={1.8} /> {bookingEvent.location}
                  {bookingEvent.venue_hall && ` • ${bookingEvent.venue_hall}`}
                </span>
                <span className="tkt-summary-seating">
                  🪑 {SEATING_TYPE_LABELS[bookingEvent.seating_type] || "Placement libre"}
                </span>
                {bookingEvent.access_conditions && (
                  <span className="tkt-summary-conds">
                    ℹ Conditions : {bookingEvent.access_conditions}
                  </span>
                )}
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Votre Nom &amp; Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alexandre Dubois"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="tkt-form-input"
                  autoFocus
                />
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Votre Adresse Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alexandre@example.com"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="tkt-form-input"
                />
              </div>

              {/* Choix des formules / catégories de billets (table ticket_categories) */}
              <div className="tkt-form-group">
                <label className="tkt-form-label">Choix de la Formule d'Accès</label>
                {(categoriesByEvent[bookingEvent.id] || []).length > 0 ? (
                  <div className="tkt-category-radio-group">
                    {(categoriesByEvent[bookingEvent.id] || []).map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <label
                          key={cat.id}
                          className={`tkt-category-radio-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSelectedCategory(cat.name);
                          }}
                        >
                          <input
                            type="radio"
                            name="booking_category"
                            value={cat.id}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedCategoryId(cat.id);
                              setSelectedCategory(cat.name);
                            }}
                            className="visually-hidden"
                          />
                          <div className="cat-radio-top">
                            <div className="cat-radio-name-wrap">
                              <span
                                className="cat-dot-small"
                                style={{ backgroundColor: cat.color || "#245b46" }}
                              />
                              <strong className="cat-radio-name">{cat.name}</strong>
                            </div>
                            <span className="cat-radio-price">
                              {cat.price > 0 ? `${cat.price} ${cat.currency || "CHF"}` : "Gratuit"}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="cat-radio-desc">{cat.description}</p>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="tkt-form-select"
                  >
                    <option value="Standard">Pass Standard (Gratuit)</option>
                  </select>
                )}
              </div>

              {/* Choix visuel du siège si l'événement a des places assises numérotées */}
              {bookingEvent.seating_type === "numbered" && (
                <div className="tkt-form-group tkt-seat-choice-section">
                  <div className="seat-choice-bar">
                    <div className="seat-choice-title">
                      <IconArmchair size={15} stroke={2} />
                      <label className="tkt-form-label" style={{ margin: 0 }}>
                        Choix de votre Siège (Plan de salle)
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn-toggle-seat-map"
                      onClick={() => setShowSeatPicker((prev) => !prev)}
                    >
                      {showSeatPicker ? "Réduire le plan ▲" : "Visualiser & Choisir sur le plan ▼"}
                    </button>
                  </div>

                  {selectedSeat && (
                    <div className="chosen-seat-pill-display">
                      <span className="seat-pill-zone">{selectedSeat.zoneSection}</span>
                      <span className="seat-pill-separator">•</span>
                      <strong className="seat-pill-spot">
                        {selectedSeat.rowNumber} · {selectedSeat.seatNumber}
                      </strong>
                      <span className="seat-pill-check">✓ Siège réservé pour vous</span>
                    </div>
                  )}

                  {showSeatPicker && (
                    <SeatPicker
                      existingTickets={eventExistingTickets}
                      selectedSeat={selectedSeat}
                      onSelectSeat={(seat) => setSelectedSeat(seat)}
                      categoryName={selectedCategory}
                      venueHall={bookingEvent.venue_hall || "Auditorium Principal"}
                    />
                  )}
                </div>
              )}

              {(() => {
                const currentCats = bookingEvent ? categoriesByEvent[bookingEvent.id] || [] : [];
                const currentSelectedCat = currentCats.find((c) => c.id === selectedCategoryId);
                const isPaid = currentSelectedCat && Number(currentSelectedCat.price) > 0;

                return (
                  <div className="tkt-modal-actions">
                    <button
                      type="button"
                      className="drive-btn drive-btn-secondary"
                      onClick={handleCloseBooking}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className={`drive-btn ${isPaid ? "btn-twint-submit" : "drive-btn-primary"}`}
                      disabled={bookingLoading || !attendeeName.trim() || !attendeeEmail.trim()}
                    >
                      {bookingLoading ? (
                        "Traitement en cours..."
                      ) : isPaid ? (
                        <>
                          <span className="twint-logo-badge-tiny">TWINT</span> Payer {currentSelectedCat.price} CHF &amp; Réserver
                        </>
                      ) : (
                        "Confirmer & Générer mon Pass QR"
                      )}
                    </button>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : PAIEMENT TWINT & STRIPE */}
      {pendingTwintData && (
        <TwintPaymentModal
          isOpen={isTwintModalOpen}
          ticket={pendingTwintData.ticket}
          event={pendingTwintData.event}
          category={pendingTwintData.category}
          onClose={() => setIsTwintModalOpen(false)}
          onPaymentSuccess={handleTwintPaymentSuccess}
        />
      )}
    </div>
  );
}

export default TicketsPage;
