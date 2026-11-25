import "./StatCards.css";

/**
 * [COMPONENT] StatCards — केवल StrengthModule के शीर्ष पर शाही नेवी / स्लेट KPI शोकेस बैंड
 */
export default function StatCards({
  totalSanc,
  activeCount,
  attCount,
  depCount,
  setActiveView,
  currentDistrict,
  language = "hi"
}) {
  const english = language === "en";
  const districtHeading = currentDistrict?.id === "CHITTORGARH" || !currentDistrict?.name
    ? (english ? "Chittorgarh District Force Overview" : "चित्तौड़गढ़ जिला पुलिस बल सारांश")
    : `${currentDistrict.name} ${english ? "District Force Overview" : "जिला पुलिस बल सारांश"}`;

  const cards = [
    {
      title: english ? "Total Sanctioned Strength" : "कुल स्वीकृत नफरी",
      val: totalSanc,
      toneClass: "kpi-tone-emerald",
      icon: "👥",
      view: "STRENGTH"
    },
    {
      title: english ? "Active District Force" : "सक्रिय जिला पुलिस बल",
      val: activeCount,
      toneClass: "kpi-tone-sky",
      icon: "🛡️",
      view: "STRENGTH"
    },
    {
      title: english ? "On Attachment" : "संलग्नीकरण पर",
      val: attCount,
      toneClass: "kpi-tone-amber",
      icon: "📎",
      view: "TRANSFER"
    },
    {
      title: english ? "On Deputation" : "प्रतिनियुक्ति पर",
      val: depCount,
      toneClass: "kpi-tone-violet",
      icon: "🖥️",
      view: "TRANSFER"
    }
  ];

  return (
    <section
      className="portal-kpi-showcase"
      aria-label={english ? "Executive Force Metrics" : "प्रमुख नफरी संकेतक"}
    >
      {/* === TOP EXECUTIVE RIBBON === */}
      <div className="kpi-showcase-header">
        <span className="kpi-showcase-pill">
          <span className="kpi-live-dot" aria-hidden="true" />
          {english ? "LIVE ESTABLISHMENT METRICS" : "सक्रिय स्थापना विवरण"}
        </span>
        <h2 className="kpi-showcase-heading">{districtHeading}</h2>
      </div>

      {/* === 4-COLUMN KPI METRIC CARDS === */}
      <div className="portal-stat-cards">
        {cards.map((c) => (
          <button
            key={c.title}
            type="button"
            className={`portal-stat-card ${c.toneClass}`}
            onClick={() => setActiveView(c.view)}
          >
            <div className="portal-stat-icon" aria-hidden="true">{c.icon}</div>
            <div className="portal-stat-meta">
              <div className="portal-stat-title">{c.title}</div>
              <div className="portal-stat-value english-cell">{c.val}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
