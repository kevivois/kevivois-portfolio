import { supabase, isSupabaseConfigured } from "./supabase";
import QRCode from "qrcode";

const LOCAL_STORAGE_EVENTS_KEY = "kv_tickets_events_cache";
const LOCAL_STORAGE_CATEGORIES_KEY = "kv_tickets_categories_cache";
const LOCAL_STORAGE_TICKETS_KEY = "kv_tickets_list_cache";

export const EVENT_TYPE_LABELS = {
  conference: "Conférence & Keynotes",
  concert: "Concert & Performance Live",
  workshop: "Atelier Pratique / Workshop",
  theater: "Théâtre & Spectacle",
  soiree: "Soirée & Networking",
  expo: "Salon & Exposition",
};

export const SEATING_TYPE_LABELS = {
  numbered: "Places Assises Numérotées",
  open: "Placement Libre / Debout",
  hybrid: "Mixte (Places Assises & Fosse)",
  workshop: "Postes de travail dédiés",
  online: "Événement en ligne / Streaming",
};

// Données de secours par défaut si la base Supabase est vide ou non initialisée
const INITIAL_EVENTS = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    title: "Tech Summit & Swiss Creative Code 2026",
    description: "Conférence exclusive dédiée à l'architecture web moderne, l'IA agentique et l'art du design suisse. Keynotes, workshops et networking avec des leaders de l'industrie tech.",
    location: "Bâtiment des Forces Motrices, Genève",
    event_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    capacity: 180,
    price: 0,
    currency: "CHF",
    is_public: true,
    event_type: "conference",
    seating_type: "numbered",
    venue_hall: "Auditorium Principal (Théâtre)",
    access_conditions: "Pièce d'identité officielle obligatoire • Tenue soignée exigée • Accès PMR garanti",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    created_at: new Date().toISOString(),
  },
  {
    id: "a2000000-0000-0000-0000-000000000002",
    title: "Atelier IA & Automatisation Full-Stack",
    description: "Session pratique intensive pour concevoir et déployer des workflows agentiques autonomes en entreprise.",
    location: "Campus Biotech, Chemin des Mines 9, Genève",
    event_date: new Date(Date.now() + 28 * 86400000).toISOString(),
    capacity: 45,
    price: 60,
    currency: "CHF",
    is_public: true,
    event_type: "workshop",
    seating_type: "workshop",
    venue_hall: "Lab Innovation & Code",
    access_conditions: "Ordinateur portable personnel requis (Mac / Linux / Windows) • Chargeur et adaptateur",
    banner_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    created_at: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    event_id: "a1000000-0000-0000-0000-000000000001",
    name: "Pass Standard",
    description: "Accès à toutes les conférences, keynotes et à l'espace networking.",
    price: 0,
    currency: "CHF",
    quota: 120,
    color: "#245b46",
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    event_id: "a1000000-0000-0000-0000-000000000001",
    name: "VIP Prestige & Lounge",
    description: "Accès prioritaire coupe-file, espace lounge réservé, ateliers exclusifs et cocktail.",
    price: 85,
    currency: "CHF",
    quota: 40,
    color: "#d97706",
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "c1000000-0000-0000-0000-000000000003",
    event_id: "a1000000-0000-0000-0000-000000000001",
    name: "Accréditation Speaker & Presse",
    description: "Pass officiel réservé aux intervenants, journalistes et staff de production.",
    price: 0,
    currency: "CHF",
    quota: 20,
    color: "#4338ca",
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "c2000000-0000-0000-0000-000000000001",
    event_id: "a2000000-0000-0000-0000-000000000002",
    name: "Participant Atelier",
    description: "Accès complet aux exercices pratiques, repo de code et accompagnement 1-on-1.",
    price: 60,
    currency: "CHF",
    quota: 35,
    color: "#245b46",
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "c2000000-0000-0000-0000-000000000002",
    event_id: "a2000000-0000-0000-0000-000000000002",
    name: "Accréditation Entreprise",
    description: "Formule entreprise incluant débriefing personnalisé de vos architectures techniques.",
    price: 150,
    currency: "CHF",
    quota: 10,
    color: "#059669",
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_TICKETS = [
  {
    id: "b1000000-0000-0000-0000-000000000001",
    event_id: "a1000000-0000-0000-0000-000000000001",
    category_id: "c1000000-0000-0000-0000-000000000002",
    attendee_name: "Kevin Voisin",
    attendee_email: "kevin@pick.place",
    ticket_category: "VIP Prestige & Lounge",
    ticket_code: "KV-VIP-001",
    barcode_hash: "demo-hash-kevin-vip",
    status: "valid",
    payment_status: "paid",
    amount_paid: 85.0,
    stripe_session_id: "cs_demo_twint_kevin_001",
    zone_section: "Loge VIP",
    row_number: "Rang A",
    seat_number: "Siège 01",
    scanned_at: null,
    scanned_by: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000002",
    event_id: "a1000000-0000-0000-0000-000000000001",
    category_id: "c1000000-0000-0000-0000-000000000001",
    attendee_name: "Marc Schneider",
    attendee_email: "marc.schneider@example.ch",
    ticket_category: "Pass Standard",
    ticket_code: "KV-STD-042",
    barcode_hash: "demo-hash-marc-std",
    status: "used",
    payment_status: "free",
    amount_paid: 0.0,
    stripe_session_id: null,
    zone_section: "Parterre",
    row_number: "Rang F",
    seat_number: "Siège 18",
    scanned_at: new Date(Date.now() - 3600000).toISOString(),
    scanned_by: "Contrôle Porte A",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Utilitaires LocalStorage
function getLocalEvents() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EVENTS;
  }
}

function setLocalEvents(events) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn("Erreur sauvegarde locale events:", err);
  }
}

function getLocalCategories() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function setLocalCategories(cats) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(cats));
  } catch (err) {
    console.warn("Erreur sauvegarde locale categories:", err);
  }
}

function getLocalTickets() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(INITIAL_TICKETS));
      return INITIAL_TICKETS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TICKETS;
  }
}

function setLocalTickets(tickets) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.warn("Erreur sauvegarde locale tickets:", err);
  }
}

// Générateur de code court lisible (ex: KV-VIP-001)
export function generateShortTicketCode(prefix = "KV") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

export function generateSecureHash() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).substring(2, 8);
  }
  return "hash_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
}

// -----------------------------------------------------------------------------
// 1. GESTION DES ÉVÉNEMENTS (BILLETERIES)
// -----------------------------------------------------------------------------

export async function listEvents() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ticket_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (!error && data && data.length > 0) {
        setLocalEvents(data);
        return data;
      }
    } catch (err) {
      console.warn("Supabase ticket_events offline, utilisation cache local:", err);
    }
  }
  return getLocalEvents();
}

export async function getEvent(eventId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ticket_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!error && data) return data;
    } catch {
      // Fallback
    }
  }
  const events = getLocalEvents();
  return events.find((e) => e.id === eventId) || null;
}

export async function createEvent(eventData) {
  const newEvent = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "evt_" + Date.now(),
    title: eventData.title || "Nouvel Événement",
    description: eventData.description || "",
    location: eventData.location || "Genève, Suisse",
    event_date: eventData.event_date || new Date(Date.now() + 14 * 86400000).toISOString(),
    capacity: parseInt(eventData.capacity, 10) || 100,
    price: parseFloat(eventData.price) || 0,
    currency: eventData.currency || "CHF",
    is_public: eventData.is_public !== undefined ? eventData.is_public : true,
    banner_url: eventData.banner_url || "",
    event_type: eventData.event_type || "conference",
    seating_type: eventData.seating_type || "open",
    venue_hall: eventData.venue_hall || "",
    access_conditions: eventData.access_conditions || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let savedEvent = newEvent;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const insertPayload = { ...newEvent, user_id: session?.user?.id || null };
      const { data, error } = await supabase
        .from("ticket_events")
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        savedEvent = data;
      }
    } catch (err) {
      console.warn("Erreur Supabase createEvent, enregistrement local :", err);
    }
  }

  const events = getLocalEvents();
  setLocalEvents([savedEvent, ...events]);

  // Créer automatiquement les catégories par défaut si fournies
  const categoriesList = Array.isArray(eventData.categories) ? eventData.categories : ["Pass Standard", "VIP Pass"];
  for (let i = 0; i < categoriesList.length; i++) {
    const catName = categoriesList[i];
    await createCategory(savedEvent.id, {
      name: typeof catName === "string" ? catName : catName.name || "Standard",
      price: typeof catName === "object" ? catName.price || 0 : i === 1 ? 50 : 0,
      description: typeof catName === "object" ? catName.description || "" : `Formule ${catName}`,
      display_order: i + 1,
    });
  }

  return savedEvent;
}

export async function updateEvent(eventId, fields) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ticket_events")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", eventId)
        .select()
        .single();

      if (!error && data) {
        const events = getLocalEvents().map((e) => (e.id === eventId ? data : e));
        setLocalEvents(events);
        return data;
      }
    } catch (err) {
      console.warn("Erreur Supabase updateEvent :", err);
    }
  }

  const events = getLocalEvents().map((e) =>
    e.id === eventId ? { ...e, ...fields, updated_at: new Date().toISOString() } : e
  );
  setLocalEvents(events);
  return events.find((e) => e.id === eventId);
}

export async function deleteEvent(eventId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("ticket_events").delete().eq("id", eventId);
    } catch (err) {
      console.warn("Erreur Supabase deleteEvent :", err);
    }
  }
  setLocalEvents(getLocalEvents().filter((e) => e.id !== eventId));
  setLocalCategories(getLocalCategories().filter((c) => c.event_id !== eventId));
  setLocalTickets(getLocalTickets().filter((t) => t.event_id !== eventId));
  return true;
}

// -----------------------------------------------------------------------------
// 2. GESTION DES CATÉGORIES DE BILLETS (TABLE DÉDIÉE TICKET_CATEGORIES)
// -----------------------------------------------------------------------------

export async function listCategories(eventId = null) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("ticket_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (eventId) {
        query = query.eq("event_id", eventId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Mettre à jour le cache local
        if (eventId) {
          const localOther = getLocalCategories().filter((c) => c.event_id !== eventId);
          setLocalCategories([...localOther, ...data]);
        } else {
          setLocalCategories(data);
        }
        return data;
      }
    } catch (err) {
      console.warn("Supabase ticket_categories offline, utilisation cache local:", err);
    }
  }

  const all = getLocalCategories();
  if (eventId) {
    const filtered = all.filter((c) => c.event_id === eventId);
    // Si aucune catégorie pour cet événement, créer au moins un Pass Standard
    if (filtered.length === 0) {
      const defaultCat = {
        id: "cat_" + Date.now(),
        event_id: eventId,
        name: "Pass Standard",
        description: "Accès général à l'événement",
        price: 0,
        currency: "CHF",
        quota: null,
        color: "#245b46",
        is_active: true,
        display_order: 1,
        created_at: new Date().toISOString(),
      };
      setLocalCategories([...all, defaultCat]);
      return [defaultCat];
    }
    return filtered;
  }
  return all;
}

export async function createCategory(eventId, categoryData) {
  const newCat = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "cat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    event_id: eventId,
    name: categoryData.name.trim(),
    description: categoryData.description ? categoryData.description.trim() : "",
    price: parseFloat(categoryData.price) || 0,
    currency: categoryData.currency || "CHF",
    quota: categoryData.quota ? parseInt(categoryData.quota, 10) : null,
    color: categoryData.color || "#245b46",
    is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
    display_order: parseInt(categoryData.display_order, 10) || 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .insert(newCat)
        .select()
        .single();

      if (!error && data) {
        const local = getLocalCategories();
        setLocalCategories([...local, data]);
        return data;
      }
    } catch (err) {
      console.warn("Erreur Supabase createCategory :", err);
    }
  }

  const local = getLocalCategories();
  setLocalCategories([...local, newCat]);
  return newCat;
}

export async function updateCategory(categoryId, fields) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ticket_categories")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", categoryId)
        .select()
        .single();

      if (!error && data) {
        const local = getLocalCategories().map((c) => (c.id === categoryId ? data : c));
        setLocalCategories(local);
        return data;
      }
    } catch (err) {
      console.warn("Erreur Supabase updateCategory :", err);
    }
  }

  const local = getLocalCategories().map((c) =>
    c.id === categoryId ? { ...c, ...fields, updated_at: new Date().toISOString() } : c
  );
  setLocalCategories(local);
  return local.find((c) => c.id === categoryId);
}

export async function deleteCategory(categoryId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("ticket_categories").delete().eq("id", categoryId);
    } catch (err) {
      console.warn("Erreur Supabase deleteCategory :", err);
    }
  }
  const local = getLocalCategories().filter((c) => c.id !== categoryId);
  setLocalCategories(local);
  return true;
}

// -----------------------------------------------------------------------------
// 3. GESTION DES BILLETS (TICKETS)
// -----------------------------------------------------------------------------

export async function listTickets(eventId = null) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          category:ticket_categories (id, name, price, currency, color)
        `)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("event_id", eventId);
      }
      const { data, error } = await query;
      if (!error && data) {
        setLocalTickets(data);
        return data;
      }
    } catch (err) {
      console.warn("Supabase listTickets offline, utilisation cache local :", err);
    }
  }

  const tickets = getLocalTickets();
  if (eventId) {
    return tickets.filter((t) => t.event_id === eventId);
  }
  return tickets;
}

export async function getTicketByHashOrId(tokenOrId) {
  if (!tokenOrId) return null;
  const clean = tokenOrId.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          event:ticket_events (*),
          category:ticket_categories (*)
        `)
        .or(`barcode_hash.eq.${clean},ticket_code.eq.${clean},id.eq.${clean}`)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase getTicket error, fallback local :", err);
    }
  }

  const tickets = getLocalTickets();
  const ticket = tickets.find(
    (t) => t.barcode_hash === clean || t.ticket_code === clean || t.id === clean
  );
  if (!ticket) return null;

  const events = getLocalEvents();
  const event = events.find((e) => e.id === ticket.event_id) || null;
  const categories = getLocalCategories();
  const category = categories.find((c) => c.id === ticket.category_id) || null;

  return { ...ticket, event, category };
}

export async function issueTicket({
  eventId,
  attendeeName,
  attendeeEmail,
  categoryId = null,
  ticketCategory = "Standard",
  paymentStatus = null,
  amountPaid = null,
  stripeSessionId = null,
  seatNumber = null,
  rowNumber = null,
  zoneSection = null,
}) {
  // Retrouver la catégorie correspondante et l'événement
  const [allCats, event] = await Promise.all([
    listCategories(eventId),
    getEvent(eventId),
  ]);
  let resolvedCategory = null;

  if (categoryId) {
    resolvedCategory = allCats.find((c) => c.id === categoryId);
  } else if (ticketCategory) {
    resolvedCategory = allCats.find((c) => c.name.toLowerCase() === ticketCategory.toLowerCase());
  }

  const catName = resolvedCategory ? resolvedCategory.name : ticketCategory || "Standard";
  const catId = resolvedCategory ? resolvedCategory.id : categoryId || null;
  const price = resolvedCategory ? Number(resolvedCategory.price) || 0 : 0;

  // Calcul du statut de paiement et statut du billet
  let finalPaymentStatus = paymentStatus;
  let finalStatus = "valid";

  if (!finalPaymentStatus) {
    if (price > 0) {
      finalPaymentStatus = "unpaid";
      finalStatus = "pending_payment";
    } else {
      finalPaymentStatus = "free";
      finalStatus = "valid";
    }
  } else if (finalPaymentStatus === "unpaid" || finalPaymentStatus === "pending") {
    finalStatus = "pending_payment";
  } else {
    finalStatus = "valid";
  }

  const finalAmount = amountPaid !== null ? Number(amountPaid) : price;

  // Attribution automatique du placement si événement avec places numérotées ou workshop
  let assignedSeat = seatNumber;
  let assignedRow = rowNumber;
  let assignedZone = zoneSection;

  if (event?.seating_type === "numbered") {
    if (!assignedRow) {
      const rows = ["Rang A", "Rang B", "Rang C", "Rang D", "Rang E", "Rang F"];
      assignedRow = rows[Math.floor(Math.random() * rows.length)];
    }
    if (!assignedSeat) {
      assignedSeat = "Siège " + String(Math.floor(1 + Math.random() * 28)).padStart(2, "0");
    }
    if (!assignedZone) {
      assignedZone = catName.toLowerCase().includes("vip") ? "Loge Balcon VIP" : "Orchestre Parterre";
    }
  } else if (event?.seating_type === "workshop") {
    if (!assignedZone) assignedZone = "Table Ronde " + (1 + Math.floor(Math.random() * 5));
    if (!assignedSeat) assignedSeat = "Poste " + (1 + Math.floor(Math.random() * 8));
  }

  const newTicket = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "tkt_" + Date.now(),
    event_id: eventId,
    category_id: catId,
    attendee_name: attendeeName.trim(),
    attendee_email: attendeeEmail.trim().toLowerCase(),
    ticket_category: catName,
    ticket_code: generateShortTicketCode("KV"),
    barcode_hash: generateSecureHash(),
    status: finalStatus,
    payment_status: finalPaymentStatus,
    amount_paid: finalAmount,
    stripe_session_id: stripeSessionId || null,
    payment_intent_id: null,
    seat_number: assignedSeat || null,
    row_number: assignedRow || null,
    zone_section: assignedZone || null,
    scanned_at: null,
    scanned_by: null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...newTicket, user_id: session?.user?.id || null };
      const { data, error } = await supabase
        .from("tickets")
        .insert(payload)
        .select(`
          *,
          category:ticket_categories (id, name, price, currency, color)
        `)
        .single();

      if (!error && data) {
        const local = getLocalTickets();
        setLocalTickets([data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn("Erreur Supabase issueTicket, enregistrement local :", err);
    }
  }

  const local = getLocalTickets();
  const ticketObj = { ...newTicket, category: resolvedCategory };
  setLocalTickets([ticketObj, ...local]);
  return ticketObj;
}

// Déclenchement d'une session Stripe Checkout avec support TWINT + Carte Bancaire
export async function createCheckoutSession({
  ticket,
  event,
  category,
  returnUrl,
}) {
  const amount = Number(category?.price || ticket?.amount_paid || 0);
  const currency = category?.currency || "chf";

  // 1. Tenter l'appel à la fonction Edge Supabase si configurée
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          ticketId: ticket.id,
          eventTitle: event?.title || "Événement Suisse",
          categoryName: category?.name || ticket.ticket_category,
          amount,
          currency,
          returnUrl: returnUrl || (typeof window !== "undefined" ? window.location.origin + "/tickets" : ""),
          attendeeEmail: ticket.attendee_email,
          attendeeName: ticket.attendee_name,
        },
      });

      if (!error && data?.url) {
        if (data.sessionId) {
          await updateTicketStripeSession(ticket.id, data.sessionId);
        }
        return { url: data.url, sessionId: data.sessionId, isSimulation: false };
      }
    } catch (err) {
      console.warn("Edge function create-checkout indisponible, passage en mode direct/simulation :", err);
    }
  }

  // 2. Mode direct / simulation TWINT pour test fluide dans le navigateur
  return {
    url: null,
    sessionId: "sim_twint_" + Date.now(),
    isSimulation: true,
    amount,
    currency,
  };
}

export async function updateTicketStripeSession(ticketId, sessionId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("tickets").update({ stripe_session_id: sessionId }).eq("id", ticketId);
    } catch (err) {
      console.warn("Erreur updateTicketStripeSession :", err);
    }
  }
  const local = getLocalTickets().map((t) =>
    t.id === ticketId ? { ...t, stripe_session_id: sessionId } : t
  );
  setLocalTickets(local);
}

// Marquer un billet comme payé (par Webhook, TWINT ou validation manuelle admin)
export async function markTicketPaid(ticketId, { amount = null, method = "twint", sessionId = null } = {}) {
  const updates = {
    payment_status: "paid",
    status: "valid",
  };
  if (amount !== null) {
    updates.amount_paid = Number(amount);
  }
  if (sessionId) {
    updates.stripe_session_id = sessionId;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId)
        .select(`
          *,
          category:ticket_categories (id, name, price, currency, color)
        `)
        .single();
      if (!error && data) {
        const local = getLocalTickets().map((t) => (t.id === ticketId ? { ...t, ...data } : t));
        setLocalTickets(local);
        return data;
      }
    } catch (err) {
      console.warn("Erreur Supabase markTicketPaid :", err);
    }
  }

  const local = getLocalTickets().map((t) =>
    t.id === ticketId ? { ...t, ...updates } : t
  );
  setLocalTickets(local);
  return local.find((t) => t.id === ticketId);
}

export async function updateTicketStatus(ticketId, status) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("tickets").update({ status }).eq("id", ticketId);
    } catch (err) {
      console.warn("Erreur updateTicketStatus Supabase :", err);
    }
  }
  const local = getLocalTickets().map((t) => (t.id === ticketId ? { ...t, status } : t));
  setLocalTickets(local);
}

export async function deleteTicket(ticketId) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("tickets").delete().eq("id", ticketId);
    } catch (err) {
      console.warn("Erreur deleteTicket Supabase :", err);
    }
  }
  const local = getLocalTickets().filter((t) => t.id !== ticketId);
  setLocalTickets(local);
  return true;
}

// -----------------------------------------------------------------------------
// 4. VALIDATION & SCAN DE BILLET (LIVE SCANNER)
// -----------------------------------------------------------------------------

export async function validateAndScanTicket(barcodeOrCode, scannerIdentifier = "Caméra Mobile") {
  if (!barcodeOrCode) {
    return {
      success: false,
      reason: "invalid_format",
      message: "Code vide ou illisible.",
    };
  }

  const clean = barcodeOrCode.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("validate_ticket_scan", {
        p_barcode_hash: clean,
        p_scanner_identifier: scannerIdentifier,
      });

      if (!error && data) {
        if (data.ticket?.id) {
          const local = getLocalTickets().map((t) =>
            t.id === data.ticket.id
              ? { ...t, status: "used", scanned_at: data.scanned_at, scanned_by: scannerIdentifier }
              : t
          );
          setLocalTickets(local);
        }
        return data;
      }
    } catch (rpcErr) {
      console.warn("RPC validate_ticket_scan indisponible, fallback direct :", rpcErr);
    }
  }

  const ticket = await getTicketByHashOrId(clean);

  if (!ticket) {
    return {
      success: false,
      reason: "not_found",
      message: "Billet introuvable dans le système. Vérifiez la référence.",
      code: clean,
    };
  }

  if (ticket.status === "cancelled") {
    return {
      success: false,
      reason: "cancelled",
      message: "ATTENTION : Ce billet a été marqué comme ANNULÉ.",
      ticket,
      event: ticket.event,
    };
  }

  if (ticket.status === "used") {
    return {
      success: false,
      reason: "already_used",
      message: "ATTENTION : Ce billet a DÉJÀ ÉTÉ UTILISÉ et composté !",
      scanned_at: ticket.scanned_at,
      scanned_by: ticket.scanned_by,
      ticket,
      event: ticket.event,
    };
  }

  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("tickets")
        .update({ status: "used", scanned_at: now, scanned_by: scannerIdentifier })
        .eq("id", ticket.id);
    } catch (err) {
      console.warn("Erreur mise à jour statut billet :", err);
    }
  }

  const updatedTicket = {
    ...ticket,
    status: "used",
    scanned_at: now,
    scanned_by: scannerIdentifier,
  };

  const local = getLocalTickets().map((t) => (t.id === ticket.id ? updatedTicket : t));
  setLocalTickets(local);

  return {
    success: true,
    reason: "valid",
    message: "ACCÈS AUTORISÉ : Billet valide composté avec succès.",
    scanned_at: now,
    ticket: updatedTicket,
    event: ticket.event,
  };
}

// -----------------------------------------------------------------------------
// 5. UTILITAIRES QR CODE, ICS & CSV
// -----------------------------------------------------------------------------

export async function generateQrCodeDataUrl(text, options = {}) {
  try {
    return await QRCode.toDataURL(text, {
      width: options.width || 300,
      margin: options.margin || 1,
      color: {
        dark: options.darkColor || "#17231e",
        light: options.lightColor || "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("Erreur génération QR Code:", err);
    return "";
  }
}

export function generateTicketIcs(event, ticket) {
  if (!event) return;

  const startDate = new Date(event.event_date);
  const endDate = new Date(startDate.getTime() + 3 * 3600000);

  const formatDateIcs = (date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const catName = ticket?.category?.name || ticket?.ticket_category || "Standard";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kevin Voisin//Swiss Modernist Ticketing//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:ticket-${ticket?.id || event.id}@kevinvoisin.ch`,
    `DTSTAMP:${formatDateIcs(new Date())}`,
    `DTSTART:${formatDateIcs(startDate)}`,
    `DTEND:${formatDateIcs(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || "").replace(/\n/g, "\\n")}\\n\\nFormule: ${catName}\\nBillet: ${ticket?.ticket_code || ""}\\nParticipant: ${ticket?.attendee_name || ""}`,
    `LOCATION:${event.location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTicketsToCsv(event, tickets) {
  if (!tickets || tickets.length === 0) return;

  const headers = ["Code Billet", "Nom du participant", "Email", "Formule / Catégorie", "Statut", "Composté le", "Date émission"];
  const rows = tickets.map((t) => [
    `"${t.ticket_code}"`,
    `"${t.attendee_name.replace(/"/g, '""')}"`,
    `"${t.attendee_email}"`,
    `"${t.category?.name || t.ticket_category}"`,
    `"${t.status.toUpperCase()}"`,
    `"${t.scanned_at ? new Date(t.scanned_at).toLocaleString("fr-CH") : "-"}"`,
    `"${new Date(t.created_at).toLocaleString("fr-CH")}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = `Participants_${(event?.title || "event").replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
