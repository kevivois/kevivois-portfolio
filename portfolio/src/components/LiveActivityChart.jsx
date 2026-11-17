import { useMemo, useState, useRef } from "react";
import { IconActivity, IconTrendingUp, IconFilter, IconEye, IconCursorText, IconClick } from "@tabler/icons-react";

export function LiveActivityChart({ events, timeRange }) {
  const [metricFilter, setMetricFilter] = useState("all"); // "all", "page_view", "interaction"
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredMinute, setHoveredMinute] = useState(null);
  const svgRef = useRef(null);

  // Filtrage selon le type d'événement choisi
  const filteredEvents = useMemo(() => {
    if (metricFilter === "page_view") {
      return events.filter((e) => e.event_type === "page_view");
    }
    if (metricFilter === "interaction") {
      return events.filter((e) => e.event_type !== "page_view");
    }
    return events;
  }, [events, metricFilter]);

  // 1. Calcul des 30 dernières minutes pour le pulse en direct
  const last30MinutesData = useMemo(() => {
    const now = Date.now();
    const minuteSlots = Array.from({ length: 30 }, (_, i) => {
      const minuteStart = now - (29 - i) * 60 * 1000;
      return {
        minuteIndex: i,
        timeLabel: new Date(minuteStart).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }),
        timestamp: minuteStart,
        count: 0,
      };
    });

    filteredEvents.forEach((evt) => {
      const evtTime = new Date(evt.created_at).getTime();
      const diffMs = now - evtTime;
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins >= 0 && diffMins < 30) {
        const slotIdx = 29 - diffMins;
        if (minuteSlots[slotIdx]) {
          minuteSlots[slotIdx].count++;
        }
      }
    });

    return minuteSlots;
  }, [filteredEvents]);

  // 2. Calcul des créneaux temporels selon la période sélectionnée
  const timelineData = useMemo(() => {
    if (!filteredEvents.length) return [];

    const now = new Date();
    let slots = [];

    if (timeRange === "24h") {
      // 24 créneaux d'1 heure
      slots = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now.getTime() - (23 - i) * 3600 * 1000);
        const hour = d.getHours();
        return {
          key: `${hour}h`,
          shortLabel: `${hour}h`,
          fullLabel: `Aujourd'hui à ${hour}:00 - ${hour}:59`,
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour + 1).getTime(),
          count: 0,
          views: 0,
          clicks: 0,
        };
      });
    } else if (timeRange === "7d") {
      // 7 jours
      slots = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 86400 * 1000);
        const dayStr = d.toLocaleDateString("fr-CH", { weekday: "short", day: "numeric", month: "short" });
        return {
          key: d.toISOString().slice(0, 10),
          shortLabel: d.toLocaleDateString("fr-CH", { weekday: "short", day: "numeric" }),
          fullLabel: dayStr,
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          count: 0,
          views: 0,
          clicks: 0,
        };
      });
    } else {
      // 14 à 30 jours
      const daysCount = timeRange === "30d" ? 30 : 14;
      slots = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(now.getTime() - (daysCount - 1 - i) * 86400 * 1000);
        return {
          key: d.toISOString().slice(0, 10),
          shortLabel: d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" }),
          fullLabel: d.toLocaleDateString("fr-CH", { weekday: "short", day: "numeric", month: "long" }),
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          count: 0,
          views: 0,
          clicks: 0,
        };
      });
    }

    filteredEvents.forEach((evt) => {
      const evtTime = new Date(evt.created_at).getTime();
      const slot = slots.find((s) => evtTime >= s.timeStart && evtTime < s.timeEnd);
      if (slot) {
        slot.count++;
        if (evt.event_type === "page_view") slot.views++;
        else slot.clicks++;
      }
    });

    return slots;
  }, [filteredEvents, timeRange]);

  // Génération des coordonnées du tracé SVG
  const { pathD, areaD, points, maxVal, totalVisits } = useMemo(() => {
    if (!timelineData.length) {
      return { pathD: "", areaD: "", points: [], maxVal: 1, totalVisits: 0 };
    }

    const counts = timelineData.map((d) => d.count);
    const sum = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(...counts, 3);
    const width = 640;
    const height = 180;
    const paddingX = 28;
    const paddingY = 24;

    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const pts = timelineData.map((d, i) => {
      const x = paddingX + (i / Math.max(1, timelineData.length - 1)) * innerW;
      const y = paddingY + innerH - (d.count / max) * innerH;
      return {
        x,
        y,
        shortLabel: d.shortLabel,
        fullLabel: d.fullLabel,
        count: d.count,
        views: d.views,
        clicks: d.clicks,
      };
    });

    if (pts.length < 2) {
      return { pathD: "", areaD: "", points: pts, maxVal: max, totalVisits: sum };
    }

    // Calcul de courbe spline bezier naturelle
    let dStr = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dStr += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const baseY = paddingY + innerH;
    const areaStr = `${dStr} L ${lastPt.x} ${baseY} L ${firstPt.x} ${baseY} Z`;

    return { pathD: dStr, areaD: areaStr, points: pts, maxVal: max, totalVisits: sum };
  }, [timelineData]);

  // Détection fluide au survol n'importe où sur le graphique (scrubbing sans effort)
  const handleSvgMouseMove = (e) => {
    if (!svgRef.current || !points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseRatio = (e.clientX - rect.left) / rect.width;
    const virtualX = mouseRatio * 640; // mapped to SVG viewBox width (640)

    // Trouver le point le plus proche sur l'axe X
    let closest = points[0];
    let minDiff = Math.abs(points[0].x - virtualX);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].x - virtualX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }
    setHoveredPoint(closest);
  };

  const handleSvgMouseLeave = () => {
    setHoveredPoint(null);
  };

  const maxPulse = Math.max(...last30MinutesData.map((m) => m.count), 2);
  const activePoint = hoveredPoint || (points.length ? points[points.length - 1] : null);

  const timeRangeLabels = {
    "24h": "Dernières 24 heures",
    "7d": "7 derniers jours",
    "30d": "30 derniers jours",
    all: "Historique complet",
  };

  return (
    <div className="admin-charts-section">
      <div className="section-heading chart-master-head">
        <div>
          <h3 className="admin-panel-title">Activité &amp; Évolution</h3>
          <span className="section-aside">Survolez la courbe pour inspecter chaque instant</span>
        </div>

        {/* Sélecteur de métrique */}
        <div className="chart-metric-switcher" role="group" aria-label="Filtrer les métriques">
          <button
            type="button"
            className={`metric-pill-btn${metricFilter === "all" ? " is-active" : ""}`}
            onClick={() => setMetricFilter("all")}
          >
            Tous ({events.length})
          </button>
          <button
            type="button"
            className={`metric-pill-btn${metricFilter === "page_view" ? " is-active" : ""}`}
            onClick={() => setMetricFilter("page_view")}
          >
            Pages vues
          </button>
          <button
            type="button"
            className={`metric-pill-btn${metricFilter === "interaction" ? " is-active" : ""}`}
            onClick={() => setMetricFilter("interaction")}
          >
            Clics &amp; Actions
          </button>
        </div>
      </div>

      <div className="admin-charts-grid">
        {/* Graphique principal : Courbe de tendance avec scrubbing interactif */}
        <div className="admin-chart-box main-timeline-box">
          <div className="chart-box-head">
            <div className="chart-highlight-display">
              {hoveredPoint ? (
                <>
                  <span className="chart-number-focus">{hoveredPoint.count}</span>
                  <div className="chart-meta-focus">
                    <strong>{hoveredPoint.count > 1 ? "événements enregistrés" : "événement enregistré"}</strong>
                    <span>{hoveredPoint.fullLabel}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="chart-number-focus">{totalVisits}</span>
                  <div className="chart-meta-focus">
                    <strong>Total ({timeRangeLabels[timeRange] || timeRange})</strong>
                    <span>Glissez la souris sur la courbe pour explorer</span>
                  </div>
                </>
              )}
            </div>

            <div className="chart-legend-tag">
              <span className="legend-indicator-line" />
              <span>Pic : {maxVal}</span>
            </div>
          </div>

          <div
            className="svg-chart-container"
            ref={svgRef}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={handleSvgMouseLeave}
          >
            <svg viewBox="0 0 640 180" className="admin-activity-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="activityGradSmooth" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#245b46" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#245b46" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Lignes horizontales de repère */}
              <line x1="28" y1="24" x2="612" y2="24" stroke="var(--line)" strokeDasharray="4 4" opacity="0.6" />
              <line x1="28" y1="92" x2="612" y2="92" stroke="var(--line)" strokeDasharray="4 4" opacity="0.6" />
              <line x1="28" y1="160" x2="612" y2="160" stroke="var(--line)" strokeWidth="1" />

              {/* Remplissage de l'aire sous la courbe */}
              {areaD && <path d={areaD} fill="url(#activityGradSmooth)" />}

              {/* Courbe verte accentuée */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#245b46"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Ligne repère verticale sous le curseur */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1="16"
                  x2={hoveredPoint.x}
                  y2="160"
                  stroke="var(--ink)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />
              )}

              {/* Points sur la courbe */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPoint === pt;
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : pt.count > 0 ? 3.5 : 2}
                    fill={isHovered ? "#17231e" : pt.count > 0 ? "#245b46" : "var(--line)"}
                    stroke="var(--paper)"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
                  />
                );
              })}

              {/* Halo d'accentuation sur le point actif */}
              {hoveredPoint && (
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="12"
                  fill="rgba(36, 91, 70, 0.22)"
                  stroke="#245b46"
                  strokeWidth="1"
                  className="pulse-halo"
                />
              )}
            </svg>

            {/* Bulle flottante au-dessus du curseur */}
            {hoveredPoint && (
              <div
                className="chart-cursor-bubble"
                style={{
                  left: `${(hoveredPoint.x / 640) * 100}%`,
                  top: `${Math.max(10, hoveredPoint.y - 14)}px`,
                }}
              >
                <strong>{hoveredPoint.count} visite{hoveredPoint.count > 1 ? "s" : ""}</strong>
                <span>{hoveredPoint.shortLabel}</span>
              </div>
            )}
          </div>

          {/* Axe X des dates / heures */}
          <div className="chart-x-labels">
            {timelineData
              .filter((_, i) => i % Math.ceil(timelineData.length / 6) === 0 || i === timelineData.length - 1)
              .map((s, i) => (
                <span key={i} className="chart-axis-label">{s.shortLabel}</span>
              ))}
          </div>
        </div>

        {/* Graphique secondaire : Pulse 30 minutes avec inspection minute par minute */}
        <div className="admin-chart-box live-pulse-box">
          <div className="chart-box-head">
            <div className="pulse-title-wrap">
              <span className="live-mini-dot" />
              <strong>Temps réel (30 min)</strong>
            </div>
            <span className="chart-box-meta">
              {hoveredMinute ? `${hoveredMinute.timeLabel}` : "En direct"}
            </span>
          </div>

          <div className="pulse-inspector-banner">
            {hoveredMinute ? (
              <span className="pulse-inspected-stat">
                <strong>{hoveredMinute.count}</strong> événement{hoveredMinute.count > 1 ? "s" : ""} à {hoveredMinute.timeLabel}
              </span>
            ) : (
              <span className="pulse-inspected-stat is-idle">
                Passez la souris sur une colonne
              </span>
            )}
          </div>

          <div className="pulse-bars-wrapper">
            <div className="pulse-bars-container" onMouseLeave={() => setHoveredMinute(null)}>
              {last30MinutesData.map((m) => {
                const heightPct = Math.max(8, (m.count / maxPulse) * 100);
                const hasVisits = m.count > 0;
                const isCurrentHover = hoveredMinute === m;

                return (
                  <div
                    key={m.minuteIndex}
                    className={`pulse-bar-col${isCurrentHover ? " is-hovered" : ""}`}
                    onMouseEnter={() => setHoveredMinute(m)}
                  >
                    <div
                      className={`pulse-bar-fill${hasVisits ? " is-active" : ""}${isCurrentHover ? " is-focused" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="pulse-bars-labels">
              <span>-30 min</span>
              <span className="pulse-now-label"><span className="live-mini-dot" /> Maintenant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
