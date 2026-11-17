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

  // 2. Appel de l'API ipwho.is (timeout 1.5s max pour ne pas ralentir le chargement)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        cachedGeo = {
          country: data.country || null,
          country_code: data.country_code || null,
          city: data.city || null,
          region: data.region || null,
          postal: data.postal || null,
          latitude: typeof data.latitude === "number" ? data.latitude : null,
          longitude: typeof data.longitude === "number" ? data.longitude : null,
          isp: data.connection?.isp || null,
          organization: data.connection?.org || data.connection?.isp || null,
        };
        sessionStorage.setItem("kv_analytics_geo", JSON.stringify(cachedGeo));
        return cachedGeo;
      }
    }
  } catch {}

  // En cas d'échec ou d'adblocker : AUCUN fallback artificiel pour ne pas fausser les métriques réelles
  cachedGeo = {
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
  sessionStorage.setItem("kv_analytics_geo", JSON.stringify(cachedGeo));
  return cachedGeo;
}

// Classification : Vraie entreprise / institution vs FAI grand public (Wi-Fi résidentiel)
const CONSUMER_ISP_PATTERNS = [
  "swisscom", "sunrise", "salt mobile", "salt communication", "orange", "free sas", 
  "iliad", "bouygues", "sfr", "telecom", "telekom", "vodafone", "comcast", "verizon", 
  "charter", "spectrum", "at&t", "vtx", "init7", "quickline", "upc", "cablecom", 
  "netplus", "postluxembourg", "proximus", "kpn", "ziggo", "virgin media", "bt ", 
  "o2", "t-mobile", "telefonica", "fastweb", "wind tre", "tim ", "opérateur", "residential"
];

export function isLikelyCompany(org, isp) {
  const target = (org || isp || "").trim().toLowerCase();
  if (!target || target === "unknown" || target.includes("opérateur")) return null;
  const isConsumerIsp = CONSUMER_ISP_PATTERNS.some((pattern) => target.includes(pattern));
  return !isConsumerIsp;
}

// Détection de la connectivité réseau (4G/5G, débit, latence)
function getNetworkConnection() {
  if (typeof navigator === "undefined" || !navigator.connection) return null;
  const conn = navigator.connection;
  const type = conn.effectiveType ? conn.effectiveType.toUpperCase() : null;
  const speed = conn.downlink ? `${conn.downlink} Mbps` : null;
  const rtt = conn.rtt ? `${conn.rtt}ms` : null;
  if (type && speed && rtt) return `${type} (${speed}, ${rtt})`;
  if (type && speed) return `${type} (${speed})`;
  if (type) return type;
  return null;
}

// Détection du paramètre de campagne (?ref=... ou ?utm_source=...)
function getCampaignRef() {
  if (typeof window === "undefined") return null;
  const saved = sessionStorage.getItem("kv_analytics_ref");
  if (saved) return saved;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("utm_source") || params.get("from") || params.get("source");
    if (ref) {
      sessionStorage.setItem("kv_analytics_ref", ref);
      return ref;
    }
  } catch {}
  return null;
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

// Détection de l'environnement de développement local (localhost, 127.0.0.1, Vite dev)
export function isDevEnvironment() {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    window.location.port === "5173" ||
    window.location.port === "3000"
  );
}

// Vérifie si un chemin ou un libellé correspond à l'espace admin ou au login
function isAdminRelated(path, label) {
  const p = (path || "").toLowerCase();
  const l = (label || "").toLowerCase();
  if (p.includes("admin") || p.includes("login") || p.includes("auth")) return true;
  if (l.includes("admin") || l.includes("login") || l.includes("connexion") || l.includes("authentification")) return true;
  return false;
}

// Fonction centrale d'envoi d'événement
export async function trackEvent(eventType, eventLabel = null, pagePath = null, extra = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  try {
    // 0. Ne JAMAIS tracker en environnement de développement local (évite de polluer les vraies stats)
    if (isDevEnvironment()) {
      return;
    }

    // 1. Ne JAMAIS tracker quoi que ce soit sur l'admin ou le login
    if (typeof window !== "undefined") {
      const curPath = (window.location.pathname || "").toLowerCase();
      const curHash = (window.location.hash || "").toLowerCase();
      if (curPath.includes("admin") || curHash.includes("admin")) {
        return;
      }
    }

    // 2. Ne JAMAIS tracker un événement dont la page cible ou le libellé concerne l'admin ou le login
    if (isAdminRelated(pagePath, eventLabel)) {
      return;
    }

    // 3. Si l'administrateur est connecté, ignorer l'événement pour ne pas fausser les statistiques
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
      is_company: isLikelyCompany(geo.organization, geo.isp),
      connection_type: getNetworkConnection(),
      campaign_ref: getCampaignRef(),
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

  // Ne jamais activer le suivi en développement local (localhost / Vite dev)
  if (isDevEnvironment()) {
    return () => {};
  }

  // Ne jamais activer le suivi d'engagement si l'utilisateur est sur l'admin ou le login
  const curPath = (window.location.pathname || "").toLowerCase();
  const curHash = (window.location.hash || "").toLowerCase();
  if (curPath.includes("admin") || curHash.includes("admin")) {
    return () => {};
  }

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

  // 3. Détection automatique des clics sur n'importe quel lien et agrandissements d'images
  const handleClick = (e) => {
    // A. Ignorer immédiatement tout clic menant à l'espace admin ou au login
    const adminTrigger = e.target.closest("a[href*='admin'], .admin-trigger-link, .header-admin-pill, [data-admin]");
    if (adminTrigger) {
      return;
    }

    // B. Détection des clics sur les images / agrandissements
    const imgEl = e.target.closest("img, button[aria-haspopup='dialog'], .passion-photo, .project-preview");
    if (imgEl) {
      const img = imgEl.tagName === "IMG" ? imgEl : imgEl.querySelector("img");
      const label = img?.alt || imgEl.getAttribute("aria-label") || imgEl.title || "Image";
      trackEvent("image_zoom", `Zoom : ${label}`);
      return;
    }

    // C. Détection de TOUS les liens <a>
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const text = link.innerText?.trim() || link.getAttribute("aria-label") || href;

    if (href.toLowerCase().includes("admin") || text.toLowerCase().includes("admin")) {
      return;
    }

    if (href.includes("github.com")) {
      trackEvent("outbound_click", "GitHub");
    } else if (href.includes("linkedin.com")) {
      trackEvent("outbound_click", "LinkedIn");
    } else if (href.endsWith(".pdf") || href.includes("cv") || link.hasAttribute("download")) {
      trackEvent("cv_download", "CV PDF");
    } else if (href.startsWith("mailto:")) {
      trackEvent("contact_click", "Email mailto");
    } else if (href.startsWith("#")) {
      // Lien d'ancrage / navigation interne (ex: #projets, #competences)
      trackEvent("nav_click", `Menu : ${href.replace("#", "")}`);
    } else if (href.startsWith("http") && !href.includes(window.location.hostname)) {
      try {
        const domain = new URL(href).hostname.replace(/^www\./, "");
        trackEvent("outbound_click", `${text} (${domain})`);
      } catch {
        trackEvent("outbound_click", text);
      }
    } else if (href) {
      trackEvent("link_click", text);
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

// Algorithme d'évaluation de l'indice d'humanité (Human Confidence Score)
export function computeHumanScore(event) {
  if (!event) return { score: 50, label: "Indéterminé", level: "neutral", reasons: [] };

  let score = 40; // Base neutre de départ
  const reasons = [];

  const org = (event.organization || event.isp || "").toLowerCase();
  const evtType = event.event_type || "";
  const duration = typeof event.duration_seconds === "number" ? event.duration_seconds : 0;
  const scroll = typeof event.scroll_depth === "number" ? event.scroll_depth : 0;
  const res = event.screen_res || "";

  // 1. Analyse du réseau et de l'hébergeur (-40% si datacenter / robot scraper)
  const datacenterKeywords = [
    "amazon", "aws", "google cloud", "microsoft azure", "azure", "hetzner",
    "digitalocean", "ovh", "linode", "oracle cloud", "vultr", "alibaba",
    "cloudflare", "fastly", "data center", "hosting", "server", "scaleway"
  ];
  const isDatacenter = datacenterKeywords.some((kw) => org.includes(kw));

  if (isDatacenter) {
    score -= 40;
    reasons.push({
      text: `Hébergement Datacenter / Cloud bot (${event.organization || event.isp})`,
      delta: -40,
      type: "negative",
    });
  } else if (org) {
    score += 15;
    reasons.push({
      text: `Réseau résidentiel / FAI grand public (${event.organization || event.isp})`,
      delta: +15,
      type: "positive",
    });
  }

  // 2. Comportement physique : Durée passée sur la page
  if (duration >= 15) {
    score += 25;
    reasons.push({
      text: `Temps de lecture significatif (${duration}s)`,
      delta: +25,
      type: "positive",
    });
  } else if (duration >= 5) {
    score += 15;
    reasons.push({
      text: `Visite active (${duration}s)`,
      delta: +15,
      type: "positive",
    });
  } else if (duration > 0 && duration < 3) {
    score -= 10;
    reasons.push({
      text: `Déconnexion quasi immédiate (${duration}s)`,
      delta: -10,
      type: "negative",
    });
  }

  // 3. Comportement physique : Profondeur de scroll
  if (scroll >= 50) {
    score += 25;
    reasons.push({
      text: `Lecture approfondie du portfolio (scroll ${scroll}%)`,
      delta: +25,
      type: "positive",
    });
  } else if (scroll >= 25) {
    score += 15;
    reasons.push({
      text: `Défilement partiel de la page (scroll ${scroll}%)`,
      delta: +15,
      type: "positive",
    });
  }

  // 4. Actions intentionnelles et clics humains
  if (["image_zoom", "cv_download", "contact_click", "outbound_click"].includes(evtType)) {
    score += 30;
    const actionLabel =
      evtType === "cv_download"
        ? "Téléchargement de CV"
        : evtType === "image_zoom"
        ? "Zoom photo / projet"
        : evtType === "contact_click"
        ? "Prise de contact / Copie email"
        : "Clic sur lien externe (GitHub / LinkedIn)";
    reasons.push({
      text: `Action volontaire humaine : ${actionLabel}`,
      delta: +30,
      type: "positive",
    });
  }

  // 5. Résolution d'écran et appareil
  if (res && res !== "800x600" && res !== "1024x768" && !res.includes("0x0")) {
    score += 10;
    reasons.push({
      text: `Résolution d'écran physique (${res})`,
      delta: +10,
      type: "positive",
    });
  } else if (res === "800x600" || res === "0x0") {
    score -= 20;
    reasons.push({
      text: `Résolution suspecte typique des scripts headless (${res})`,
      delta: -20,
      type: "negative",
    });
  }

  // 6. Langue du navigateur
  if (event.user_language && event.user_language !== "unknown") {
    score += 5;
  }

  // Borner entre 5% et 99%
  const finalScore = Math.max(5, Math.min(99, score));

  let label = "Humain vérifié";
  let level = "high"; // green
  if (finalScore >= 80) {
    label = "Humain vérifié";
    level = "high";
  } else if (finalScore >= 60) {
    label = "Humain probable";
    level = "medium";
  } else if (finalScore >= 40) {
    label = "Incertain / Neutre";
    level = "neutral";
  } else {
    label = "Robot / Crawler suspect";
    level = "low";
  }

  return { score: finalScore, label, level, reasons };
}

// Événements prédéfinis pour le portfolio
export const analytics = {
  pageView: (path) => trackEvent("page_view", null, path),
  imageZoom: (imageName) => trackEvent("image_zoom", `Zoom : ${imageName}`),
  cvDownload: (label = "CV PDF") => trackEvent("cv_download", label),
  contactClick: (channel) => trackEvent("contact_click", channel),
  langChange: (fromLang, toLang) => trackEvent("lang_change", `${fromLang} -> ${toLang}`),
  projectClick: (projectName, linkType) => trackEvent("project_click", `${projectName} (${linkType})`),
  trackClick: (label, extra) => trackEvent("custom_click", label, window.location.pathname, extra),
};
