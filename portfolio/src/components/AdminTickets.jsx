import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconTicket,
  IconPlus,
  IconCamera,
  IconCalendarEvent,
  IconUsers,
  IconDownload,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconCircleCheck,
  IconSearch,
  IconEye,
  IconExternalLink,
  IconUserPlus,
  IconLock,
  IconLockOpen,
  IconTags,
  IconEdit,
  IconCoin,
} from "@tabler/icons-react";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTickets,
  issueTicket,
  updateTicketStatus,
  deleteTicket,
  markTicketPaid,
  exportTicketsToCsv,
} from "../lib/ticketsApi";
import { TicketDetailView } from "./TicketDetailView";
import { TicketScannerModal } from "./TicketScannerModal";

export function AdminTickets() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Vue du pass sélectionné
  const [viewingTicket, setViewingTicket] = useState(null);

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Modals
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isIssueTicketOpen, setIsIssueTicketOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Formulaire Nouvel Événement
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("Genève, Suisse");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventCapacity, setNewEventCapacity] = useState(150);
  const [newEventIsPublic, setNewEventIsPublic] = useState(true);
  const [newEventType, setNewEventType] = useState("conference");
  const [newEventSeating, setNewEventSeating] = useState("numbered");
  const [newEventHall, setNewEventHall] = useState("");
  const [newEventConditions, setNewEventConditions] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Formulaire Catégorie (Table dédiée ticket_categories)
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catPrice, setCatPrice] = useState(0);
  const [catQuota, setCatQuota] = useState("");
  const [catColor, setCatColor] = useState("#245b46");
  const [savingCategory, setSavingCategory] = useState(false);

  // Formulaire Émission Billet
  const [issueName, setIssueName] = useState("");
  const [issueEmail, setIssueEmail] = useState("");
  const [issueCategoryId, setIssueCategoryId] = useState("");
  const [issueZone, setIssueZone] = useState("");
  const [issueRow, setIssueRow] = useState("");
  const [issueSeat, setIssueSeat] = useState("");
  const [issuingTicket, setIssuingTicket] = useState(false);

  // Filtre et recherche
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");

  // Charger les événements
  const loadEventsData = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const data = await listEvents();
      setEvents(data);

      const urlParams = new URLSearchParams(window.location.search);
      const urlEventId = urlParams.get("event");

      if (urlEventId && data.some((e) => e.id === urlEventId)) {
        setSelectedEventId(urlEventId);
      } else if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.warn("Erreur chargement événements admin:", err);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  // Charger les catégories de l'événement actif
  const loadCategoriesData = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      setLoadingCategories(true);
      const data = await listCategories(eventId);
      setCategories(data);
      if (data.length > 0 && !issueCategoryId) {
        setIssueCategoryId(data[0].id);
      }
    } catch (err) {
      console.warn("Erreur chargement catégories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, [issueCategoryId]);

  // Charger les billets de l'événement actif
  const loadTicketsData = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      setLoadingTickets(true);
      const data = await listTickets(eventId);
      setTickets(data);
    } catch (err) {
      console.warn("Erreur chargement billets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  useEffect(() => {
    if (selectedEventId) {
      loadCategoriesData(selectedEventId);
      loadTicketsData(selectedEventId);
    }
  }, [selectedEventId, loadCategoriesData, loadTicketsData]);

  useEffect(() => {
    if (window.location.hash.includes("scanner")) {
      setIsScannerOpen(true);
    }
  }, []);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  // Métriques
  const eventTickets = tickets.filter((t) => t.event_id === currentEvent?.id);
  const totalIssued = eventTickets.length;
  const usedCount = eventTickets.filter((t) => t.status === "used").length;
  const capacity = currentEvent?.capacity || 100;
  const fillRate = Math.min(100, (totalIssued / capacity) * 100);
  const attendanceRate = totalIssued > 0 ? (usedCount / totalIssued) * 100 : 0;

  // Changer d'événement actif
  const handleSelectEvent = (eventId) => {
    setSelectedEventId(eventId);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("event", eventId);
    window.history.replaceState(null, "", newUrl.toString());
  };

  // Création d'événement
  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setCreatingEvent(true);
    try {
      const created = await createEvent({
        title: newEventTitle.trim(),
        description: newEventDesc.trim(),
        location: newEventLocation.trim(),
        event_date: newEventDate
          ? new Date(newEventDate).toISOString()
          : new Date(Date.now() + 14 * 86400000).toISOString(),
        capacity: parseInt(newEventCapacity, 10) || 100,
        price: 0,
        currency: "CHF",
        categories: [
          { name: "Pass Standard", price: 0, description: "Accès général aux conférences" },
          { name: "VIP Prestige", price: 75, description: "Accès prioritaire, lounge et cocktail exclusif" },
        ],
        is_public: Boolean(newEventIsPublic),
        event_type: newEventType,
        seating_type: newEventSeating,
        venue_hall: newEventHall.trim(),
        access_conditions: newEventConditions.trim(),
      });

      await loadEventsData();
      handleSelectEvent(created.id);
      setIsCreateEventOpen(false);

      setNewEventTitle("");
      setNewEventDesc("");
      setNewEventDate("");
      setNewEventHall("");
      setNewEventConditions("");
      setNewEventIsPublic(true);
    } catch (err) {
      alert("Erreur création billetterie: " + err.message);
    } finally {
      setCreatingEvent(false);
    }
  };

  // Basculer l'ouverture au public
  const handleTogglePublicStatus = async (evt) => {
    const newStatus = !evt.is_public;
    try {
      await updateEvent(evt.id, { is_public: newStatus });
      setEvents((prev) =>
        prev.map((e) => (e.id === evt.id ? { ...e, is_public: newStatus } : e))
      );
    } catch (err) {
      alert("Erreur mise à jour : " + err.message);
    }
  };

  // Suppression d'événement
  const handleDeleteEvent = async (evt) => {
    if (!window.confirm(`Supprimer définitivement la billetterie « ${evt.title} » et toutes ses catégories et billets ?`)) {
      return;
    }
    try {
      await deleteEvent(evt.id);
      const remaining = events.filter((e) => e.id !== evt.id);
      setEvents(remaining);
      if (selectedEventId === evt.id) {
        handleSelectEvent(remaining[0]?.id || null);
      }
    } catch (err) {
      alert("Erreur suppression: " + err.message);
    }
  };

  // Ouvrir modal ajout / édition de catégorie
  const handleOpenCategoryModal = (catToEdit = null) => {
    if (catToEdit) {
      setEditingCategory(catToEdit);
      setCatName(catToEdit.name);
      setCatDesc(catToEdit.description || "");
      setCatPrice(catToEdit.price || 0);
      setCatQuota(catToEdit.quota || "");
      setCatColor(catToEdit.color || "#245b46");
    } else {
      setEditingCategory(null);
      setCatName("");
      setCatDesc("");
      setCatPrice(0);
      setCatQuota("");
      setCatColor("#245b46");
    }
    setIsCategoryModalOpen(true);
  };

  // Enregistrer une catégorie (table dédiée ticket_categories)
  const handleSaveCategorySubmit = async (e) => {
    e.preventDefault();
    if (!catName.trim() || !currentEvent) return;

    setSavingCategory(true);
    try {
      const payload = {
        name: catName.trim(),
        description: catDesc.trim(),
        price: parseFloat(catPrice) || 0,
        quota: catQuota ? parseInt(catQuota, 10) : null,
        color: catColor,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(currentEvent.id, {
          ...payload,
          display_order: categories.length + 1,
        });
      }

      await loadCategoriesData(currentEvent.id);
      setIsCategoryModalOpen(false);
    } catch (err) {
      alert("Erreur sauvegarde catégorie : " + err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  // Supprimer une catégorie
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Supprimer la formule « ${cat.name} » ?`)) return;
    try {
      await deleteCategory(cat.id);
      await loadCategoriesData(currentEvent.id);
    } catch (err) {
      alert("Erreur suppression formule : " + err.message);
    }
  };

  // Émission manuelle d'un billet relié à une catégorie
  const handleIssueTicketSubmit = async (e) => {
    e.preventDefault();
    if (!issueName.trim() || !issueEmail.trim() || !currentEvent) return;

    setIssuingTicket(true);
    try {
      const selectedCat = categories.find((c) => c.id === issueCategoryId);
      const ticket = await issueTicket({
        eventId: currentEvent.id,
        attendeeName: issueName.trim(),
        attendeeEmail: issueEmail.trim(),
        categoryId: issueCategoryId || null,
        ticketCategory: selectedCat ? selectedCat.name : "Standard",
        zoneSection: issueZone.trim() || null,
        rowNumber: issueRow.trim() || null,
        seatNumber: issueSeat.trim() || null,
      });

      await loadTicketsData(currentEvent.id);
      setIsIssueTicketOpen(false);
      setIssueName("");
      setIssueEmail("");
      setIssueZone("");
      setIssueRow("");
      setIssueSeat("");

      setViewingTicket({ ...ticket, event: currentEvent, category: selectedCat });
    } catch (err) {
      alert("Erreur émission billet: " + err.message);
    } finally {
      setIssuingTicket(false);
    }
  };

  // Composter ou réactiver un billet
  const handleToggleTicketStatus = async (ticket) => {
    const newStatus = ticket.status === "valid" ? "used" : "valid";
    await updateTicketStatus(ticket.id, newStatus);
    loadTicketsData(currentEvent.id);
  };

  // Valider manuellement le paiement (ex: cash sur place ou TWINT direct)
  const handleMarkPaidManual = async (ticket) => {
    if (!window.confirm(`Valider manuellement le paiement de ${ticket.attendee_name} ?`)) return;
    try {
      await markTicketPaid(ticket.id, {
        amount: ticket.amount_paid || ticket.category?.price,
        method: "manual_admin",
      });
      loadTicketsData(currentEvent.id);
    } catch (err) {
      alert("Erreur validation paiement : " + err.message);
    }
  };

  // Suppression d'un billet
  const handleDeleteTicket = async (ticketId, attendeeName) => {
    if (!window.confirm(`Supprimer le billet de ${attendeeName} ?`)) return;
    await deleteTicket(ticketId);
    loadTicketsData(currentEvent.id);
  };

  // Filtrage des billets
  const filteredTickets = eventTickets.filter((t) => {
    const matchesSearch =
      t.attendee_name.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
      t.attendee_email.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
      t.ticket_code.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
      (t.ticket_category || "").toLowerCase().includes(ticketSearchQuery.toLowerCase());

    const matchesStatus =
      ticketStatusFilter === "all" || t.status === ticketStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-tickets-container">
      {/* 1. Barre d'en-tête de la gestion des billetteries */}
      <div className="admin-tkt-header">
        <div className="admin-tkt-title-group">
          <span className="tickets-kicker">ESPACE ORGANISATEUR &amp; CONTRÔLE D'ACCÈS</span>
          <h2 className="admin-tkt-heading">Gestion des Billetteries</h2>
          <p className="admin-tkt-desc">
            Créez vos événements, gérez vos formules tarifaires dans la table dédiée, configurez l'accès public et scannez les billets en direct.
          </p>
        </div>

        <div className="admin-tkt-header-actions">
          <button
            type="button"
            className="tickets-action-btn btn-scanner-cta"
            onClick={() => setIsScannerOpen(true)}
            title="Lancer le scanner caméra pour contrôler les entrées"
          >
            <IconCamera size={16} stroke={1.8} /> Scanner Caméra
          </button>

          <button
            type="button"
            className="tickets-action-btn btn-create-cta"
            onClick={() => setIsCreateEventOpen(true)}
          >
            <IconPlus size={16} stroke={1.8} /> Créer une billetterie
          </button>

          <a
            href="/tickets"
            target="_blank"
            rel="noopener noreferrer"
            className="tickets-action-btn btn-secondary-plain"
            title="Voir la billetterie publique vue par les visiteurs (/tickets)"
          >
            Voir la page publique <IconExternalLink size={13} stroke={1.8} />
          </a>
        </div>
      </div>

      {/* 2. Barre de sélection de l'événement actif */}
      <div className="admin-event-control-bar">
        <div className="event-selector-box">
          <label htmlFor="select-event" className="control-label">
            ÉVÉNEMENT ACTIF
          </label>
          <select
            id="select-event"
            className="event-select-dropdown"
            value={selectedEventId || ""}
            onChange={(e) => handleSelectEvent(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({new Date(e.event_date).toLocaleDateString("fr-CH")})
              </option>
            ))}
          </select>
        </div>

        {currentEvent && (
          <div className="event-meta-actions">
            {/* Toggle ouverture au public direct */}
            <button
              type="button"
              className={`tkt-toggle-btn ${currentEvent.is_public !== false ? "is-public-on" : "is-public-off"}`}
              onClick={() => handleTogglePublicStatus(currentEvent)}
              title="Cliquez pour ouvrir ou fermer les inscriptions au public sur /tickets"
            >
              {currentEvent.is_public !== false ? (
                <>
                  <IconLockOpen size={14} stroke={2} /> Billetterie Ouverte au Public
                </>
              ) : (
                <>
                  <IconLock size={14} stroke={2} /> Billetterie Privée (Sur invitation)
                </>
              )}
            </button>

            <button
              type="button"
              className="drive-btn drive-btn-secondary"
              onClick={() => handleOpenCategoryModal()}
              title="Ajouter une formule ou modifier les tarifs"
            >
              <IconPlus size={14} stroke={1.8} /> Ajouter Formule
            </button>

            <button
              type="button"
              className="drive-btn drive-btn-primary"
              onClick={() => setIsIssueTicketOpen(true)}
              title="Émettre un billet manuellement pour un invité"
            >
              <IconUserPlus size={15} stroke={1.8} /> Émettre un billet
            </button>

            <button
              type="button"
              className="drive-btn drive-btn-secondary"
              onClick={() => exportTicketsToCsv(currentEvent, eventTickets)}
              disabled={eventTickets.length === 0}
              title="Exporter la liste des participants au format CSV"
            >
              <IconDownload size={15} stroke={1.8} /> Exporter CSV
            </button>

            <button
              type="button"
              className="drive-btn btn-danger"
              onClick={() => handleDeleteEvent(currentEvent)}
              title="Supprimer définitivement cet événement"
            >
              <IconTrash size={14} stroke={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* 3. Jauges et statistiques en direct */}
      {currentEvent && (
        <div className="tickets-stats-grid">
          <div className="stat-card">
            <span className="stat-label">BILLETS ÉMIS</span>
            <h3 className="stat-number">
              {totalIssued}
              <span className="stat-sub"> / {capacity} places</span>
            </h3>
            <div className="stat-meter-track">
              <div
                className="stat-meter-fill"
                style={{ width: `${fillRate}%`, backgroundColor: "#245b46" }}
              />
            </div>
            <span className="stat-meta">
              {fillRate.toFixed(1)}% réservé • {Math.max(0, capacity - totalIssued)} places disponibles
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">ENTRÉES VALIDÉES SUR PLACE</span>
            <h3 className="stat-number">
              {usedCount}
              <span className="stat-sub"> / {totalIssued} enregistrés</span>
            </h3>
            <div className="stat-meter-track">
              <div
                className="stat-meter-fill"
                style={{
                  width: `${attendanceRate}%`,
                  backgroundColor: attendanceRate > 50 ? "#059669" : "#d97706",
                }}
              />
            </div>
            <span className="stat-meta">
              {attendanceRate.toFixed(1)}% des participants déjà entrés
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">FORMULES DISPONIBLES</span>
            <div className="stat-public-status">
              <strong>{categories.length} formules configurées</strong>
              <p>
                {categories.map((c) => c.name).join(" • ") || "Aucune formule"}
              </p>
            </div>
            <button
              type="button"
              className="launch-scanner-btn"
              onClick={() => setIsScannerOpen(true)}
            >
              <IconCamera size={15} stroke={1.8} /> Contrôle d'accès caméra
            </button>
          </div>
        </div>
      )}

      {/* 4. SECTION DÉDIÉE : GESTION DES CATÉGORIES & FORMULES (TABLE TICKET_CATEGORIES) */}
      {currentEvent && (
        <div className="tkt-categories-panel">
          <div className="tkt-categories-panel-head">
            <div className="panel-title-group">
              <IconTags size={18} stroke={1.8} />
              <h4>Catégories de Billets &amp; Tarifs (Table Dédiée)</h4>
            </div>
            <button
              type="button"
              className="drive-btn drive-btn-secondary btn-mini"
              onClick={() => handleOpenCategoryModal()}
            >
              <IconPlus size={13} stroke={2} /> Nouvelle Formule
            </button>
          </div>

          {loadingCategories ? (
            <p className="cell-muted" style={{ padding: "12px 18px", margin: 0 }}>
              Chargement des formules...
            </p>
          ) : categories.length === 0 ? (
            <div className="tkt-empty-category-note">
              <span>Aucune formule configurée. Ajoutez votre première catégorie de billet.</span>
            </div>
          ) : (
            <div className="tkt-categories-cards-list">
              {categories.map((cat) => {
                const countSold = eventTickets.filter((t) => t.category_id === cat.id).length;
                return (
                  <div key={cat.id} className="tkt-category-item-card">
                    <div className="cat-card-header">
                      <div className="cat-badge-wrap">
                        <span
                          className="cat-color-dot"
                          style={{ backgroundColor: cat.color || "#245b46" }}
                        />
                        <strong className="cat-name">{cat.name}</strong>
                      </div>
                      <span className="cat-price-badge">
                        {cat.price > 0 ? `${cat.price} ${cat.currency || "CHF"}` : "Gratuit"}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="cat-description">{cat.description}</p>
                    )}

                    <div className="cat-card-footer">
                      <span className="cat-quota-text">
                        Quota : <strong>{cat.quota ? `${countSold} / ${cat.quota} émis` : `${countSold} émis (Illimité)`}</strong>
                      </span>
                      <div className="cat-actions-btns">
                        <button
                          type="button"
                          className="cat-action-icon-btn"
                          onClick={() => handleOpenCategoryModal(cat)}
                          title="Modifier la formule"
                        >
                          <IconEdit size={13} stroke={1.8} /> Modifier
                        </button>
                        <button
                          type="button"
                          className="cat-action-icon-btn is-danger"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Supprimer la formule"
                        >
                          <IconTrash size={13} stroke={1.8} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TABLE DE GESTION DES PARTICIPANTS */}
      <div className="tickets-table-container">
        <div className="tickets-table-toolbar">
          <div className="search-box">
            <IconSearch size={14} stroke={1.8} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, formule ou code..."
              value={ticketSearchQuery}
              onChange={(e) => setTicketSearchQuery(e.target.value)}
              className="tickets-search-input"
            />
          </div>

          <div className="status-filter-pills">
            <button
              type="button"
              className={`filter-pill ${ticketStatusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setTicketStatusFilter("all")}
            >
              Tous ({eventTickets.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${ticketStatusFilter === "valid" ? "is-active" : ""}`}
              onClick={() => setTicketStatusFilter("valid")}
            >
              Valides ({eventTickets.filter((t) => t.status === "valid").length})
            </button>
            <button
              type="button"
              className={`filter-pill ${ticketStatusFilter === "used" ? "is-active" : ""}`}
              onClick={() => setTicketStatusFilter("used")}
            >
              Compostés ({eventTickets.filter((t) => t.status === "used").length})
            </button>
          </div>
        </div>

        {loadingTickets ? (
          <div className="drive-loading-state">
            <p>Chargement des billets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="drive-empty-state">
            <IconTicket size={40} stroke={1.3} className="empty-folder-icon" />
            <h4>Aucun billet émis pour le moment</h4>
            <p>Émettez votre premier billet ou ouvrez la billetterie aux réservations publiques.</p>
            <button
              type="button"
              className="drive-btn drive-btn-primary"
              onClick={() => setIsIssueTicketOpen(true)}
              style={{ marginTop: 12 }}
            >
              <IconUserPlus size={15} stroke={1.8} /> Émettre un premier billet
            </button>
          </div>
        ) : (
          <div className="drive-items-table-wrapper">
            <table className="drive-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Formule (Catégorie)</th>
                  <th>Code Billet</th>
                  <th>Paiement</th>
                  <th>Accès</th>
                  <th>Composté le</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="drive-row">
                    <td>
                      <strong>{t.attendee_name}</strong>
                    </td>
                    <td className="cell-muted cell-mono">{t.attendee_email}</td>
                    <td>
                      <span className="ticket-cat-badge">
                        {t.category?.name || t.ticket_category}
                      </span>
                    </td>
                    <td className="cell-mono">
                      <code>{t.ticket_code}</code>
                      {(t.row_number || t.seat_number) && (
                        <div className="table-seat-pill">
                          🪑 {t.row_number || ""} · {t.seat_number || ""}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.payment_status === "paid" ? (
                        <span className="tkt-payment-status-badge is-paid">
                          ✓ Payé ({t.amount_paid > 0 ? `${t.amount_paid} CHF` : "TWINT/Stripe"})
                        </span>
                      ) : t.payment_status === "free" ? (
                        <span className="tkt-payment-status-badge is-free">
                          Gratuit
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="tkt-payment-status-badge is-unpaid btn-mark-paid"
                          onClick={() => handleMarkPaidManual(t)}
                          title="Cliquer pour valider manuellement le paiement de ce billet"
                        >
                          ⚠ Non réglé ({t.amount_paid || t.category?.price || 0} CHF) → Valider
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`ticket-status-pill status-${t.status}`}>
                        {t.status === "valid" ? (
                          <>
                            <IconCircleCheck size={12} stroke={2} /> Valide
                          </>
                        ) : t.status === "used" ? (
                          <>
                            <IconCheck size={12} stroke={2} /> Composté
                          </>
                        ) : t.status === "pending_payment" ? (
                          <>
                            <IconAlertTriangle size={12} stroke={2} /> Paiement Requis
                          </>
                        ) : (
                          <>
                            <IconAlertTriangle size={12} stroke={2} /> Annulé
                          </>
                        )}
                      </span>
                    </td>
                    <td className="cell-muted cell-mono">
                      {t.scanned_at
                        ? new Date(t.scanned_at).toLocaleDateString("fr-CH", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => setViewingTicket({ ...t, event: currentEvent })}
                        title="Afficher le pass et le code QR"
                      >
                        <IconEye size={13} stroke={1.8} /> Pass
                      </button>

                      <button
                        type="button"
                        className="drive-action-btn"
                        onClick={() => handleToggleTicketStatus(t)}
                        title={t.status === "valid" ? "Marquer comme composté" : "Réactiver le billet"}
                      >
                        {t.status === "valid" ? "Composter" : "Réactiver"}
                      </button>

                      <button
                        type="button"
                        className="drive-action-btn btn-delete"
                        onClick={() => handleDeleteTicket(t.id, t.attendee_name)}
                        title="Supprimer ce billet"
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

      {/* MODAL 1 : SCANNER QR CAMÉRA */}
      <TicketScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onTicketScanned={() => {
          if (currentEvent) {
            loadTicketsData(currentEvent.id);
          }
        }}
      />

      {/* MODAL 2 : APERÇU DU PASS DU BILLET */}
      {viewingTicket && (
        <div className="tkt-modal-backdrop" onClick={() => setViewingTicket(null)}>
          <div
            className="tkt-modal-card is-wide"
            style={{ maxWidth: 880 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tkt-modal-header">
              <div className="tkt-modal-header-text">
                <span className="tkt-modal-kicker">APERÇU PASS PARTICIPANT</span>
                <h3>{viewingTicket.attendee_name} · {viewingTicket.ticket_code}</h3>
              </div>
              <button
                type="button"
                className="tkt-modal-close"
                onClick={() => setViewingTicket(null)}
              >
                ✕
              </button>
            </div>
            <div className="tkt-modal-body" style={{ padding: "20px 24px" }}>
              <TicketDetailView
                ticket={viewingTicket}
                onBack={() => setViewingTicket(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 : CRÉER UNE NOUVELLE BILLETTERIE */}
      {isCreateEventOpen && (
        <div className="tkt-modal-backdrop" onClick={() => setIsCreateEventOpen(false)}>
          <div className="tkt-modal-card is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="tkt-modal-header">
              <div className="tkt-modal-header-text">
                <span className="tkt-modal-kicker">NOUVEL ÉVÉNEMENT</span>
                <h3>Créer une billetterie</h3>
              </div>
              <button
                type="button"
                className="tkt-modal-close"
                onClick={() => setIsCreateEventOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="tkt-modal-body">
              <div className="tkt-form-group">
                <label className="tkt-form-label">Titre de l'événement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conférence Tech & Design 2026"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="tkt-form-input"
                  autoFocus
                />
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Lieu & Adresse *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bâtiment des Forces Motrices, Genève"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  className="tkt-form-input"
                />
              </div>

              <div className="tkt-form-grid-2">
                <div className="tkt-form-group">
                  <label className="tkt-form-label">Date & Heure *</label>
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>

                <div className="tkt-form-group">
                  <label className="tkt-form-label">Capacité maximale (places)</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newEventCapacity}
                    onChange={(e) => setNewEventCapacity(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Description / Programme</label>
                <textarea
                  rows="3"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Détails de l'événement, conférenciers, horaires..."
                  className="tkt-form-textarea"
                />
              </div>

              {/* Typologie & Conditionnement de la salle */}
              <div className="tkt-form-grid-2">
                <div className="tkt-form-group">
                  <label className="tkt-form-label">Type d'Événement</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="tkt-form-select"
                  >
                    <option value="conference">Conférence &amp; Keynotes</option>
                    <option value="concert">Concert &amp; Live Music</option>
                    <option value="workshop">Atelier Pratique / Workshop</option>
                    <option value="theater">Théâtre &amp; Spectacle</option>
                    <option value="soiree">Soirée &amp; Networking</option>
                    <option value="expo">Salon &amp; Exposition</option>
                  </select>
                </div>

                <div className="tkt-form-group">
                  <label className="tkt-form-label">Conditionnement de la Salle / Placement</label>
                  <select
                    value={newEventSeating}
                    onChange={(e) => setNewEventSeating(e.target.value)}
                    className="tkt-form-select"
                  >
                    <option value="numbered">Places Assises Numérotées (Rangée &amp; Siège)</option>
                    <option value="open">Placement Libre / Debout (Fosse)</option>
                    <option value="hybrid">Mixte (Places Assises &amp; Fosse)</option>
                    <option value="workshop">Postes de travail dédiés (Workshop)</option>
                    <option value="online">Événement en ligne / Streaming</option>
                  </select>
                </div>
              </div>

              <div className="tkt-form-grid-2">
                <div className="tkt-form-group">
                  <label className="tkt-form-label">Nom de la Salle / Espace</label>
                  <input
                    type="text"
                    placeholder="Ex: Auditorium Principal, Salle B"
                    value={newEventHall}
                    onChange={(e) => setNewEventHall(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>

                <div className="tkt-form-group">
                  <label className="tkt-form-label">Conditions d'Accès &amp; Sécurité</label>
                  <input
                    type="text"
                    placeholder="Ex: Pièce d'identité obligatoire • 18+ • Tenue correcte"
                    value={newEventConditions}
                    onChange={(e) => setNewEventConditions(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>
              </div>

              {/* Option ouvrir au public */}
              <div className="tkt-toggle-box">
                <label className="tkt-toggle-label">
                  <input
                    type="checkbox"
                    checked={newEventIsPublic}
                    onChange={(e) => setNewEventIsPublic(e.target.checked)}
                    className="tkt-toggle-checkbox"
                  />
                  <div className="tkt-toggle-text">
                    <strong>Ouvrir la billetterie aux réservations publiques sur /tickets</strong>
                    <span>
                      {newEventIsPublic
                        ? "Activé : Les visiteurs peuvent réserver leur pass en direct en ligne."
                        : "Désactivé : Billetterie privée (seul l'organisateur connecté peut émettre des billets)."}
                    </span>
                  </div>
                </label>
              </div>

              <div className="tkt-modal-actions">
                <button
                  type="button"
                  className="drive-btn drive-btn-secondary"
                  onClick={() => setIsCreateEventOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="drive-btn drive-btn-primary"
                  disabled={creatingEvent || !newEventTitle.trim()}
                >
                  {creatingEvent ? "Création..." : "Créer la billetterie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4 : GESTION D'UNE CATÉGORIE / FORMULE (TABLE TICKET_CATEGORIES) */}
      {isCategoryModalOpen && (
        <div className="tkt-modal-backdrop" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="tkt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tkt-modal-header">
              <div className="tkt-modal-header-text">
                <span className="tkt-modal-kicker">FORMULE TARIFAIRE</span>
                <h3>{editingCategory ? "Modifier la formule" : "Nouvelle catégorie de billet"}</h3>
              </div>
              <button
                type="button"
                className="tkt-modal-close"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="tkt-modal-body">
              <div className="tkt-form-group">
                <label className="tkt-form-label">Nom de la formule *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: VIP Prestige, Pass Étudiant, Accréditation..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="tkt-form-input"
                  autoFocus
                />
              </div>

              <div className="tkt-form-grid-2">
                <div className="tkt-form-group">
                  <label className="tkt-form-label">Prix (CHF - 0 pour gratuit)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={catPrice}
                    onChange={(e) => setCatPrice(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>

                <div className="tkt-form-group">
                  <label className="tkt-form-label">Quota de places (optionnel)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Illimité"
                    value={catQuota}
                    onChange={(e) => setCatQuota(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Description & Privilèges inclus</label>
                <textarea
                  rows="2"
                  placeholder="Ex: Accès coupe-file, places au premier rang et cocktail."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="tkt-form-textarea"
                />
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Couleur de badge</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    style={{ width: 44, height: 36, padding: 2, border: "1px solid var(--line)", cursor: "pointer" }}
                  />
                  <span className="cell-muted" style={{ fontSize: 12 }}>{catColor}</span>
                </div>
              </div>

              <div className="tkt-modal-actions">
                <button
                  type="button"
                  className="drive-btn drive-btn-secondary"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="drive-btn drive-btn-primary"
                  disabled={savingCategory || !catName.trim()}
                >
                  {savingCategory ? "Enregistrement..." : editingCategory ? "Mettre à jour" : "Ajouter la formule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5 : ÉMETTRE UN BILLET MANUELLEMENT */}
      {isIssueTicketOpen && (
        <div className="tkt-modal-backdrop" onClick={() => setIsIssueTicketOpen(false)}>
          <div className="tkt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tkt-modal-header">
              <div className="tkt-modal-header-text">
                <span className="tkt-modal-kicker">ÉMISSION MANUELLE</span>
                <h3>Émettre un billet</h3>
              </div>
              <button
                type="button"
                className="tkt-modal-close"
                onClick={() => setIsIssueTicketOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueTicketSubmit} className="tkt-modal-body">
              <div className="tkt-event-context-note">
                Événement : <strong>{currentEvent?.title}</strong>
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Nom complet du participant *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sophie Martin"
                  value={issueName}
                  onChange={(e) => setIssueName(e.target.value)}
                  className="tkt-form-input"
                  autoFocus
                />
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Adresse email *</label>
                <input
                  type="email"
                  required
                  placeholder="sophie.martin@example.ch"
                  value={issueEmail}
                  onChange={(e) => setIssueEmail(e.target.value)}
                  className="tkt-form-input"
                />
              </div>

              <div className="tkt-form-group">
                <label className="tkt-form-label">Formule tarifaire (Catégorie)</label>
                <select
                  value={issueCategoryId}
                  onChange={(e) => setIssueCategoryId(e.target.value)}
                  className="tkt-form-select"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.price > 0 ? `${cat.price} ${cat.currency || "CHF"}` : "Gratuit"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attribution de placement optionnel */}
              <div className="tkt-form-grid-2">
                <div className="tkt-form-group">
                  <label className="tkt-form-label">Zone / Section (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Loge VIP, Parterre"
                    value={issueZone}
                    onChange={(e) => setIssueZone(e.target.value)}
                    className="tkt-form-input"
                  />
                </div>

                <div className="tkt-form-group">
                  <label className="tkt-form-label">Rangée &amp; Siège (optionnel)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Ex: Rang B"
                      value={issueRow}
                      onChange={(e) => setIssueRow(e.target.value)}
                      className="tkt-form-input"
                    />
                    <input
                      type="text"
                      placeholder="Ex: Siège 14"
                      value={issueSeat}
                      onChange={(e) => setIssueSeat(e.target.value)}
                      className="tkt-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="tkt-modal-actions">
                <button
                  type="button"
                  className="drive-btn drive-btn-secondary"
                  onClick={() => setIsIssueTicketOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="drive-btn drive-btn-primary"
                  disabled={issuingTicket || !issueName.trim() || !issueEmail.trim()}
                >
                  {issuingTicket ? "Génération du billet..." : "Émettre & Générer le Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTickets;
