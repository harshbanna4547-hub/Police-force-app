import "./StatCards.css";

/**
 * [COMPONENT] StatCards — होम डैशबोर्ड पर 4 मुख्य नफरी/कार्यरत KPI सारांश कार्ड दिखाता है
 */
export default function StatCards({ totalSanc, activeCount, attCount, depCount, setActiveView, language = "hi" }) {
  const english = language === "en";
  const cards = [
    {
      title: english ? "Total Sanctioned Strength" : "कुल स्वीकृत नफरी",
      val: totalSanc,
      toneClass: "stat-tone-green",
      icon: "👥",
      view: "STRENGTH"
    },
    {
      title: english ? "Active District Force" : "सक्रिय जिला पुलिस बल",
      val: activeCount,
      toneClass: "stat-tone-blue",
      icon: "🛡️",
      view: "STRENGTH"
    },
    {
      title: english ? "On Attachment" : "संलग्नीकरण पर",
      val: attCount,
      toneClass: "stat-tone-orange",
      icon: "📎",
      view: "TRANSFER"
    },
    {
      title: english ? "On Deputation" : "प्रतिनियुक्ति पर",
      val: depCount,
      toneClass: "stat-tone-indigo",
      icon: "🖥️",
      view: "TRANSFER"
    }
  ];

  return (
    <section className="portal-stat-cards" aria-label={english ? "Force Summary" : "बल सारांश"}>
      {cards.map((c, i) => (
        <div
          key={i}
          className={`portal-stat-card ${c.toneClass}`}
          onClick={() => setActiveView(c.view)}
        >
          <div className="portal-stat-icon" aria-hidden="true">{c.icon}</div>
          <div>
            <div className="portal-stat-title">{c.title}</div>
            <div className="portal-stat-value">{c.val}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
