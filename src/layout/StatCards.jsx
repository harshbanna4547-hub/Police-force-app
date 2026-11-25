export default function StatCards({ totalSanc, activeCount, attCount, depCount, setActiveView, language = "hi" }) {
  const english = language === "en";
  const cards = [
    {
      title: english ? "Total Sanctioned Strength" : "कुल स्वीकृत नफरी",
      val: totalSanc,
      color: "#059669",
      bg: "#D1FAE5",
      icon: "👥",
      view: "STRENGTH"
    },
    {
      title: english ? "Active District Force" : "सक्रिय जिला पुलिस बल",
      val: activeCount,
      color: "#1D63DC",
      bg: "#DBEAFE",
      icon: "🛡️",
      view: "STRENGTH"
    },
    {
      title: english ? "On Attachment" : "संलग्नीकरण पर",
      val: attCount,
      color: "#EA580C",
      bg: "#FFEDD5",
      icon: "📎",
      view: "TRANSFER"
    },
    {
      title: english ? "On Deputation" : "प्रतिनियुक्ति पर",
      val: depCount,
      color: "#4F46E5",
      bg: "#EDE9FE",
      icon: "🖥️",
      view: "TRANSFER"
    }
  ];

  return (
    <section className="portal-stat-cards" style={{ padding: "8px 24px", display: "grid", gap: "14px" }}>
      {cards.map((c, i) => (
        <div
          key={i}
          onClick={() => setActiveView(c.view)}
          style={{
            backgroundColor: "var(--surface-raised, #fff)",
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            border: "1px solid var(--border, #E2E8F0)",
            cursor: "pointer"
          }}
        >
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{c.icon}</div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted, #475569)", fontWeight: "bold" }}>{c.title}</div>
            <div style={{ fontSize: "1.6rem", color: c.color, fontWeight: "bold" }}>{c.val}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
