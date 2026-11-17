import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function InteractiveMap({ events }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Éviter la double instanciation
    if (!mapInstanceRef.current) {
      // Centre initial : Suisse / Europe Centrale
      const map = L.map(mapContainerRef.current, {
        center: [46.8182, 8.2275],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        scrollWheelZoom: true,
      });
      const rawCartoKey = import.meta.env.VITE_CARTO_API_KEY || import.meta.env.CARTO_API_KEY;
      const cartoKey = rawCartoKey ? rawCartoKey.trim().replace(/^['"]|['"]$/g, "") : null;

      if (cartoKey) {
        L.tileLayer(
          `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          }
        ).addTo(map);
      } else {
        // Fond de carte Esri Light Gray Canvas : fond sobre et clair, sans aucune clé API requise
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a> &mdash; OpenStreetMap contributors',
            maxZoom: 16,
          }
        ).addTo(map);

        // Noms des villes et frontières
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "",
            maxZoom: 16,
          }
        ).addTo(map);
      }

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Supprimer les anciens calques de marqueurs
    const markersLayer = L.featureGroup();

    // Regrouper les événements par localisation (uniquement coordonnées réelles valides, zéro supposition)
    const locationMap = new Map();

    events.forEach((evt) => {
      const lat = evt.latitude ? parseFloat(evt.latitude) : null;
      const lng = evt.longitude ? parseFloat(evt.longitude) : null;

      // Zéro fallback : on n'affiche que les points ayant des coordonnées GPS réelles et confirmées
      if (typeof lat === "number" && !isNaN(lat) && typeof lng === "number" && !isNaN(lng)) {
        const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            lat,
            lng,
            count: 0,
            city: evt.city || "Emplacement détecté",
            country: evt.country || evt.country_code || "Inconnu",
            country_code: evt.country_code || "",
          });
        }
        locationMap.get(key).count++;
      }
    });

    // Tracer les points sur la carte
    locationMap.forEach((loc) => {
      const radius = Math.min(7 + Math.log2(loc.count + 1) * 3, 24);

      // Marqueur circulaire avec le vert signature du site (#245b46)
      const circle = L.circleMarker([loc.lat, loc.lng], {
        radius: radius,
        fillColor: "#245b46",
        color: "#17231e",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.65,
      });

      // Bulle d'information au survol
      circle.bindTooltip(
        `<div class="leaflet-custom-tooltip">
          <strong>${loc.city}</strong>${loc.country ? ` · ${loc.country}` : ""}<br/>
          <span>${loc.count} visite${loc.count > 1 ? "s" : ""}</span>
        </div>`,
        {
          direction: "top",
          offset: [0, -radius],
          className: "leaflet-tooltip-clean",
        }
      );

      circle.addTo(markersLayer);
    });

    markersLayer.addTo(map);

    // Ajuster le zoom pour englober tous les marqueurs si présents
    if (locationMap.size > 0) {
      try {
        const bounds = markersLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 7, padding: [40, 40] });
        }
      } catch {}
    }

    // Recalcul de la taille du conteneur
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [events]);

  // Nettoyage au démontage et gestion du redimensionnement (tablette / mobile / rotation)
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="real-map-wrapper">
      <div ref={mapContainerRef} className="real-map-canvas" />
    </div>
  );
}
