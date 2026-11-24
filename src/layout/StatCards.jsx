export default function StatCards({ totalSanc, activeCount, attCount, depCount, setActiveView }) {
  const cards = [
    { title: "Total Sanctioned Strength", val: totalSanc, color: "#059669", bg: "#D1FAE5", icon: "👥", view: "STRENGTH" },
    { title: "Active District Force", val: activeCount, color: "#1D63DC", bg: "#DBEAFE", icon: "🛡️", view: "STRENGTH" },
    { title: "On Attachment", val: attCount, color: "#EA580C", bg: "#FFEDD5", icon: "📎", view: "TRANSFER" },
    { title: "On Deputation", val: depCount, color: "#4F46E5", bg: "#EDE9FE", icon: "🖥️", view: "TRANSFER" }
  ];

  return (
    <section style={{ padding: "8px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
      {cards.map((c, i) => (
        <div key={i} onClick={() => setActiveView(c.view)} style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid #E2E8F0", cursor: "pointer" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{c.icon}</div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: "bold" }}>{c.title}</div>
            <div style={{ fontSize: "1.6rem", color: c.color, fontWeight: "bold" }}>{c.val}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
