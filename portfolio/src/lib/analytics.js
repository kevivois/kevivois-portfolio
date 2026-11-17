import { supabase, isSupabaseConfigured } from "./supabase";

// Récupération ou génération d'un ID de session éphémère (stocké dans sessionStorage, sans cookie)
function getSessionId() {
  if (typeof window === "undefined") return "server";
  let sessionId = sessionStorage.getItem("kv_analytics_sid");
  if (!sessionId) {
    sessionId = "s_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    sessionStorage.setItem("kv_analytics_sid", sessionId);
  }
  return sessionId;
}

// Détection de l'appareil
function getDeviceType() {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    return "mobile";
  }
  return window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
}

// Détection du navigateur
function getBrowser() {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR/")) return "Opera";
  return "Other";
}

// Détection du système d'exploitation
function getOS() {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

// Nettoyage du référent (d'où vient le visiteur)
function getCleanReferrer() {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const url = new URL(document.referrer);
    if (url.hostname === window.location.hostname) return "internal";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "other";
  }
}

// Détection ou inférence de la localisation (pays, code pays, ville, canton, ISP, entreprise)
let cachedGeo = null;
async function getGeoLocation() {
  if (typeof window === "undefined") {
    return {
      country: null,
      country_code: null,
      city: null,
      region: null,
      postal: null,
      latitude: null,
      longitude: null,
      isp: null,
      organization: null,
    };
  }
  if (cachedGeo) return cachedGeo;

  // 1. Cache en session
  const saved = sessionStorage.getItem("kv_analytics_geo");
  if (saved) {
    try {
      cachedGeo = JSON.parse(saved);
      return cachedGeo;
    } catch {}
  }

  // 2. Fallback par défaut basé sur le fuseau horaire
  let fallbackGeo = {
    country: "Suisse",
    country_code: "CH",
    city: "Valais",
    region: "Valais",
    postal: "1950",
    latitude: 46.233,
    longitude: 7.36,
    isp: "Opérateur suisse",
    organization: null,
  };
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Zurich"))
      fallbackGeo = { ...fallbackGeo, city: "Zurich", region: "Zurich", latitude: 47.3769, longitude: 8.5417 };
    else if (tz.includes("Paris"))
      fallbackGeo = { country: "France", country_code: "FR", city: "Paris", region: "Île-de-France", postal: "75000", latitude: 48.8566, longitude: 2.3522, isp: "Opérateur français", organization: null };
    else if (tz.includes("Berlin"))
      fallbackGeo = { country: "Allemagne", country_code: "DE", city: "Berlin", region: "Berlin", postal: "10115", latitude: 52.52, longitude: 13.405, isp: "Opérateur allemand", organization: null };
    else if (tz.includes("London"))
      fallbackGeo = { country: "Royaume-Uni", country_code: "GB", city: "Londres", region: "Greater London", postal: "SW1A", latitude: 51.5074, longitude: -0.1278, isp: "Opérateur UK", organization: null };
  } catch {}

  // 3. Appel de l'API ipwho.is (timeout 1.2s max pour ne pas ralentir le site)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        cachedGeo = {
          country: data.country || fallbackGeo.country,
          country_code: data.country_code || fallbackGeo.country_code,
          city: data.city || fallbackGeo.city,
          region: data.region || null,
          postal: data.postal || null,
          latitude: typeof data.latitude === "number" ? data.latitude : fallbackGeo.latitude,
          longitude: typeof data.longitude === "number" ? data.longitude : fallbackGeo.longitude,
          isp: data.connection?.isp || null,
          organization: data.connection?.org || data.connection?.isp || null,
        };
        sessionStorage.setItem("kv_analytics_geo", JSON.stringify(cachedGeo));
        return cachedGeo;
      }
    }
  } catch {}

  cachedGeo = fallbackGeo;
  sessionStorage.setItem("kv_analytics_geo", JSON.stringify(cachedGeo));
  return cachedGeo;
}

// Récupération de la langue préférée de l'utilisateur
function getUserLanguage() {
  if (typeof navigator === "undefined") return "fr";
  return navigator.language || navigator.userLanguage || "fr";
}

// Cache local de l'état admin pour éviter les vérifications répétées
let isAdminCached = null;

if (typeof window !== "undefined" && isSupabaseConfigured && supabase) {
  // Synchronisation initiale
  supabase.auth.getSession().then(({ data: { session } }) => {
    isAdminCached = Boolean(session && session.user);
  }).catch(() => {
    isAdminCached = false;
  });

  // Mise à jour continue
  supabase.auth.onAuthStateChange((_event, session) => {
    isAdminCached = Boolean(session && session.user);
  });
}

// Vérification de la session administrateur (si connecté, on n'enregistre rien)
export async function isAdminAuthenticated() {
  if (!isSupabaseConfigured || !supabase) return false;
  if (isAdminCached !== null) return isAdminCached;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    isAdminCached = Boolean(session && session.user);
    return isAdminCached;
  } catch {
    return false;
  }
}

// Fonction centrale d'envoi d'événement
export async function trackEvent(eventType, eventLabel = null, pagePath = null, extra = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  try {
    // Si l'administrateur est connecté, ignorer l'événement pour ne pas fausser les statistiques
    const isAdmin = await isAdminAuthenticated();
    if (isAdmin) {
      return;
    }

    const geo = await getGeoLocation();

    const payload = {
      event_type: eventType,
      event_label: eventLabel,
      page_path: pagePath || window.location.pathname + window.location.hash,
      referrer: getCleanReferrer(),
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_res: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : null,
      session_id: getSessionId(),
      country: geo.country,
      country_code: geo.country_code,
      city: geo.city,
      region: geo.region,
      postal: geo.postal,
      latitude: geo.latitude,
      longitude: geo.longitude,
      isp: geo.isp,
      organization: geo.organization,
      user_language: getUserLanguage(),
      duration_seconds: extra.duration_seconds || null,
      scroll_depth: extra.scroll_depth || null,
    };

    // Envoi asynchrone non-bloquant
    await supabase.from("analytics_events").insert([payload]);
  } catch (error) {
    console.debug("Analytics trackEvent notice:", error);
  }
}

// Initialisateur automatique du suivi de l'engagement (durée, scroll, clics externes)
export function initEngagementTracking() {
  if (typeof window === "undefined") return () => {};

  const startTime = Date.now();
  let maxScroll = 0;
  const milestonesReached = new Set();

  // 1. Suivi continu du scroll
  const handleScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const currentPercent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    if (currentPercent > maxScroll) {
      maxScroll = currentPercent;
    }

    // Jalons significatifs de lecture : 25%, 50%, 75%, 100%
    [25, 50, 75, 100].forEach((milestone) => {
      if (currentPercent >= milestone && !milestonesReached.has(milestone)) {
        milestonesReached.add(milestone);
        trackEvent("scroll_depth", `${milestone}%`, window.location.pathname, {
          scroll_depth: milestone,
        });
      }
    });
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // 2. Envoi du temps passé à la sortie ou changement d'onglet
  let pingSent = false;
  const sendTimeSpent = () => {
    if (pingSent) return;
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    // Enregistrer seulement si le visiteur est resté au moins 3 secondes
    if (elapsedSeconds >= 3) {
      pingSent = true;
      trackEvent("session_ping", `${elapsedSeconds}s (scroll ${maxScroll}%)`, window.location.pathname, {
        duration_seconds: elapsedSeconds,
        scroll_depth: maxScroll,
      });
    }
  };

  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      sendTimeSpent();
    }
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", sendTimeSpent);

  // 3. Détection automatique des clics sur les liens sortants
  const handleClick = (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";

    if (href.includes("github.com")) {
      trackEvent("outbound_click", "GitHub");
    } else if (href.includes("linkedin.com")) {
      trackEvent("outbound_click", "LinkedIn");
    } else if (href.endsWith(".pdf") || href.includes("cv") || link.hasAttribute("download")) {
      trackEvent("cv_download", "CV PDF");
    } else if (href.startsWith("mailto:")) {
      trackEvent("contact_click", "Email mailto");
    } else if (href.startsWith("http") && !href.includes(window.location.hostname)) {
      try {
        const domain = new URL(href).hostname.replace(/^www\./, "");
        trackEvent("outbound_click", domain);
      } catch {}
    }
  };

  document.addEventListener("click", handleClick, { capture: true });

  return () => {
    window.removeEventListener("scroll", handleScroll);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", sendTimeSpent);
    document.removeEventListener("click", handleClick, { capture: true });
  };
}

// Événements prédéfinis pour le portfolio
export const analytics = {
  pageView: (path) => trackEvent("page_view", null, path),
  cvDownload: (label = "CV PDF") => trackEvent("cv_download", label),
  contactClick: (channel) => trackEvent("contact_click", channel),
  langChange: (fromLang, toLang) => trackEvent("lang_change", `${fromLang} -> ${toLang}`),
  projectClick: (projectName, linkType) => trackEvent("project_click", `${projectName} (${linkType})`),
  trackClick: (label, extra) => trackEvent("custom_click", label, window.location.pathname, extra),
};
