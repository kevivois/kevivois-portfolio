import React, { useMemo } from "react";
import { IconCheck, IconLock, IconCrown, IconArmchair } from "@tabler/icons-react";

/**
 * Plan de salle interactif avec sélection visuelle de siège (Swiss Modernist Theater / Auditorium).
 * Gère les zones (Loge VIP / Orchestre), les rangées et la détection en temps réel des sièges déjà réservés.
 */
export function SeatPicker({
  existingTickets = [],
  selectedSeat,
  onSelectSeat,
  categoryName = "Standard",
  venueHall = "Auditorium Principal",
}) {
  // Définition de la grille de la salle
  const venueLayout = useMemo(() => {
    return [
      {
        zone: "Loge Balcon VIP",
        isVip: true,
        rows: [
          { row: "Rang A", seatsCount: 12, offset: 2 },
          { row: "Rang B", seatsCount: 14, offset: 1 },
        ],
      },
      {
        zone: "Orchestre Parterre",
        isVip: false,
        rows: [
          { row: "Rang C", seatsCount: 16, offset: 0 },
          { row: "Rang D", seatsCount: 16, offset: 0 },
          { row: "Rang E", seatsCount: 16, offset: 0 },
          { row: "Rang F", seatsCount: 14, offset: 1 },
        ],
      },
    ];
  }, []);

  // Ensemble des sièges déjà réservés (ex: "Rang A_Siège 01")
  const bookedSeatsSet = useMemo(() => {
    const set = new Set();
    (existingTickets || []).forEach((t) => {
      if (t.status !== "cancelled" && t.row_number && t.seat_number) {
        set.add(`${t.row_number.trim()}_${t.seat_number.trim()}`);
      }
    });
    return set;
  }, [existingTickets]);

  const handleSeatClick = (zoneName, rowName, seatNumber, isBooked) => {
    if (isBooked) return;
    onSelectSeat({
      zoneSection: zoneName,
      rowNumber: rowName,
      seatNumber: seatNumber,
    });
  };

  const isCurrentSelection = (rowName, seatNumber) => {
    return (
      selectedSeat?.rowNumber === rowName && selectedSeat?.seatNumber === seatNumber
    );
  };

  return (
    <div className="seat-picker-container">
      {/* En-tête de la salle */}
      <div className="seat-picker-header">
        <div className="seat-hall-info">
          <IconArmchair size={16} stroke={1.8} className="hall-icon" />
          <span>Plan de salle : <strong>{venueHall}</strong></span>
        </div>
        <span className="seat-picker-hint">
          Cliquez sur un siège disponible pour le réserver
        </span>
      </div>

      {/* Scène / Écran en haut */}
      <div className="seat-stage-box">
        <div className="stage-curve">
          <span className="stage-label">SCÈNE &amp; KEYNOTE</span>
        </div>
        <div className="stage-spotlight" />
      </div>

      {/* Plan interactif des sièges */}
      <div className="seat-map-viewport">
        {venueLayout.map((section, secIdx) => (
          <div key={secIdx} className="seat-section-block">
            <div className="seat-section-title">
              {section.isVip && <IconCrown size={13} stroke={2} className="vip-icon" />}
              <span>{section.zone}</span>
            </div>

            <div className="seat-rows-list">
              {section.rows.map((rowObj, rIdx) => (
                <div key={rIdx} className="seat-row-line">
                  {/* Libellé de la rangée à gauche */}
                  <span className="row-label left">{rowObj.row.replace("Rang ", "")}</span>

                  <div className="seats-in-row">
                    {Array.from({ length: rowObj.seatsCount }, (_, sIdx) => {
                      const seatNum = String(sIdx + 1).padStart(2, "0");
                      const fullSeatName = `Siège ${seatNum}`;
                      const seatKey = `${rowObj.row}_${fullSeatName}`;
                      const isBooked = bookedSeatsSet.has(seatKey);
                      const isSelected = isCurrentSelection(rowObj.row, fullSeatName);

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          className={`seat-btn ${
                            isBooked
                              ? "is-booked"
                              : isSelected
                              ? "is-selected"
                              : section.isVip
                              ? "is-vip-tier"
                              : "is-available"
                          }`}
                          onClick={() =>
                            handleSeatClick(section.zone, rowObj.row, fullSeatName, isBooked)
                          }
                          disabled={isBooked}
                          title={
                            isBooked
                              ? `${rowObj.row} · ${fullSeatName} (Déjà réservé)`
                              : isSelected
                              ? `${rowObj.row} · ${fullSeatName} (Sélectionné)`
                              : `${section.zone} · ${rowObj.row} · ${fullSeatName} (Disponible)`
                          }
                          aria-label={`${rowObj.row} ${fullSeatName}`}
                        >
                          {isSelected ? (
                            <IconCheck size={11} stroke={2.5} />
                          ) : isBooked ? (
                            <span className="booked-x">✕</span>
                          ) : (
                            <span className="seat-number-txt">{seatNum}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Libellé de la rangée à droite */}
                  <span className="row-label right">{rowObj.row.replace("Rang ", "")}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Légende du plan */}
      <div className="seat-map-legend">
        <div className="legend-item">
          <span className="legend-dot available" />
          <span>Libre</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot selected" />
          <span>Votre sélection</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot booked" />
          <span>Réservé</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot vip" />
          <span>Zone VIP</span>
        </div>
      </div>

      {/* Bandeau de confirmation du siège sélectionné */}
      <div className="seat-selection-feedback">
        <span className="feedback-label">Emplacement choisi :</span>
        {selectedSeat?.seatNumber ? (
          <div className="feedback-seat-pill">
            <strong>{selectedSeat.zoneSection || "Salle"}</strong>
            <span>•</span>
            <strong className="seat-focus">{selectedSeat.rowNumber}</strong>
            <span>•</span>
            <strong className="seat-focus">{selectedSeat.seatNumber}</strong>
          </div>
        ) : (
          <span className="feedback-empty">
            Veuillez sélectionner un siège sur le plan ci-dessus
          </span>
        )}
      </div>
    </div>
  );
}

export default SeatPicker;
