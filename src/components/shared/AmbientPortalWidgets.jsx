import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PoliceCrestSvg } from "./PortalVectorArt";
import "./AmbientPortalWidgets.css";

const MAP_NODES = [
  { id: "SP_HQ", x: 150, y: 86, label: "SP Office HQ", hiLabel: "एसपी कार्यालय मुख्यालय", role: "Force & Establishment Control" },
  { id: "ASP", x: 96, y: 54, label: "ASP Division", hiLabel: "एएसपी खंड कार्यालय", role: "Supervisory Circle HQ" },
  { id: "CO_1", x: 215, y: 58, label: "CO Circles", hiLabel: "वृत्ताधिकारी कार्यालय", role: "Circle Field Operations" },
  { id: "PS_GRID", x: 76, y: 122, label: "Police Stations", hiLabel: "थाना एवं चौकी नेटवर्क", role: "Beat, Roster & Daily Duty" },
  { id: "RPL", x: 222, y: 124, label: "Reserve Line & DTC", hiLabel: "रिजर्व पुलिस लाइन एवं डीटीसी", role: "Training, Guards & Reserve" }
];

function getIstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  return {
    weekday: pick("weekday"),
    day: Number(pick("day")),
    monthLabel: pick("month"),
    year: Number(pick("year")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    second: Number(pick("second")),
    timeText: `${pick("hour")}:${pick("minute")}:${pick("second")}`
  };
}

function buildCalendarCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
}

/**
 * [COMPONENT] AmbientPortalWidgets — Live Atmospheric Sunrise/Moonrise, Water Waves,
 * Analog/Digital IST Clock, Interactive Calendar, Animated Tricolor Flag & District Vector Map Popups
 */
export default function AmbientPortalWidgets({ currentDistrict, theme = "light", language = "hi" }) {
  const english = language === "en";
  const districtName = currentDistrict?.name || "Chittorgarh";

  const [nowParts, setNowParts] = useState(() => getIstParts());
  const [skyOverride, setSkyOverride] = useState(null); // null | "sun" | "moon"
  const [activePopup, setActivePopup] = useState(null); // null | "CALENDAR" | "MAP" | "FLAG"
  const [calDate, setCalDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedMapNode, setSelectedMapNode] = useState(MAP_NODES[0]);

  const hourHandRef = useRef(null);
  const minHandRef = useRef(null);
  const secHandRef = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      const next = getIstParts();
      setNowParts(next);
      const secDeg = next.second * 6;
      const minDeg = next.minute * 6 + next.second * 0.1;
      const hrDeg = ((next.hour % 12) * 30) + next.minute * 0.5;
      if (hourHandRef.current) hourHandRef.current.style.transform = `translateX(-50%) rotate(${hrDeg}deg)`;
      if (minHandRef.current) minHandRef.current.style.transform = `translateX(-50%) rotate(${minDeg}deg)`;
      if (secHandRef.current) secHandRef.current.style.transform = `translateX(-50%) rotate(${secDeg}deg)`;
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, []);

  const isMoonMode = skyOverride ? skyOverride === "moon" : theme === "dark";

  const calendarCells = useMemo(() => buildCalendarCells(calDate.year, calDate.month), [calDate]);
  const monthTitle = useMemo(
    () => new Date(calDate.year, calDate.month, 1).toLocaleString(english ? "en-IN" : "hi-IN", { month: "long", year: "numeric" }),
    [calDate, english]
  );

  const shiftMonth = (delta) => {
    setCalDate((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <section
      aria-label={english ? "Live Atmospheric & Utility Widgets" : "लाइव समय, कैलेंडर, ध्वज एवं नक्शा विजेट"}
      className="widgets-live-strip"
    >
      {/* === 1. SUNRISE / MOONRISE SKY + ANIMATED WATER WAVES WIDGET === */}
      <div className={`widget-glass-card widget-celestial ${isMoonMode ? "is-moonrise" : "is-sunrise"}`}>
        <div className="widget-celestial-sky" aria-hidden="true">
          <img src="/assets/arras/starter-coast.png" alt="" className="celestial-bg-photo" />
          <div className="celestial-stars" />
          <div className="celestial-orb" />
          <div className="celestial-cloud cloud-a" />
          <div className="celestial-cloud cloud-b" />

          {/* Moving Layered Vector Water Waves */}
          <svg className="celestial-waves-svg" viewBox="0 0 400 90" preserveAspectRatio="none">
            <path className="water-wave wave-back" d="M0,45 Q50,25 100,45 T200,45 T300,45 T400,45 L400,90 L0,90 Z" />
            <path className="water-wave wave-mid" d="M0,55 Q50,70 100,55 T200,55 T300,55 T400,55 L400,90 L0,90 Z" />
            <path className="water-wave wave-front" d="M0,66 Q50,52 100,66 T200,66 T300,66 T400,66 L400,90 L0,90 Z" />
          </svg>
        </div>

        <div className="widget-celestial-overlay">
          <span className="widget-minimal-tag">
            {isMoonMode
              ? (english ? "🌙 Moonrise Calm" : "🌙 चंद्रोदय दृश्य")
              : (english ? "🌅 Sunrise Horizon" : "🌅 सूर्योदय दृश्य")}
          </span>
          <div className="widget-celestial-bottom">
            <strong className="widget-celestial-district">{districtName} Command</strong>
            <button
              type="button"
              onClick={() => setSkyOverride(isMoonMode ? "sun" : "moon")}
              className="widget-minimal-btn"
            >
              {isMoonMode ? "☀️ Sunrise" : "🌙 Moonrise"}
            </button>
          </div>
        </div>
      </div>

      {/* === 2. LIVE NEUMORPHIC ANALOG + DIGITAL CLOCK & CALENDAR WIDGET === */}
      <div className="widget-glass-card widget-time-card">
        <div className="widget-analog-clock" aria-hidden="true">
          <span className="clock-dot" />
          <span ref={hourHandRef} className="clock-hand hand-hour" />
          <span ref={minHandRef} className="clock-hand hand-min" />
          <span ref={secHandRef} className="clock-hand hand-sec" />
        </div>

        <div className="widget-time-info">
          <span className="widget-minimal-tag">
            <span className="material-symbols-outlined g-icon" aria-hidden="true">schedule</span>
            IST LIVE
          </span>
          <strong className="widget-digital-time">{nowParts.timeText}</strong>
          <span className="widget-date-sub">
            {nowParts.weekday}, {nowParts.day} {nowParts.monthLabel} {nowParts.year}
          </span>
          <button
            type="button"
            onClick={() => setActivePopup("CALENDAR")}
            className="widget-minimal-btn"
          >
            <span className="material-symbols-outlined g-icon-sm" aria-hidden="true">calendar_month</span>
            {english ? "Open Calendar" : "कैलेंडर खोलें"}
          </button>
        </div>
      </div>

      {/* === 3. ANIMATED TRICOLOR FLAG & DISTRICT VECTOR MAP POPUPS WIDGET === */}
      <div className="widget-glass-card widget-geo-card">
        <div className="widget-geo-visuals">
          {/* Waving Indian Flag SVG */}
          <svg viewBox="0 0 90 60" className="widget-flag-svg" aria-hidden="true">
            <rect x="6" y="4" width="4" height="54" rx="2" fill="#8b6f47" />
            <g className="flag-cloth">
              <rect x="10" y="6" width="72" height="14" rx="2" fill="#FF9933" />
              <rect x="10" y="20" width="72" height="14" fill="#FFFFFF" />
              <rect x="10" y="34" width="72" height="14" rx="2" fill="#138808" />
              <circle cx="46" cy="27" r="5.5" fill="none" stroke="#000080" strokeWidth="1.2" />
              <circle cx="46" cy="27" r="1.2" fill="#000080" />
            </g>
          </svg>

          {/* Animated District Sonar Map Mini SVG */}
          <svg viewBox="0 0 120 72" className="widget-mini-map-svg" aria-hidden="true">
            <path d="M16,24 L48,10 L96,16 L108,42 L78,62 L32,58 L12,40 Z" fill="rgba(67, 83, 57, 0.14)" stroke="#435339" strokeWidth="1.5" />
            <circle cx="58" cy="36" r="10" className="map-ping-ring" />
            <circle cx="58" cy="36" r="3.5" fill="#e06d44" />
            <circle cx="34" cy="28" r="2.5" fill="#435339" />
            <circle cx="84" cy="30" r="2.5" fill="#435339" />
          </svg>
        </div>

        <div className="widget-geo-actions">
          <span className="widget-geo-title">{districtName} · Jurisdiction &amp; Honors</span>
          <div className="widget-btn-row">
            <button type="button" onClick={() => setActivePopup("MAP")} className="widget-minimal-btn">
              <span className="material-symbols-outlined g-icon-sm" aria-hidden="true">map</span>
              {english ? "Vector Map" : "वेक्टर नक्शा"}
            </button>
            <button type="button" onClick={() => setActivePopup("FLAG")} className="widget-minimal-btn">
              <span className="material-symbols-outlined g-icon-sm" aria-hidden="true">flag</span>
              {english ? "Flag & Seal" : "ध्वज व प्रतीक"}
            </button>
          </div>
        </div>
      </div>

      {/* === VECTOR POPUP CREATIONS MODAL === */}
      {activePopup && createPortal(
        <div
          className="widget-popup-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActivePopup(null);
          }}
        >
          <section className="widget-popup-modal" role="dialog" aria-modal="true" aria-label={activePopup}>
            <header className="widget-popup-header">
              <strong>
                {activePopup === "CALENDAR" && (english ? "📅 Interactive Duty & Establishment Calendar" : "📅 कार्यालय कैलेंडर (IST)")}
                {activePopup === "MAP" && (english ? `🗺️ ${districtName} Jurisdiction Vector Map` : `🗺️ ${districtName} जिला क्षेत्राधिकार वेक्टर मानचित्र`)}
                {activePopup === "FLAG" && (english ? "🇮🇳 National Tricolor & Establishment Seal" : "🇮🇳 राष्ट्रीय ध्वज एवं राजस्थान पुलिस स्थापना प्रतीक")}
              </strong>
              <button type="button" onClick={() => setActivePopup(null)} className="widget-minimal-btn">
                ✕
              </button>
            </header>

            {activePopup === "CALENDAR" && (
              <div className="widget-cal-popup">
                <div className="widget-cal-nav">
                  <button type="button" onClick={() => shiftMonth(-1)} className="widget-minimal-btn">◀</button>
                  <strong>{monthTitle}</strong>
                  <button type="button" onClick={() => shiftMonth(1)} className="widget-minimal-btn">▶</button>
                </div>
                <div className="widget-cal-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="widget-cal-grid">
                  {calendarCells.map((dayVal, idx) => {
                    const isToday =
                      dayVal === nowParts.day &&
                      calDate.year === nowParts.year &&
                      calDate.month === new Date().getMonth();
                    return (
                      <div key={idx} className={`widget-cal-cell${dayVal ? "" : " is-empty"}${isToday ? " is-today" : ""}`}>
                        {dayVal || ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activePopup === "MAP" && (
              <div className="widget-map-popup">
                <svg viewBox="0 0 300 175" className="widget-large-map-svg">
                  <path
                    d="M32,48 L112,18 L244,28 L272,96 L216,154 L94,148 L22,100 Z"
                    className="map-district-polygon"
                  />
                  <path d="M150,86 L96,54 M150,86 L215,58 M150,86 L76,122 M150,86 L222,124" className="map-network-lines" />
                  {MAP_NODES.map((node) => (
                    <g
                      key={node.id}
                      onClick={() => setSelectedMapNode(node)}
                      className={`map-node-group${selectedMapNode.id === node.id ? " is-active" : ""}`}
                    >
                      <circle cx={node.x} cy={node.y} r="13" className="map-ping-ring" />
                      <circle cx={node.x} cy={node.y} r="6.5" className="map-node-dot" />
                      <text x={node.x} y={node.y + 20} textAnchor="middle" className="map-node-label">
                        {english ? node.label : node.hiLabel}
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="widget-map-detail">
                  <strong>📍 {english ? selectedMapNode.label : selectedMapNode.hiLabel}</strong>
                  <span>{selectedMapNode.role} · {districtName}</span>
                </div>
              </div>
            )}

            {activePopup === "FLAG" && (
              <div className="widget-flag-popup">
                <div className="widget-flag-showcase">
                  <svg viewBox="0 0 180 110" className="widget-flag-lg-svg" aria-hidden="true">
                    <rect x="12" y="8" width="6" height="96" rx="3" fill="#8b6f47" />
                    <g className="flag-cloth">
                      <rect x="18" y="10" width="144" height="26" rx="3" fill="#FF9933" />
                      <rect x="18" y="36" width="144" height="26" fill="#FFFFFF" />
                      <rect x="18" y="62" width="144" height="26" rx="3" fill="#138808" />
                      <circle cx="90" cy="49" r="10.5" fill="none" stroke="#000080" strokeWidth="2" />
                      <circle cx="90" cy="49" r="2.2" fill="#000080" />
                    </g>
                  </svg>
                  <PoliceCrestSvg className="portal-crest-svg" />
                </div>
                <p className="widget-motto-text">
                  सेवार्थ कटिबद्धता · {districtName} District Police Force &amp; Establishment Portal
                </p>
              </div>
            )}
          </section>
        </div>,
        document.body
      )}
    </section>
  );
}
