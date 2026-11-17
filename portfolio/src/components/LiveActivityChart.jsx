import { useMemo, useState } from "react";
import { IconActivity, IconTrendingUp, IconWifi, IconBuilding, IconHome } from "@tabler/icons-react";

export function LiveActivityChart({ events, timeRange }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

    events.forEach((evt) => {
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
  }, [events]);

  // 2. Calcul des points de la courbe selon la période sélectionnée
  const timelineData = useMemo(() => {
    if (!events.length) return [];

    const now = new Date();
    let slots = [];

    if (timeRange === "24h") {
      // 24 créneaux d'1 heure
      slots = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now.getTime() - (23 - i) * 3600 * 1000);
        return {
          key: `${d.getHours()}h`,
          label: `${d.getHours()}:00`,
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime(),
          count: 0,
        };
      });
    } else if (timeRange === "7d") {
      // 7 jours
      slots = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 86400 * 1000);
        return {
          key: d.toLocaleDateString("fr-CH", { weekday: "short" }),
          label: d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" }),
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          count: 0,
        };
      });
    } else {
      // 14 créneaux pour 30 jours ou historique
      const daysCount = timeRange === "30d" ? 30 : 14;
      slots = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(now.getTime() - (daysCount - 1 - i) * 86400 * 1000);
        return {
          key: d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" }),
          label: d.toLocaleDateString("fr-CH", { day: "2-digit", month: "short" }),
          timeStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          timeEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
          count: 0,
        };
      });
    }

    events.forEach((evt) => {
      const evtTime = new Date(evt.created_at).getTime();
      const slot = slots.find((s) => evtTime >= s.timeStart && evtTime < s.timeEnd);
      if (slot) {
        slot.count++;
      }
    });

    return slots;
  }, [events, timeRange]);

  // Génération du tracé SVG
  const { pathD, areaD, points, maxVal } = useMemo(() => {
    if (!timelineData.length) return { pathD: "", areaD: "", points: [], maxVal: 1 };

    const max = Math.max(...timelineData.map((d) => d.count), 4);
    const width = 600;
    const height = 160;
    const paddingX = 24;
    const paddingY = 20;

    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const pts = timelineData.map((d, i) => {
      const x = paddingX + (i / Math.max(1, timelineData.length - 1)) * innerW;
      const y = paddingY + innerH - (d.count / max) * innerH;
      return { x, y, label: d.label, count: d.count };
    });

    if (pts.length < 2) return { pathD: "", areaD: "", points: pts, maxVal: max };

    // Courbe lissée (catmull-rom / bezier)
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

    return { pathD: dStr, areaD: areaStr, points: pts, maxVal: max };
  }, [timelineData]);

  const maxPulse = Math.max(...last30MinutesData.map((m) => m.count), 3);

  return (
    <div className="admin-charts-section">
      <div className="section-heading">
        <h3 className="admin-panel-title">Activité &amp; Évolution en direct</h3>
        <span className="section-aside">Métriques temporelles</span>
      </div>

      <div className="admin-charts-grid">
        {/* Graphique principal : Courbe de tendance temporelle */}
        <div className="admin-chart-box">
          <div className="chart-box-head">
            <span className="chart-box-title">
              <IconTrendingUp size={15} stroke={1.8} className="chart-icon-label" /> Visites au fil du temps
            </span>
            <span className="chart-box-meta">Pic : {maxVal} visites</span>
          </div>

          <div className="svg-chart-container">
            <svg viewBox="0 0 600 170" className="admin-activity-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="activityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#245b46" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#245b46" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Lignes de repère horizontales */}
              <line x1="24" y1="20" x2="576" y2="20" stroke="var(--line)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="24" y1="80" x2="576" y2="80" stroke="var(--line)" strokeDasharray="3 3" opacity="0.6" />
              <line x1="24" y1="140" x2="576" y2="140" stroke="var(--line)" strokeWidth="1" />

              {/* Zone dégradée */}
              {areaD && <path d={areaD} fill="url(#activityGrad)" />}

              {/* Ligne principale */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#245b46"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points interactifs */}
              {points.map((pt, idx) => (
                <g key={idx} className="chart-data-point" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint === pt ? 5.5 : pt.count > 0 ? 3.5 : 2}
                    fill={pt.count > 0 ? "#245b46" : "var(--line)"}
                    stroke="var(--paper)"
                    strokeWidth="1.5"
                    className="chart-circle"
                  />
                </g>
              ))}
            </svg>

            {/* Bulle d'information au survol */}
            {hoveredPoint && (
              <div
                className="chart-hover-tooltip"
                style={{
                  left: `${(hoveredPoint.x / 600) * 100}%`,
                  top: `${hoveredPoint.y - 12}px`,
                }}
              >
                <strong>{hoveredPoint.count} visite{hoveredPoint.count > 1 ? "s" : ""}</strong>
                <span>{hoveredPoint.label}</span>
              </div>
            )}
          </div>

          <div className="chart-x-labels">
            {timelineData.filter((_, i) => i % Math.ceil(timelineData.length / 6) === 0 || i === timelineData.length - 1).map((s, i) => (
              <span key={i} className="chart-axis-label">{s.label}</span>
            ))}
          </div>
        </div>

        {/* Graphique secondaire : Pulse des 30 dernières minutes (Live Mode) */}
        <div className="admin-chart-box live-pulse-box">
          <div className="chart-box-head">
            <span className="chart-box-title">
              <span className="live-mini-dot" /> Fréquentation en direct (30 min)
            </span>
            <span className="chart-box-meta">Temps réel</span>
          </div>

          <div className="pulse-bars-wrapper">
            <div className="pulse-bars-container">
              {last30MinutesData.map((m) => {
                const heightPct = Math.max(6, (m.count / maxPulse) * 100);
                const hasVisits = m.count > 0;
                return (
                  <div key={m.minuteIndex} className="pulse-bar-col" title={`${m.timeLabel} : ${m.count} événement(s)`}>
                    <div
                      className={`pulse-bar-fill${hasVisits ? " is-active" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="pulse-bars-labels">
              <span>Il y a 30 min</span>
              <span className="pulse-now-label"><span className="live-mini-dot" /> Maintenant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
