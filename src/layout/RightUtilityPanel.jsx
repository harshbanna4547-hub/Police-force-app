import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./RightUtilityPanel.css";

const CLOCK_TICKS = Array.from({ length: 12 }, (_, idx) => idx * 30);
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Returns live IST date/time parts formatted for the right utility clock & calendar.
 */
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
  const numParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    month: "numeric"
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  const monthNum = Number(numParts.find((p) => p.type === "month")?.value || 1);

  return {
    weekday: pick("weekday"),
    day: Number(pick("day")),
    dayPadded: pick("day"),
    monthIndex: monthNum - 1,
    monthLabel: pick("month"),
    year: Number(pick("year")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    second: Number(pick("second")),
    timeText: `${pick("hour")}:${pick("minute")}:${pick("second")}`
  };
}

/**
 * Builds leading empty slots and day numbers for a 7-column monthly calendar grid.
 */
function buildCalendarCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return cells;
}

/**
 * [COMPONENT] RightUtilityPanel — Slim fixed Right Utility Rail (>= 1280px)
 * Collapses into a compact top utility strip on smaller desktops, tablets, and mobile.
 * Houses: Live 76px Analog + Digital IST Clock, Mini Monthly Calendar + Full Modal,
 * and Sunrise/Moonrise Sky Status Indicator synced with Light/Dark theme state.
 */
export default function RightUtilityPanel({
  currentDistrict,
  theme = "light",
  onThemeChange,
  language = "hi"
}) {
  const english = language === "en";
  const districtName = currentDistrict?.name || "Chittorgarh";
  const isMoonMode = theme === "dark";

  const [nowParts, setNowParts] = useState(() => getIstParts());
  const [calModalOpen, setCalModalOpen] = useState(false);
  const [calDate, setCalDate] = useState(() => {
    const initial = getIstParts();
    return { year: initial.year, month: initial.monthIndex };
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowParts(getIstParts());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!calModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setCalModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calModalOpen]);

  const calendarCells = useMemo(
    () => buildCalendarCells(calDate.year, calDate.month),
    [calDate.year, calDate.month]
  );

  const monthTitle = useMemo(
    () =>
      new Date(calDate.year, calDate.month, 1).toLocaleString(
        english ? "en-IN" : "hi-IN",
        { month: "short", year: "numeric" }
      ),
    [calDate.year, calDate.month, english]
  );

  const fullMonthTitle = useMemo(
    () =>
      new Date(calDate.year, calDate.month, 1).toLocaleString(
        english ? "en-IN" : "hi-IN",
        { month: "long", year: "numeric" }
      ),
    [calDate.year, calDate.month, english]
  );

  const shiftMonth = (delta) => {
    setCalDate((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const secDeg = nowParts.second * 6;
  const minDeg = nowParts.minute * 6 + nowParts.second * 0.1;
  const hrDeg = (nowParts.hour % 12) * 30 + nowParts.minute * 0.5;

  return (
    <aside
      aria-label={english ? "Live IST Clock, Calendar & Sky Utility Rail" : "लाइव समय, कैलेंडर एवं थीम पैनल"}
      className={`right-utility-panel ${isMoonMode ? "is-moonrise" : "is-sunrise"}`}
    >
      {/* === 1. QUICK SUNRISE / MOONRISE STATUS INDICATOR (SYNCED WITH THEME) === */}
      <button
        type="button"
        onClick={onThemeChange}
        className={`right-rail-sky-card ${isMoonMode ? "is-moonrise" : "is-sunrise"}`}
        title={isMoonMode
          ? (english ? "Moonrise (Dark Mode) — Click for Sunrise" : "मूनराइज (डार्क मोड) — सनराइज हेतु क्लिक करें")
          : (english ? "Sunrise (Light Mode) — Click for Moonrise" : "सनराइज (लाइट मोड) — मूनराइज हेतु क्लिक करें")}
      >
        <div className="right-rail-sky-backdrop" aria-hidden="true">
          <span className="right-rail-sky-orb" />
          <span className="right-rail-sky-stars" />
        </div>
        <div className="right-rail-sky-meta">
          <span className="right-rail-sky-state">
            {isMoonMode
              ? (english ? "🌙 Moonrise" : "🌙 मूनराइज")
              : (english ? "🌅 Sunrise" : "🌅 सनराइज")}
          </span>
          <span className="right-rail-sky-sub">
            {isMoonMode
              ? (english ? "Dark Mode" : "डार्क मोड")
              : (english ? "Light Mode" : "लाइट मोड")}
          </span>
        </div>
      </button>

      {/* === 2. COMPACT LIVE ANALOG (76px) + DIGITAL IST CLOCK === */}
      <section className="right-rail-card right-rail-clock-card" aria-label={english ? "Live IST Clock" : "लाइव समय"}>
        <div className="right-rail-clock-visual">
          <svg
            viewBox="0 0 76 76"
            className="right-rail-analog-svg"
            role="img"
            aria-label={english ? `Analog IST clock ${nowParts.timeText}` : `लाइव घड़ी ${nowParts.timeText}`}
          >
            <circle cx="38" cy="38" r="35" className="clock-dial-face" />
            {CLOCK_TICKS.map((deg) => (
              <line
                key={deg}
                x1="38"
                y1="6"
                x2="38"
                y2={deg % 90 === 0 ? "11" : "9"}
                className={deg % 90 === 0 ? "clock-tick-major" : "clock-tick-minor"}
                transform={`rotate(${deg} 38 38)`}
              />
            ))}
            <line
              x1="38"
              y1="38"
              x2="38"
              y2="20"
              className="clock-hand-hour"
              transform={`rotate(${hrDeg} 38 38)`}
            />
            <line
              x1="38"
              y1="38"
              x2="38"
              y2="13"
              className="clock-hand-min"
              transform={`rotate(${minDeg} 38 38)`}
            />
            <line
              x1="38"
              y1="43"
              x2="38"
              y2="10"
              className="clock-hand-sec"
              transform={`rotate(${secDeg} 38 38)`}
            />
            <circle cx="38" cy="38" r="2.8" className="clock-center-dot" />
          </svg>
        </div>

        <div className="right-rail-clock-readout">
          <span className="right-rail-ist-tag">IST LIVE</span>
          <strong className="right-rail-digital-time">{nowParts.timeText}</strong>
          <span className="right-rail-date-text">
            {nowParts.weekday}, {nowParts.dayPadded} {nowParts.monthLabel} {nowParts.year}
          </span>
          <span className="right-rail-command-badge">{districtName} Command</span>
        </div>
      </section>

      {/* === 3. COMPACT MINI MONTHLY CALENDAR + FULL CALENDAR MODAL TRIGGER === */}
      <section className="right-rail-card right-rail-calendar-card" aria-label={english ? "Monthly Calendar" : "मासिक कैलेंडर"}>
        <div className="right-rail-cal-head">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="right-rail-cal-nav-btn"
            aria-label={english ? "Previous month" : "पिछला माह"}
          >
            ‹
          </button>
          <span className="right-rail-cal-title">{monthTitle}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="right-rail-cal-nav-btn"
            aria-label={english ? "Next month" : "अगला माह"}
          >
            ›
          </button>
        </div>

        <div className="right-rail-cal-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, idx) => (
            <span key={`${label}-${idx}`}>{label}</span>
          ))}
        </div>

        <div className="right-rail-cal-grid">
          {calendarCells.map((dayVal, idx) => {
            const isToday =
              dayVal === nowParts.day &&
              calDate.year === nowParts.year &&
              calDate.month === nowParts.monthIndex;
            return (
              <span
                key={`mini-${idx}`}
                className={`right-rail-cal-cell${dayVal ? "" : " is-empty"}${isToday ? " is-today" : ""}`}
              >
                {dayVal || ""}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setCalModalOpen(true)}
          className="right-rail-open-cal-btn"
        >
          <span>📅</span>
          <span>{english ? "Full Calendar" : "कैलेंडर खोलें"}</span>
        </button>
      </section>

      {/* === EXPANDED FULL CALENDAR MODAL === */}
      {calModalOpen && createPortal(
        <div
          className="right-cal-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCalModalOpen(false);
          }}
        >
          <section
            className="right-cal-modal"
            role="dialog"
            aria-modal="true"
            aria-label={english ? "Duty & Establishment Calendar" : "कार्यालय कैलेंडर"}
          >
            <header className="right-cal-modal-header">
              <strong>
                {english ? "📅 Duty & Establishment Calendar (IST)" : "📅 कार्यालय कैलेंडर (IST)"}
              </strong>
              <button
                type="button"
                onClick={() => setCalModalOpen(false)}
                className="right-cal-modal-close"
                aria-label={english ? "Close calendar" : "कैलेंडर बंद करें"}
              >
                ✕
              </button>
            </header>

            <div className="right-cal-modal-body">
              <div className="right-cal-modal-nav">
                <button type="button" onClick={() => shiftMonth(-1)} className="right-cal-modal-nav-btn">
                  ‹
                </button>
                <strong>{fullMonthTitle}</strong>
                <button type="button" onClick={() => shiftMonth(1)} className="right-cal-modal-nav-btn">
                  ›
                </button>
              </div>

              <div className="right-cal-modal-weekdays">
                {WEEKDAY_FULL.map((dayName) => (
                  <span key={dayName}>{dayName}</span>
                ))}
              </div>

              <div className="right-cal-modal-grid">
                {calendarCells.map((dayVal, idx) => {
                  const isToday =
                    dayVal === nowParts.day &&
                    calDate.year === nowParts.year &&
                    calDate.month === nowParts.monthIndex;
                  return (
                    <div
                      key={`modal-${idx}`}
                      className={`right-cal-modal-cell${dayVal ? "" : " is-empty"}${isToday ? " is-today" : ""}`}
                    >
                      {dayVal || ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </aside>
  );
}
