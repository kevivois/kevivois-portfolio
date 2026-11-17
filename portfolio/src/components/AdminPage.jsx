import { useEffect, useState, useMemo, useCallback } from "react";
import {
  IconLock,
  IconLogout,
  IconRefresh,
  IconEye,
  IconUsers,
  IconFileDownload,
  IconMail,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconWorld,
  IconArrowLeft,
  IconAlertCircle,
  IconCheck,
  IconArrowUpRight,
  IconMapPin,
  IconRadio,
  IconPlayerPause,
  IconBuilding,
  IconClock,
  IconActivity,
  IconLanguage,
  IconWifi,
  IconHome,
  IconBriefcase,
  IconTarget,
  IconPhoto,
  IconSearch,
  IconX,
  IconInfoCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { isLikelyCompany } from "../lib/analytics";
import { InteractiveMap } from "./InteractiveMap";
import { LiveActivityChart } from "./LiveActivityChart";

function getCountryFlag(code) {
  if (!code || code.length !== 2) return "🌐";
  try {
    const upper = code.toUpperCase();
    const codePoints = [...upper].map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}

function getEventBadgeInfo(type) {
  switch (type) {
    case "page_view":
      return { label: "Page vue", color: "blue", icon: "👁️" };
    case "image_zoom":
      return { label: "Zoom image", color: "yellow", icon: "🔍" };
    case "cv_download":
      return { label: "Téléchargement CV", color: "amber", icon: "📄" };
    case "contact_click":
      return { label: "Clic contact", color: "green", icon: "✉️" };
    case "outbound_click":
      return { label: "Lien sortant", color: "purple", icon: "↗️" };
    case "nav_click":
      return { label: "Navigation ancre", color: "gray", icon: "⚓" };
    case "scroll_depth":
      return { label: "Lecture de page", color: "emerald", icon: "📜" };
    case "session_ping":
      return { label: "Temps passé", color: "orange", icon: "⏱️" };
    default:
      return { label: type, color: "gray", icon: "⚡" };
  }
}

export function AdminPage({ onBack }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Période sélectionnée : "24h", "7d", "30d", "all"
  const [timeRange, setTimeRange] = useState("7d");
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Mode Live (Temps réel)
  const [liveMode, setLiveMode] = useState(true);
  const [newLiveEventId, setNewLiveEventId] = useState(null);

  // Inspection approfondie d'un événement
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [feedSearch, setFeedSearch] = useState("");
  const [feedFilterType, setFeedFilterType] = useState("all");

  // Filtrage dynamique du flux en direct
  const filteredRecentEvents = useMemo(() => {
    return events.slice(0, 50).filter((evt) => {
      if (feedFilterType === "company") {
        const isComp = typeof evt.is_company === "boolean" ? evt.is_company : isLikelyCompany(evt.organization, evt.isp);
        if (!isComp) return false;
      } else if (feedFilterType !== "all" && evt.event_type !== feedFilterType) {
        return false;
      }

      if (!feedSearch.trim()) return true;
      const q = feedSearch.toLowerCase();
      const targetStr = `${evt.city || ""} ${evt.region || ""} ${evt.country || ""} ${evt.country_code || ""} ${evt.organization || ""} ${evt.isp || ""} ${evt.page_path || ""} ${evt.event_label || ""} ${evt.event_type || ""} ${evt.campaign_ref || ""}`.toLowerCase();
      return targetStr.includes(q);
    });
  }, [events, feedSearch, feedFilterType]);

  // Vérifier la session active Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Charger les événements analytics
  const fetchAnalytics = useCallback(async () => {
    if (!supabase || !session) return;
    setLoadingData(true);

    try {
      let query = supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (timeRange !== "all") {
        const date = new Date();
        if (timeRange === "24h") date.setHours(date.getHours() - 24);
        if (timeRange === "7d") date.setDate(date.getDate() - 7);
        if (timeRange === "30d") date.setDate(date.getDate() - 30);
        query = query.gte("created_at", date.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      // Exclure strictement tout événement d'administration ou de connexion
      const cleanData = (data || []).filter((e) => {
        const p = (e.page_path || "").toLowerCase();
        const l = (e.event_label || "").toLowerCase();
        return !p.includes("admin") && !l.includes("admin") && !l.includes("connexion") && !l.includes("login");
      });
      setEvents(cleanData);
    } catch (err) {
      console.error("Erreur analytics :", err);
    } finally {
      setLoadingData(false);
    }
  }, [session, timeRange]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, fetchAnalytics]);

  // Abonnement Realtime Supabase pour le Mode Live
  useEffect(() => {
    if (!supabase || !session || !liveMode) return;

    const channel = supabase
      .channel("analytics_realtime_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        (payload) => {
          const newEvent = payload.new;
          if (newEvent) {
            const p = (newEvent.page_path || "").toLowerCase();
            const l = (newEvent.event_label || "").toLowerCase();
            if (p.includes("admin") || l.includes("admin") || l.includes("connexion") || l.includes("login")) return;
            setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);
            setNewLiveEventId(newEvent.id);
            setTimeout(() => setNewLiveEventId(null), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, liveMode]);

  // Connexion admin
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setAuthError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err.message || "Échec de connexion.");
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setEvents([]);
  };

  // Calculs des métriques clés enrichies
  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const uniqueSessions = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
    const cvDownloads = events.filter((e) => e.event_type === "cv_download").length;
    const contactClicks = events.filter((e) => e.event_type === "contact_click").length;
    const outboundClicks = events.filter((e) => e.event_type === "outbound_click").length;
    const imageZooms = events.filter((e) => e.event_type === "image_zoom").length;
    const allClicks = events.filter((e) =>
      ["outbound_click", "contact_click", "link_click", "nav_click", "image_zoom", "cv_download"].includes(e.event_type)
    ).length;

    // Calcul de la durée moyenne passée sur le site
    const durations = events
      .map((e) => e.duration_seconds)
      .filter((d) => typeof d === "number" && d > 0);
    const avgDurationSec = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const formatDuration = (sec) => {
      if (!sec) return "0s";
      if (sec < 60) return `${sec}s`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m ${s > 0 ? `${s}s` : ""}`;
    };

    // Calcul du scroll moyen atteint
    const scrolls = events
      .map((e) => e.scroll_depth)
      .filter((s) => typeof s === "number" && s > 0);
    const avgScroll = scrolls.length
      ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length)
      : null;

    // Visiteurs actifs en direct (événements survenus il y a moins de 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeRecentSessions = new Set(
      events
        .filter((e) => new Date(e.created_at).getTime() >= fiveMinutesAgo)
        .map((e) => e.session_id)
        .filter(Boolean)
    );
    const activeNow = activeRecentSessions.size;

    // Sources de trafic
    const referrersCount = {};
    events.forEach((e) => {
      const ref = e.referrer || "direct";
      referrersCount[ref] = (referrersCount[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(referrersCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Géographie (Pays & Villes) - Zéro fallback qui fausse les données réelles
    const countriesData = {};
    events.forEach((e) => {
      if (!e.country_code && !e.country) return;
      const code = e.country_code || "??";
      const name = e.country || (code !== "??" ? code : "Non localisé");
      if (!countriesData[code]) {
        countriesData[code] = { code, name, count: 0, cities: new Set() };
      }
      countriesData[code].count++;
      if (e.city) countriesData[code].cities.add(e.city);
    });

    const topCountries = Object.values(countriesData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Différenciation : Vraies Entreprises vs Wi-Fi Particulier (FAI)
    const companiesCount = {};
    const ispsCount = {};

    events.forEach((e) => {
      const org = e.organization || e.isp;
      if (!org || org === "unknown" || org === "Opérateur suisse") return;
      const isComp = typeof e.is_company === "boolean" ? e.is_company : isLikelyCompany(e.organization, e.isp);
      if (isComp === true) {
        companiesCount[org] = (companiesCount[org] || 0) + 1;
      } else if (isComp === false) {
        ispsCount[org] = (ispsCount[org] || 0) + 1;
      }
    });

    const topCompanies = Object.entries(companiesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const topIsps = Object.entries(ispsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Connectivité réseau (4G/5G, Wi-Fi/Fibre, débits mesurés)
    const connCount = {};
    events.forEach((e) => {
      if (e.connection_type) {
        connCount[e.connection_type] = (connCount[e.connection_type] || 0) + 1;
      }
    });
    const topConnections = Object.entries(connCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Liens de tracking personnalisés / Campagnes (?ref=...)
    const campCount = {};
    events.forEach((e) => {
      if (e.campaign_ref) {
        campCount[e.campaign_ref] = (campCount[e.campaign_ref] || 0) + 1;
      }
    });
    const topCampaigns = Object.entries(campCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Cantons & Régions
    const regionsCount = {};
    events.forEach((e) => {
      const reg = e.region || e.city;
      if (reg) {
        regionsCount[reg] = (regionsCount[reg] || 0) + 1;
      }
    });
    const topRegions = Object.entries(regionsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Langues des navigateurs
    const langCount = {};
    events.forEach((e) => {
      const l = e.user_language ? e.user_language.slice(0, 5) : "Autre";
      langCount[l] = (langCount[l] || 0) + 1;
    });
    const topLangs = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Appareils
    const deviceCount = { desktop: 0, mobile: 0, tablet: 0 };
    events.forEach((e) => {
      if (e.device_type && deviceCount[e.device_type] !== undefined) {
        deviceCount[e.device_type]++;
      } else {
        deviceCount.desktop++;
      }
    });

    // Navigateurs
    const browserCount = {};
    events.forEach((e) => {
      const b = e.browser || "Autre";
      browserCount[b] = (browserCount[b] || 0) + 1;
    });

    return {
      pageViews,
      uniqueSessions,
      cvDownloads,
      contactClicks,
      outboundClicks,
      imageZooms,
      allClicks,
      avgDurationText: formatDuration(avgDurationSec),
      avgScroll: avgScroll ? `${avgScroll}%` : "Non mesuré",
      activeNow,
      topReferrers,
      topCountries,
      topCompanies,
      topIsps,
      topConnections,
      topCampaigns,
      topRegions,
      topLangs,
      deviceCount,
      browserCount,
      recentEvents: events.slice(0, 30),
    };
  }, [events]);

  return (
    <div className="site-shell admin-view">
      {/* En-tête conforme à la DA du site */}
      <header className="site-header">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); onBack(); }}>
          <span className="brand-name">Kevin Voisin</span>
          <span className="brand-role">
            {session ? "Espace d’administration" : "Portail sécurisé"}
          </span>
        </a>
        <nav className="site-nav" aria-label="Navigation admin">
          <button type="button" className="admin-back-link" onClick={onBack}>
            <IconArrowLeft className="inline-arrow" stroke={1.8} /> Retour au portfolio
          </button>
        </nav>
        <div className="header-actions">
          {session ? (
            <div className="admin-header-user">
              {liveMode && (
                <span className="admin-live-pulse-badge" title="Mode direct actif">
                  <span className="admin-pulse-dot" />
                  <span>En direct</span>
                </span>
              )}
              <button
                type="button"
                className="header-contact admin-logout-trigger"
                onClick={handleLogout}
              >
                Déconnexion ({session.user?.email?.split("@")[0]})
              </button>
            </div>
          ) : (
            <span className="admin-status-badge">Accès restreint</span>
          )}
        </div>
      </header>

      <main>
        {/* Section Cover / Titre discret selon l'état de connexion */}
        <section className="cover admin-cover">
          <div className="cover-inner admin-cover-inner">
            <div className="cover-copy">
              <p className="cover-kicker">
                {session ? "00 / 01 · Tableau de bord" : "00 / 01 · Authentification"}
              </p>
              <h1 id="cover-title">
                <span className="hero-line">{session ? "Statistiques." : "Connexion."}</span>
              </h1>
            </div>
          </div>
        </section>

        <div className="content admin-content">
          {!isSupabaseConfigured ? (
            /* Alerte configuration requise */
            <div className="master-note admin-box-notice">
              <p className="master-kicker">Configuration requise</p>
              <h3>Identifiants Supabase introuvables</h3>
              <p>
                Renseignez vos clés dans le fichier <code>portfolio/.env</code> :
              </p>
              <pre className="admin-code-block">
{`SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon-publique`}
              </pre>
            </div>
          ) : !session ? (
            /* Écran de connexion sobre et neutre (ne divulgue aucune information sur la nature de l'espace) */
            <div className="admin-auth-section">
              <div className="admin-auth-card">
                <div className="section-heading">
                  <h2>Identification.</h2>
                  <span className="section-aside">Accès réservé</span>
                </div>
                <p className="admin-auth-intro">
                  Espace privé. Veuillez vous identifier pour continuer.
                </p>

                {authError && (
                  <div className="admin-auth-error">
                    <IconAlertCircle size={16} stroke={2} />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="admin-auth-form">
                  <div className="admin-field">
                    <label htmlFor="admin-email">Identifiant / E-mail</label>
                    <input
                      id="admin-email"
                      type="email"
                      required
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="admin-password">Mot de passe</label>
                    <input
                      id="admin-password"
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="admin-submit-btn"
                    disabled={loading}
                  >
                    {loading ? "Vérification..." : "Se connecter"}
                    <IconArrowUpRight className="inline-arrow" stroke={1.8} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Dashboard complet */
            <div className="admin-dashboard-view">
              {/* Barre de contrôle : Filtres + Mode Live */}
              <div className="admin-controls-bar">
                <div className="admin-period-selector" role="group" aria-label="Période">
                  {[
                    { id: "24h", label: "Dernières 24h" },
                    { id: "7d", label: "7 derniers jours" },
                    { id: "30d", label: "30 derniers jours" },
                    { id: "all", label: "Historique complet" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`admin-period-btn${timeRange === p.id ? " is-active" : ""}`}
                      onClick={() => setTimeRange(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="admin-live-controls">
                  <button
                    type="button"
                    className={`admin-live-toggle-btn${liveMode ? " is-live" : ""}`}
                    onClick={() => setLiveMode(!liveMode)}
                    title={liveMode ? "Désactiver les mises à jour en direct" : "Activer les mises à jour en direct"}
                  >
                    {liveMode ? (
                      <>
                        <span className="live-pulse-circle" />
                        <span>Mode Live : Actif</span>
                      </>
                    ) : (
                      <>
                        <IconPlayerPause size={13} stroke={2} />
                        <span>Mode Live : En pause</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="admin-refresh-button"
                    onClick={fetchAnalytics}
                    disabled={loadingData}
                    title="Actualiser manuellement"
                  >
                    <IconRefresh
                      size={14}
                      stroke={1.8}
                      className={loadingData ? "spin-icon" : ""}
                    />
                    <span>{loadingData ? "..." : "Actualiser"}</span>
                  </button>
                </div>
              </div>

              {/* Indicateur de direct en temps réel si actif */}
              <div className="admin-live-status-card">
                <div className="admin-live-status-left">
                  <span className="admin-status-pulse-dot" />
                  <strong>
                    {stats.activeNow} visiteur{stats.activeNow > 1 ? "s" : ""} actif{stats.activeNow > 1 ? "s" : ""}
                  </strong>
                  <span className="admin-status-sub">(au cours des 5 dernières minutes)</span>
                </div>
                {newLiveEventId && (
                  <span className="admin-new-activity-badge">Nouvel événement détecté !</span>
                )}
              </div>

              {/* Cartes KPI enrichies */}
              <div className="admin-metrics-grid">
                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Vues de page</span>
                    <IconEye size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.pageViews}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Visiteurs uniques</span>
                    <IconUsers size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.uniqueSessions}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Temps moyen sur site</span>
                    <IconClock size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.avgDurationText}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Lecture moyenne</span>
                    <IconActivity size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.avgScroll}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Téléchargements CV</span>
                    <IconFileDownload size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.cvDownloads}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Zooms d'images</span>
                    <IconPhoto size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.imageZooms}</strong>
                </div>

                <div className="admin-metric-card">
                  <div className="admin-metric-head">
                    <span className="admin-metric-label">Tous les clics &amp; actions</span>
                    <IconArrowUpRight size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.allClicks}</strong>
                </div>
              </div>

              {/* SECTION GRAPHIQUES EN DIRECT */}
              <LiveActivityChart events={events} timeRange={timeRange} />

              {/* SECTION GÉOGRAPHIE & CARTE */}
              <div className="admin-panel-card admin-geo-section">
                <div className="section-heading">
                  <h3 className="admin-panel-title">Origine géographique &amp; Carte</h3>
                  <span className="section-aside">Localisation estimée</span>
                </div>

                <div className="admin-geo-layout">
                  {/* Vraie carte géographique interactive (OpenStreetMap / CartoDB tiles + pins) */}
                  <div className="admin-map-container" aria-label="Carte interactive de répartition des visites">
                    <InteractiveMap events={events} />
                    <div className="admin-map-legend">
                      <span><span className="legend-dot active" /> Villes détectées (survolez un point)</span>
                      <span>Zoom &amp; déplacement OpenStreetMap</span>
                    </div>
                  </div>

                  {/* Tableau des pays et villes */}
                  <div className="admin-countries-table-wrapper">
                    {stats.topCountries.length === 0 ? (
                      <p className="admin-empty-note">Aucune localisation enregistrée pour l'instant.</p>
                    ) : (
                      <ul className="admin-countries-list">
                        {stats.topCountries.map((c) => {
                          const total = events.length || 1;
                          const pct = Math.round((c.count / total) * 100);
                          const citiesText = Array.from(c.cities).filter(Boolean).slice(0, 3).join(", ");
                          return (
                            <li key={c.code} className="admin-country-row">
                              <div className="admin-country-meta">
                                <div className="admin-country-title">
                                  <span className="country-flag">{getCountryFlag(c.code)}</span>
                                  <strong>{c.name}</strong>
                                  {citiesText && (
                                    <span className="country-cities">({citiesText})</span>
                                  )}
                                </div>
                                <span className="country-count">
                                  {c.count} vue{c.count > 1 ? "s" : ""} · {pct}%
                                </span>
                              </div>
                              <div className="admin-source-track">
                                <div className="admin-source-bar" style={{ width: `${pct}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Deux colonnes d'analyse : Sources & Appareils */}
              <div className="two-col admin-breakdown-row">
                {/* Sources de trafic (Referrers) */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">Sources de trafic</h3>
                    <span className="section-aside">Origine des visites</span>
                  </div>
                  {stats.topReferrers.length === 0 ? (
                    <p className="admin-empty-note">Aucune visite sur la période sélectionnée.</p>
                  ) : (
                    <ul className="admin-sources-list">
                      {stats.topReferrers.map(([ref, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={ref} className="admin-source-item">
                            <div className="admin-source-info">
                              <span className="admin-source-name">
                                {ref === "direct" ? "Accès direct (aucun référent)" : ref}
                              </span>
                              <span className="admin-source-count">
                                {count} vue{count > 1 ? "s" : ""} · {pct}%
                              </span>
                            </div>
                            <div className="admin-source-track">
                              <div className="admin-source-bar" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Appareils & Navigateurs */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">Appareils &amp; Écrans</h3>
                    <span className="section-aside">Répartition</span>
                  </div>
                  <div className="admin-devices-list">
                    {[
                      {
                        key: "desktop",
                        label: "Ordinateurs",
                        count: stats.deviceCount.desktop,
                        icon: <IconDeviceDesktop size={16} stroke={1.7} />,
                      },
                      {
                        key: "mobile",
                        label: "Smartphones",
                        count: stats.deviceCount.mobile,
                        icon: <IconDeviceMobile size={16} stroke={1.7} />,
                      },
                      {
                        key: "tablet",
                        label: "Tablettes",
                        count: stats.deviceCount.tablet,
                        icon: <IconDeviceMobile size={16} stroke={1.7} />,
                      },
                    ].map((item) => {
                      const total =
                        stats.deviceCount.desktop +
                          stats.deviceCount.mobile +
                          stats.deviceCount.tablet || 1;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.key} className="admin-device-item">
                          <div className="admin-device-name">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          <span className="admin-device-stat">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Deux colonnes : Vraies Entreprises vs Wi-Fi Particulier (FAI) */}
              <div className="two-col admin-breakdown-row">
                {/* 1. VRAIES ENTREPRISES & ÉCOLES */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">🏢 Entreprises &amp; Écoles</h3>
                    <span className="section-aside">Réseaux pros vérifiés</span>
                  </div>
                  {stats.topCompanies.length === 0 ? (
                    <p className="admin-empty-note">
                      Aucune visite depuis une entreprise détectée sur cette période (hors FAI résidentiels).
                    </p>
                  ) : (
                    <ul className="admin-sources-list">
                      {stats.topCompanies.map(([org, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={org} className="admin-source-item">
                            <div className="admin-source-info">
                              <span className="admin-source-name">
                                <span className="pro-org-tag">🏢 PRO</span> {org}
                              </span>
                              <span className="admin-source-count">
                                {count} visite{count > 1 ? "s" : ""} · {pct}%
                              </span>
                            </div>
                            <div className="admin-source-track">
                              <div className="admin-source-bar" style={{ width: `${pct}%`, background: "#245b46" }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 2. WI-FI PARTICULIER & OPÉRATEURS RÉSIDENTIELS */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">🏠 Wi-Fi Privé &amp; Opérateurs</h3>
                    <span className="section-aside">Fournisseurs d’accès</span>
                  </div>
                  {stats.topIsps.length === 0 ? (
                    <p className="admin-empty-note">Aucun opérateur enregistré.</p>
                  ) : (
                    <ul className="admin-sources-list">
                      {stats.topIsps.map(([isp, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={isp} className="admin-source-item">
                            <div className="admin-source-info">
                              <span className="admin-source-name">
                                <span className="isp-tag">🏠 FAI</span> {isp}
                              </span>
                              <span className="admin-source-count">
                                {count} visite{count > 1 ? "s" : ""} · {pct}%
                              </span>
                            </div>
                            <div className="admin-source-track">
                              <div className="admin-source-bar" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Deux colonnes : Connectivité Réseau & Campagnes ciblées (?ref=...) */}
              <div className="two-col admin-breakdown-row">
                {/* 3. CONNECTIVITÉ RÉSEAU */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">📶 Connectivité Réseau</h3>
                    <span className="section-aside">Vitesse &amp; Type d'accès</span>
                  </div>
                  {stats.topConnections.length === 0 ? (
                    <p className="admin-empty-note">Aucune donnée de connectivité disponible.</p>
                  ) : (
                    <ul className="admin-sources-list">
                      {stats.topConnections.map(([conn, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={conn} className="admin-source-item">
                            <div className="admin-source-info">
                              <span className="admin-source-name">
                                <IconWifi size={14} stroke={1.7} className="inline-icon-sub" /> {conn}
                              </span>
                              <span className="admin-source-count">
                                {count} vue{count > 1 ? "s" : ""} · {pct}%
                              </span>
                            </div>
                            <div className="admin-source-track">
                              <div className="admin-source-bar" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 4. LIENS CIBLÉS & CANTONS */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">🎯 Campagnes &amp; Cantons</h3>
                    <span className="section-aside">Sources ciblées</span>
                  </div>

                  <div className="admin-subcard-split">
                    <div>
                      <p className="admin-mini-title">Liens ciblés (?ref=... / Candidatures)</p>
                      {stats.topCampaigns.length === 0 ? (
                        <p className="admin-empty-note" style={{ fontSize: "11px" }}>
                          Astuce : ajoutez <code>?ref=nom_entreprise</code> à votre URL pour suivre une candidature précise !
                        </p>
                      ) : (
                        <ul className="admin-mini-list">
                          {stats.topCampaigns.map(([camp, count]) => (
                            <li key={camp} className="admin-mini-row">
                              <span className="cell-mono tag-campaign">{camp}</span>
                              <strong>{count} vue{count > 1 ? "s" : ""}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <p className="admin-mini-title">Cantons / Régions</p>
                      {stats.topRegions.length === 0 ? (
                        <p className="admin-empty-note">Aucune région enregistrée.</p>
                      ) : (
                        <ul className="admin-mini-list">
                          {stats.topRegions.slice(0, 4).map(([reg, count]) => (
                            <li key={reg} className="admin-mini-row">
                              <span>{reg}</span>
                              <strong>{count}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Journal d’activité enrichi avec recherche, filtres et inspection détaillée */}
              <div className="admin-panel-card admin-feed-section">
                <div className="section-heading feed-head-wrap">
                  <div>
                    <h3 className="admin-panel-title">Flux d’activité détaillé</h3>
                    <span className="section-aside">
                      {filteredRecentEvents.length} événement{filteredRecentEvents.length > 1 ? "s" : ""} affiché{filteredRecentEvents.length > 1 ? "s" : ""} · Cliquez sur une ligne pour voir tous les détails
                    </span>
                  </div>

                  {/* Barre de recherche et filtres rapides */}
                  <div className="feed-controls-row">
                    <div className="feed-search-box">
                      <IconSearch size={14} stroke={1.8} className="feed-search-icon" />
                      <input
                        type="text"
                        placeholder="Filtrer par ville, entreprise, page, appareil..."
                        value={feedSearch}
                        onChange={(e) => setFeedSearch(e.target.value)}
                        className="feed-search-input"
                      />
                      {feedSearch && (
                        <button type="button" className="feed-search-clear" onClick={() => setFeedSearch("")}>
                          <IconX size={12} stroke={2} />
                        </button>
                      )}
                    </div>

                    <div className="feed-filter-pills" role="group" aria-label="Filtrer par type">
                      {[
                        { id: "all", label: "Tous" },
                        { id: "company", label: "🏢 Entreprises" },
                        { id: "image_zoom", label: "🔍 Zooms" },
                        { id: "page_view", label: "👁️ Vues" },
                        { id: "cv_download", label: "📄 CV" },
                        { id: "contact_click", label: "✉️ Contact" },
                        { id: "outbound_click", label: "↗️ Liens" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          className={`feed-filter-tab${feedFilterType === tab.id ? " is-active" : ""}`}
                          onClick={() => setFeedFilterType(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredRecentEvents.length === 0 ? (
                  <p className="admin-empty-note">
                    {feedSearch ? `Aucun événement ne correspond à « ${feedSearch} ».` : "Aucun événement enregistré."}
                  </p>
                ) : (
                  <>
                    <div className="table-mobile-hint">
                      <span>⇄ Faites glisser horizontalement pour afficher toutes les colonnes</span>
                    </div>
                    <div className="admin-table-container">
                      <table className="admin-table interactive-feed-table">
                        <thead>
                          <tr>
                            <th>Date / Heure</th>
                            <th>Événement</th>
                            <th>Localisation &amp; Réseau</th>
                            <th>Page consultée</th>
                            <th>Détail / Action</th>
                            <th>Appareil &amp; Vitesse</th>
                            <th>Source / Référent</th>
                            <th style={{ textAlign: "right" }}>Détails</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecentEvents.map((evt) => {
                          const isComp = typeof evt.is_company === "boolean"
                            ? evt.is_company
                            : isLikelyCompany(evt.organization, evt.isp);
                          const orgLabel = evt.organization || evt.isp;
                          const badge = getEventBadgeInfo(evt.event_type);

                          return (
                            <tr
                              key={evt.id}
                              className={`feed-row-clickable${evt.id === newLiveEventId ? " row-live-highlight" : ""}${selectedEvent?.id === evt.id ? " is-selected-row" : ""}`}
                              onClick={() => setSelectedEvent(evt)}
                              title="Cliquez pour inspecter tous les détails de cette visite"
                            >
                              <td className="cell-mono cell-time">
                                <div>
                                  {new Date(evt.created_at).toLocaleTimeString("fr-CH", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                                <span className="cell-sub-date">
                                  {new Date(evt.created_at).toLocaleDateString("fr-CH", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </span>
                              </td>

                              <td>
                                <span className={`admin-badge-type badge-${evt.event_type}`}>
                                  {badge.icon} {badge.label}
                                </span>
                              </td>

                              <td className="cell-location">
                                <div className="location-flag-text">
                                  {evt.country_code ? (
                                    <span>
                                      {getCountryFlag(evt.country_code)}{" "}
                                      <strong>{evt.city || "Emplacement"}</strong>
                                      {evt.region ? ` (${evt.region})` : ""}
                                      {evt.postal ? ` ${evt.postal}` : ""}
                                      {evt.country_code ? `, ${evt.country_code}` : ""}
                                    </span>
                                  ) : (
                                    <span className="cell-muted">Non géolocalisé</span>
                                  )}
                                </div>
                                {orgLabel && (
                                  <span
                                    className={`cell-org-badge ${isComp ? "is-pro" : "is-isp"}`}
                                    title={isComp ? "Réseau d'entreprise / institution vérifié" : "Fournisseur d'accès résidentiel (Wi-Fi privé)"}
                                  >
                                    {isComp ? "🏢 " : "🏠 "}{orgLabel}
                                  </span>
                                )}
                              </td>

                              <td className="cell-mono cell-path">
                                <span>{evt.page_path || "/"}</span>
                                {evt.campaign_ref && (
                                  <span className="cell-camp-tag" title="Paramètre de campagne">
                                    ?ref={evt.campaign_ref}
                                  </span>
                                )}
                              </td>

                              <td>
                                {evt.duration_seconds ? (
                                  <span className="cell-duration-tag">
                                    ⏱ {evt.duration_seconds}s{evt.scroll_depth ? ` · scroll ${evt.scroll_depth}%` : ""}
                                  </span>
                                ) : evt.scroll_depth ? (
                                  <span className="cell-duration-tag">
                                    Scroll {evt.scroll_depth}%
                                  </span>
                                ) : (
                                  <span className="cell-label-text">{evt.event_label || "-"}</span>
                                )}
                              </td>

                              <td className="cell-muted">
                                <div>{evt.device_type} · {evt.browser}</div>
                                {evt.connection_type && (
                                  <div className="cell-conn-info">📶 {evt.connection_type}</div>
                                )}
                              </td>

                              <td className="cell-mono cell-muted">
                                <span>{evt.referrer && evt.referrer !== "internal" ? evt.referrer : "Accès direct"}</span>
                                {evt.user_language && (
                                  <span className="cell-lang-tag">[{evt.user_language}]</span>
                                )}
                              </td>

                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="feed-inspect-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(evt);
                                  }}
                                >
                                  Inspecter
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              </div>

              {/* MODAL / TIROIR D'INSPECTION DÉTAILLÉE D'UN ÉVÉNEMENT */}
              {selectedEvent && (
                <div className="admin-inspect-overlay" onClick={() => setSelectedEvent(null)}>
                  <div className="admin-inspect-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="inspect-modal-header">
                      <div className="inspect-header-left">
                        <span className={`admin-badge-type badge-${selectedEvent.event_type}`}>
                          {getEventBadgeInfo(selectedEvent.event_type).icon} {getEventBadgeInfo(selectedEvent.event_type).label}
                        </span>
                        <h3 className="inspect-title">Détails complets de la visite</h3>
                      </div>
                      <button
                        type="button"
                        className="inspect-close-btn"
                        onClick={() => setSelectedEvent(null)}
                        aria-label="Fermer"
                      >
                        <IconX size={18} stroke={2} />
                      </button>
                    </div>

                    <div className="inspect-modal-body">
                      {/* Horodatage & Identifiant de session */}
                      <div className="inspect-banner-info">
                        <div>
                          <span className="inspect-meta-label">Horodatage précis</span>
                          <strong>
                            {new Date(selectedEvent.created_at).toLocaleDateString("fr-CH", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}{" "}
                            à{" "}
                            {new Date(selectedEvent.created_at).toLocaleTimeString("fr-CH", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </strong>
                        </div>
                        <div>
                          <span className="inspect-meta-label">Session anonyme ID</span>
                          <code className="inspect-session-id">{selectedEvent.session_id || "s_anonyme"}</code>
                        </div>
                      </div>

                      {/* 4 Blocs de détails structurés */}
                      <div className="inspect-grid">
                        {/* Bloc 1 : Localisation */}
                        <div className="inspect-card">
                          <h4 className="inspect-card-title">
                            <IconMapPin size={15} stroke={1.8} /> Localisation géographique
                          </h4>
                          <ul className="inspect-detail-list">
                            <li>
                              <span>Pays</span>
                              {selectedEvent.country || selectedEvent.country_code ? (
                                <strong>{getCountryFlag(selectedEvent.country_code)} {selectedEvent.country || selectedEvent.country_code} {selectedEvent.country_code ? `(${selectedEvent.country_code})` : ""}</strong>
                              ) : (
                                <span className="cell-muted">Non localisé</span>
                              )}
                            </li>
                            <li>
                              <span>Ville</span>
                              <strong>{selectedEvent.city || "Non spécifiée"}</strong>
                            </li>
                            <li>
                              <span>Canton / Région</span>
                              <strong>{selectedEvent.region || "Non spécifié"}</strong>
                            </li>
                            <li>
                              <span>Code postal</span>
                              <strong>{selectedEvent.postal || "Non spécifié"}</strong>
                            </li>
                            {selectedEvent.latitude && selectedEvent.longitude ? (
                              <li>
                                <span>Coordonnées GPS</span>
                                <a
                                  href={`https://www.openstreetmap.org/?mlat=${selectedEvent.latitude}&mlon=${selectedEvent.longitude}#map=14/${selectedEvent.latitude}/${selectedEvent.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inspect-map-link"
                                >
                                  {Number(selectedEvent.latitude).toFixed(4)}, {Number(selectedEvent.longitude).toFixed(4)} <IconExternalLink size={12} stroke={1.7} />
                                </a>
                              </li>
                            ) : (
                              <li>
                                <span>Coordonnées GPS</span>
                                <span className="cell-muted">Non disponibles</span>
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Bloc 2 : Réseau & Organisation */}
                        <div className="inspect-card">
                          <h4 className="inspect-card-title">
                            <IconBuilding size={15} stroke={1.8} /> Réseau &amp; Organisation
                          </h4>
                          <ul className="inspect-detail-list">
                            <li>
                              <span>Organisation / FAI</span>
                              <strong>{selectedEvent.organization || selectedEvent.isp || "Opérateur non identifié"}</strong>
                            </li>
                            <li>
                              <span>Type de réseau</span>
                              {(() => {
                                const isComp = typeof selectedEvent.is_company === "boolean" ? selectedEvent.is_company : isLikelyCompany(selectedEvent.organization, selectedEvent.isp);
                                if (isComp === true) return <span className="cell-org-badge is-pro">🏢 Entreprise / Pro</span>;
                                if (isComp === false) return <span className="cell-org-badge is-isp">🏠 Wi-Fi Particulier / FAI</span>;
                                return <span className="cell-muted">Non identifié</span>;
                              })()}
                            </li>
                            <li>
                              <span>Fournisseur d'accès (ISP)</span>
                              <strong>{selectedEvent.isp || "-"}</strong>
                            </li>
                            <li>
                              <span>Connectivité réseau</span>
                              <strong>{selectedEvent.connection_type || "Non mesurée (Safari/Firefox)"}</strong>
                            </li>
                          </ul>
                        </div>

                        {/* Bloc 3 : Matériel & Navigateur */}
                        <div className="inspect-card">
                          <h4 className="inspect-card-title">
                            <IconDeviceDesktop size={15} stroke={1.8} /> Matériel &amp; Navigateur
                          </h4>
                          <ul className="inspect-detail-list">
                            <li>
                              <span>Type d'appareil</span>
                              <strong>{selectedEvent.device_type === "mobile" ? "📱 Smartphone" : selectedEvent.device_type === "tablet" ? "📱 Tablette" : "💻 Ordinateur"}</strong>
                            </li>
                            <li>
                              <span>Système d'exploitation (OS)</span>
                              <strong>{selectedEvent.os || "Inconnu"}</strong>
                            </li>
                            <li>
                              <span>Navigateur</span>
                              <strong>{selectedEvent.browser || "Inconnu"}</strong>
                            </li>
                            <li>
                              <span>Résolution d'écran</span>
                              <code>{selectedEvent.screen_res || "Non mesurée"}</code>
                            </li>
                            <li>
                              <span>Langue du système</span>
                              <code>{selectedEvent.user_language || "fr"}</code>
                            </li>
                          </ul>
                        </div>

                        {/* Bloc 4 : Navigation & Engagement */}
                        <div className="inspect-card">
                          <h4 className="inspect-card-title">
                            <IconActivity size={15} stroke={1.8} /> Contexte &amp; Engagement
                          </h4>
                          <ul className="inspect-detail-list">
                            <li>
                              <span>Page consultée</span>
                              <code className="cell-path">{selectedEvent.page_path || "/"}</code>
                            </li>
                            <li>
                              <span>Source d'arrivée (Referrer)</span>
                              <strong>{selectedEvent.referrer || "Accès direct"}</strong>
                            </li>
                            <li>
                              <span>Lien de campagne (?ref=)</span>
                              <strong>{selectedEvent.campaign_ref ? `?ref=${selectedEvent.campaign_ref}` : "Aucune campagne"}</strong>
                            </li>
                            <li>
                              <span>Temps passé sur le site</span>
                              <strong>{selectedEvent.duration_seconds ? `${selectedEvent.duration_seconds} secondes` : "Non mesuré"}</strong>
                            </li>
                            <li>
                              <span>Profondeur de lecture</span>
                              <strong>{selectedEvent.scroll_depth ? `${selectedEvent.scroll_depth}% de la page` : "Non mesuré"}</strong>
                            </li>
                            {selectedEvent.event_label && (
                              <li>
                                <span>Libellé / Détail d'action</span>
                                <strong>{selectedEvent.event_label}</strong>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="inspect-modal-footer">
                      <span className="inspect-footer-note">Données enregistrées en temps réel dans votre base Supabase</span>
                      <button
                        type="button"
                        className="inspect-done-btn"
                        onClick={() => setSelectedEvent(null)}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer conforme à la DA */}
        <footer className="page-footer content">
          <span>© 2026 Kevin Voisin</span>
          <span>Espace sécurisé Supabase</span>
          <button type="button" className="admin-back-bottom-btn" onClick={onBack}>
            <IconArrowLeft className="inline-arrow" stroke={1.7} /> Retour au portfolio
          </button>
        </footer>
      </main>
    </div>
  );
}
