// src/components/HomeGrid.jsx
import React from "react";

const TILES = [
  { key: "STRENGTH", title: "1. Strength", sub: "स्वीकृत व कार्यरत नफरी", bg: "#BFDBFE", fg: "#1D4ED8", icon: "🛡️" },
  { key: "TRANSFER", title: "2. Transfer", sub: "स्थानांतरण / अटैच / कार्यमुक्त", bg: "#FECACA", fg: "#DC2626", icon: "⇄" },
  { key: "POSTING", title: "3. Posting", sub: "थाना-वार पदस्थापन सूची", bg: "#E0E7FF", fg: "#3730A3", icon: "📍" },
  { key: "BHARTI", title: "4. Bharti", sub: "नवीन भर्ती व खाली बेल्ट नं.", bg: "#FDE68A", fg: "#D97706", icon: "⚡" },
  { key: "TRAINING", title: "5. Training", sub: "प्रशिक्षण व कोर्स रिकॉर्ड", bg: "#DDD6FE", fg: "#7C3AED", icon: "🎓" },
  { key: "LEAVE", title: "6. Leave", sub: "अवकाश प्रविष्टि व खाता", bg: "#BBF7D0", fg: "#15803D", icon: "🏖️" },
  { key: "PL300", title: "7. 300 PL Chart", sub: "उपार्जित व शेष PL चार्ट", bg: "#A7F3D0", fg: "#047857", icon: "📊" },
  { key: "INCREMENT", title: "8. Increment", sub: "वार्षिक वेतन वृद्धि (01-July)", bg: "#BAE6FD", fg: "#0369A1", icon: "📈" },
  { key: "ACP", title: "9. ACP (9/18/27)", sub: "ACP पात्रता गणना", bg: "#C7D2FE", fg: "#4338CA", icon: "🎖️" },
  { key: "PUNISHMENT", title: "10. Punishment", sub: "सज़ा / 17 CC / 16 CC", bg: "#FECACA", fg: "#B91C1C", icon: "⚖️" },
  { key: "PROMOTION", title: "11. Promotion Exam", sub: "PCC परीक्षा व DPC पदोन्नति", bg: "#FDE68A", fg: "#B45309", icon: "🏅" },
  { key: "SENIORITY", title: "12. Seniority", sub: "संवर्ग-वार वरिष्ठता सूची", bg: "#DDD6FE", fg: "#6D28D9", icon: "📋" },
  { key: "ROSTER", title: "13. Roster", sub: "मासिक थाना नफरी रोस्टर", bg: "#BBF7D0", fg: "#065F46", icon: "🏢" },
  { key: "STORAGE", title: "14. Storage Vault", sub: "Excel व दस्तावेज़ स्टोरेज", bg: "#E0F2FE", fg: "#0369A1", icon: "🗄️" }
];

export default function HomeGrid({ setActiveView }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))",
        gap: "20px",
        marginTop: "8px"
      }}
    >
      {TILES.map((t) => (
        <div
          key={t.key}
          onClick={() => setActiveView(t.key)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(15, 23, 42, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.06)";
          }}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "22px",
            padding: "30px 18px",
            minHeight: "205px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "1px solid #E2E8F0",
            cursor: "pointer",
            position: "relative",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
            transition: "all 0.2s ease"
          }}
        >
          {/* बड़ा गोलाकार आइकन */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              backgroundColor: t.bg,
              color: t.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.3rem",
              marginBottom: "14px"
            }}
          >
            {t.icon}
          </div>

          {/* बड़ा टाइटल */}
          <div style={{ fontWeight: "800", fontSize: "1.15rem", color: "#0F172A" }}>
            {t.title}
          </div>

          {/* स्पष्ट सब-टाइटल */}
          <div style={{ fontSize: "0.88rem", color: "#475569", marginTop: "6px", fontWeight: "500" }}>
            {t.sub}
          </div>

          {/* दाईं ओर नीचे बड़ा तीर बटन */}
          <div
            style={{
              position: "absolute",
              bottom: "14px",
              right: "16px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#EFF6FF",
              color: "#1D63DC",
              fontWeight: "bold",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            →
          </div>
        </div>
      ))}
    </div>
  );
}
