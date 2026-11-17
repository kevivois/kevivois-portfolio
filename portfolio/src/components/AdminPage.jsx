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
} from "@tabler/icons-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { InteractiveMap } from "./InteractiveMap";

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
      setEvents(data || []);
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

    // Géographie (Pays & Villes)
    const countriesData = {};
    events.forEach((e) => {
      const code = e.country_code || "CH";
      const name = e.country || "Suisse";
      if (!countriesData[code]) {
        countriesData[code] = { code, name, count: 0, cities: new Set() };
      }
      countriesData[code].count++;
      if (e.city) countriesData[code].cities.add(e.city);
    });

    const topCountries = Object.values(countriesData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Organisations, Entreprises & FAI
    const orgsCount = {};
    events.forEach((e) => {
      const org = e.organization || e.isp;
      if (org && org !== "unknown" && org !== "Opérateur suisse") {
        orgsCount[org] = (orgsCount[org] || 0) + 1;
      }
    });
    const topOrgs = Object.entries(orgsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

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
      avgDurationText: formatDuration(avgDurationSec),
      avgScroll: avgScroll ? `${avgScroll}%` : "Non mesuré",
      activeNow,
      topReferrers,
      topCountries,
      topOrgs,
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
{`VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique`}
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
                    <span className="admin-metric-label">Clics contact &amp; liens</span>
                    <IconArrowUpRight size={18} stroke={1.7} />
                  </div>
                  <strong className="admin-metric-number">{stats.contactClicks + stats.outboundClicks}</strong>
                </div>
              </div>

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

              {/* Deux colonnes supplémentaires : Organisations / Entreprises & Cantons / Langues */}
              <div className="two-col admin-breakdown-row">
                {/* Organisations & Entreprises détectées */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">Organisations &amp; Entreprises</h3>
                    <span className="section-aside">Réseau FAI / Entreprise</span>
                  </div>
                  {stats.topOrgs.length === 0 ? (
                    <p className="admin-empty-note">
                      Aucune organisation ou FAI spécifique détecté sur cette période.
                    </p>
                  ) : (
                    <ul className="admin-sources-list">
                      {stats.topOrgs.map(([org, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={org} className="admin-source-item">
                            <div className="admin-source-info">
                              <span className="admin-source-name">
                                <IconBuilding size={14} stroke={1.7} className="inline-icon-sub" /> {org}
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

                {/* Cantons, Régions & Langues */}
                <div className="admin-panel-card">
                  <div className="section-heading">
                    <h3 className="admin-panel-title">Cantons &amp; Langues</h3>
                    <span className="section-aside">Régions et préférences</span>
                  </div>

                  <div className="admin-subcard-split">
                    <div>
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

                    <div style={{ marginTop: "1rem" }}>
                      <p className="admin-mini-title">Langues du système</p>
                      {stats.topLangs.length === 0 ? (
                        <p className="admin-empty-note">Aucune langue détectée.</p>
                      ) : (
                        <ul className="admin-mini-list">
                          {stats.topLangs.map(([langCode, count]) => (
                            <li key={langCode} className="admin-mini-row">
                              <span className="cell-mono">{langCode}</span>
                              <strong>{count}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Journal d’activité récent (avec animation pour les nouveaux événements en direct) */}
              <div className="admin-panel-card admin-feed-section">
                <div className="section-heading">
                  <h3 className="admin-panel-title">Flux d’activité en direct</h3>
                  <span className="section-aside">Derniers 30 événements</span>
                </div>
                {stats.recentEvents.length === 0 ? (
                  <p className="admin-empty-note">Aucun événement enregistré.</p>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date / Heure</th>
                          <th>Événement</th>
                          <th>Localisation &amp; Réseau</th>
                          <th>Page / Cible</th>
                          <th>Détail / Engagement</th>
                          <th>Appareil</th>
                          <th>Langue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentEvents.map((evt) => (
                          <tr
                            key={evt.id}
                            className={evt.id === newLiveEventId ? "row-live-highlight" : ""}
                          >
                            <td className="cell-mono cell-time">
                              {new Date(evt.created_at).toLocaleTimeString("fr-CH", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td>
                              <span className={`admin-badge-type badge-${evt.event_type}`}>
                                {evt.event_type}
                              </span>
                            </td>
                            <td className="cell-location">
                              <div>
                                {evt.country_code ? (
                                  <span>
                                    {getCountryFlag(evt.country_code)} {evt.city ? `${evt.city}` : ""}{evt.region ? ` (${evt.region})` : ""}, {evt.country_code}
                                  </span>
                                ) : (
                                  <span className="cell-muted">-</span>
                                )}
                              </div>
                              {(evt.organization || evt.isp) && (
                                <span className="cell-org-badge" title={evt.organization || evt.isp}>
                                  {evt.organization || evt.isp}
                                </span>
                              )}
                            </td>
                            <td className="cell-mono cell-path">{evt.page_path || "/"}</td>
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
                                evt.event_label || "-"
                              )}
                            </td>
                            <td className="cell-muted">{evt.device_type} · {evt.browser}</td>
                            <td className="cell-mono cell-muted">{evt.user_language || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
