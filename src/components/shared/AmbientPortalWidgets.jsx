import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AmbientPortalWidgets.css";

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
 * Analog/Digital IST Clock & Interactive Calendar Popup
 */
export default function AmbientPortalWidgets({ currentDistrict, theme = "light", language = "hi" }) {
  const english = language === "en";
  const districtName = currentDistrict?.name || "Chittorgarh";

  const [nowParts, setNowParts] = useState(() => getIstParts());
  const [skyOverride, setSkyOverride] = useState(null); // null | "sun" | "moon"
  const [activePopup, setActivePopup] = useState(null); // null | "CALENDAR"
  const [calDate, setCalDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

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
      aria-label={english ? "Live Atmospheric & Time Widgets" : "लाइव समय एवं कैलेंडर विजेट"}
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

      {/* === CALENDAR POPUP MODAL === */}
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
          </section>
        </div>,
        document.body
      )}
    </section>
  );
}
