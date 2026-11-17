import { useEffect, useState, useMemo, useCallback } from "react";
import { Modal } from "@mantine/core";
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
  IconX,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function AdminAnalytics({ opened, onClose }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Période sélectionnée : "24h", "7d", "30d", "all"
  const [timeRange, setTimeRange] = useState("7d");
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

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

  // Charger les données analytics depuis Supabase
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
      console.error("Erreur de récupération des analytics :", err);
    } finally {
      setLoadingData(false);
    }
  }, [session, timeRange]);

  useEffect(() => {
    if (opened && session) {
      fetchAnalytics();
    }
  }, [opened, session, fetchAnalytics]);

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

  // Calculs des métriques clés
  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const uniqueSessions = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
    const cvDownloads = events.filter((e) => e.event_type === "cv_download").length;
    const contactClicks = events.filter((e) => e.event_type === "contact_click").length;

    // Sources de trafic (Referrers)
    const referrersCount = {};
    events.forEach((e) => {
      const ref = e.referrer || "direct";
      referrersCount[ref] = (referrersCount[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(referrersCount)
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
      const b = e.browser || "Other";
      browserCount[b] = (browserCount[b] || 0) + 1;
    });

    return {
      pageViews,
      uniqueSessions,
      cvDownloads,
      contactClicks,
      topReferrers,
      deviceCount,
      browserCount,
      recentEvents: events.slice(0, 15),
    };
  }, [events]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="min(1080px, calc(100vw - 32px))"
      centered
      withCloseButton={false}
      padding={0}
      className="admin-analytics-modal"
      overlayProps={{ backgroundOpacity: 0.8, blur: 8 }}
      transitionProps={{ transition: "fade", duration: 240 }}
    >
      <div className="admin-panel">
        {/* En-tête du panel */}
        <div className="admin-header">
          <div className="admin-title-group">
            <span className="admin-badge">Admin</span>
            <h2>Statistiques du portfolio</h2>
            {isSupabaseConfigured && (
              <span className="admin-live-dot" title="Supabase configuré" />
            )}
          </div>
          <div className="admin-header-actions">
            {session && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={handleLogout}
                title="Déconnexion"
              >
                <IconLogout size={16} stroke={1.8} />
                <span>Déconnexion</span>
              </button>
            )}
            <button
              type="button"
              className="admin-close-btn"
              onClick={onClose}
              aria-label="Fermer"
            >
              <IconX size={18} stroke={1.8} />
            </button>
          </div>
        </div>

        {/* Corps du panel */}
        <div className="admin-body">
          {!isSupabaseConfigured ? (
            <div className="admin-config-notice">
              <IconAlertCircle size={32} stroke={1.6} />
              <h3>Configuration Supabase requise</h3>
              <p>
                Pour activer le suivi et le tableau de bord, créez un fichier{" "}
                <code>portfolio/.env</code> contenant vos identifiants Supabase :
              </p>
              <pre>
{`VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique`}
              </pre>
              <p className="admin-notice-sub">
                Pensez aussi à exécuter le script SQL fourni dans{" "}
                <code>portfolio/supabase_schema.sql</code> dans le SQL Editor de
                votre dashboard Supabase.
              </p>
            </div>
          ) : !session ? (
            /* Formulaire de connexion Admin */
            <div className="admin-login-wrapper">
              <div className="admin-login-box">
                <div className="admin-login-icon">
                  <IconLock size={28} stroke={1.8} />
                </div>
                <h3>Espace Administrateur</h3>
                <p>Connectez-vous avec vos identifiants Supabase Auth.</p>

                {authError && (
                  <div className="admin-error-box">
                    <IconAlertCircle size={16} stroke={2} />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="admin-form">
                  <div className="admin-input-group">
                    <label htmlFor="admin-email">Adresse e-mail</label>
                    <input
                      id="admin-email"
                      type="email"
                      required
                      placeholder="admin@kevivois.ch"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
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
                    className="admin-btn admin-btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Connexion..." : "Se connecter"}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Dashboard des statistiques */
            <div className="admin-dashboard">
              {/* Barre de contrôle / Filtres */}
              <div className="admin-toolbar">
                <div className="admin-time-filters">
                  {[
                    { id: "24h", label: "24 heures" },
                    { id: "7d", label: "7 jours" },
                    { id: "30d", label: "30 jours" },
                    { id: "all", label: "Tout" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`admin-filter-pill${
                        timeRange === t.id ? " is-active" : ""
                      }`}
                      onClick={() => setTimeRange(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={fetchAnalytics}
                  disabled={loadingData}
                  title="Actualiser les données"
                >
                  <IconRefresh
                    size={15}
                    stroke={1.8}
                    className={loadingData ? "spin-icon" : ""}
                  />
                  <span>Actualiser</span>
                </button>
              </div>

              {/* Cartes KPI */}
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon icon-views">
                    <IconEye size={20} stroke={1.8} />
                  </div>
                  <div className="admin-kpi-info">
                    <span className="admin-kpi-label">Vues de page</span>
                    <strong className="admin-kpi-value">{stats.pageViews}</strong>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon icon-users">
                    <IconUsers size={20} stroke={1.8} />
                  </div>
                  <div className="admin-kpi-info">
                    <span className="admin-kpi-label">Visiteurs uniques</span>
                    <strong className="admin-kpi-value">
                      {stats.uniqueSessions}
                    </strong>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon icon-cv">
                    <IconFileDownload size={20} stroke={1.8} />
                  </div>
                  <div className="admin-kpi-info">
                    <span className="admin-kpi-label">Téléchargements CV</span>
                    <strong className="admin-kpi-value">
                      {stats.cvDownloads}
                    </strong>
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon icon-contact">
                    <IconMail size={20} stroke={1.8} />
                  </div>
                  <div className="admin-kpi-info">
                    <span className="admin-kpi-label">Clics contact</span>
                    <strong className="admin-kpi-value">
                      {stats.contactClicks}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Deux colonnes d'analyse détaillée */}
              <div className="admin-analytics-columns">
                {/* Sources de trafic */}
                <div className="admin-analytics-box">
                  <h4>
                    <IconWorld size={17} stroke={1.8} />
                    <span>Principales sources de trafic (Referrers)</span>
                  </h4>
                  {stats.topReferrers.length === 0 ? (
                    <p className="admin-empty-state">Aucune donnée sur la période.</p>
                  ) : (
                    <ul className="admin-breakdown-list">
                      {stats.topReferrers.map(([ref, count]) => {
                        const total = events.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <li key={ref}>
                            <div className="admin-list-meta">
                              <span className="admin-ref-name">
                                {ref === "direct" ? "Accès direct" : ref}
                              </span>
                              <span className="admin-ref-count">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="admin-bar-track">
                              <div
                                className="admin-bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Répartition par Appareil */}
                <div className="admin-analytics-box">
                  <h4>
                    <IconDeviceDesktop size={17} stroke={1.8} />
                    <span>Appareils & Écrans</span>
                  </h4>
                  <div className="admin-device-stats">
                    {[
                      {
                        key: "desktop",
                        label: "Ordinateurs",
                        icon: <IconDeviceDesktop size={16} stroke={1.8} />,
                        val: stats.deviceCount.desktop,
                      },
                      {
                        key: "mobile",
                        label: "Mobiles",
                        icon: <IconDeviceMobile size={16} stroke={1.8} />,
                        val: stats.deviceCount.mobile,
                      },
                      {
                        key: "tablet",
                        label: "Tablettes",
                        icon: <IconDeviceMobile size={16} stroke={1.8} />,
                        val: stats.deviceCount.tablet,
                      },
                    ].map((item) => {
                      const total =
                        stats.deviceCount.desktop +
                          stats.deviceCount.mobile +
                          stats.deviceCount.tablet || 1;
                      const pct = Math.round((item.val / total) * 100);
                      return (
                        <div className="admin-device-row" key={item.key}>
                          <div className="admin-device-label">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          <strong>
                            {item.val} ({pct}%)
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Flux d'activité récent en direct */}
              <div className="admin-analytics-box admin-feed-box">
                <h4>
                  <IconCheck size={17} stroke={1.8} />
                  <span>Dernières activités enregistrées</span>
                </h4>
                {stats.recentEvents.length === 0 ? (
                  <p className="admin-empty-state">Aucun événement récent.</p>
                ) : (
                  <div className="admin-events-table-wrapper">
                    <table className="admin-events-table">
                      <thead>
                        <tr>
                          <th>Date / Heure</th>
                          <th>Événement</th>
                          <th>Page / Cible</th>
                          <th>Détail / Label</th>
                          <th>Appareil</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentEvents.map((evt) => (
                          <tr key={evt.id}>
                            <td className="cell-time">
                              {new Date(evt.created_at).toLocaleTimeString("fr-CH", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td>
                              <span className={`admin-event-badge badge-${evt.event_type}`}>
                                {evt.event_type}
                              </span>
                            </td>
                            <td className="cell-page">{evt.page_path || "/"}</td>
                            <td className="cell-label">{evt.event_label || "-"}</td>
                            <td>{evt.device_type} · {evt.browser}</td>
                            <td className="cell-ref">{evt.referrer || "direct"}</td>
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
      </div>
    </Modal>
  );
}
