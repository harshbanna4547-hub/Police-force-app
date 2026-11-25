import "./DashboardBento.css";

/**
 * [CONFIG] RAJIFMS_PILLARS — राज-आईएफएमएस 3.0 शैली के 11 स्वतंत्र पिलर कार्ड एवं उप-विकल्प
 * Strength, Posting, Transfer, Duty Roster, Promotion, ACP, Salary Increment,
 * and Seniority remain separate top-level pillars; Leave, Training, and Punishment
 * group their sub-workflows cleanly underneath.
 */
const RAJIFMS_PILLARS = [
  {
    id: "STRENGTH",
    icon: "🛡️",
    enTitle: "Strength",
    hiTitle: "नफरी / Strength",
    rows: [
      { target: "STRENGTH", en: "Sanctioned & Working Strength", hi: "स्वीकृत एवं कार्यरत नफरी" },
      { target: "STRENGTH", en: "Cadre-Wise Summary (Male/Female)", hi: "संवर्ग-वार सारांश (पुरुष/महिला)" }
    ]
  },
  {
    id: "POSTING",
    icon: "📍",
    enTitle: "Posting",
    hiTitle: "पदस्थापन / Posting",
    rows: [
      { target: "POSTING", en: "SP Office, ASP, CO & PS Posting", hi: "SP कार्यालय, ASP, CO व थाना पदस्थापन" },
      { target: "TRANSFER", en: "Attachment & Deputation", hi: "संलग्नीकरण एवं प्रतिनियुक्ति" },
      { target: "ARCHIVE", en: "Relieve / Retire / Death Archive", hi: "रिलीव / सेवानिवृत्ति / मृत्यु अभिलेख" }
    ]
  },
  {
    id: "TRANSFER",
    icon: "🔄",
    enTitle: "Transfer",
    hiTitle: "स्थानांतरण / Transfer",
    rows: [
      { target: "TRANSFER", en: "Transfer Orders & Generator", hi: "स्थानांतरण आदेश एवं जनरेटर" },
      { target: "TRANSFER", en: "Station Tenure Check", hi: "थाना पदस्थापन अवधि जांच" }
    ]
  },
  {
    id: "ROSTER",
    icon: "📋",
    enTitle: "Duty Roster",
    hiTitle: "ड्यूटी रोस्टर / Roster",
    rows: [
      { target: "ROSTER", en: "PS Daily & Beat Duty Roster", hi: "थाना दैनिक एवं बीट ड्यूटी रोस्टर" },
      { target: "ROSTER", en: "Guard & Special Duty Chart", hi: "गार्ड एवं विशेष ड्यूटी चार्ट" }
    ]
  },
  {
    id: "PROMOTION",
    icon: "🎖️",
    enTitle: "Promotion",
    hiTitle: "पदोन्नति / Promotion",
    rows: [
      { target: "PROMOTION", en: "PCC Exam Eligibility", hi: "PCC परीक्षा पात्रता" },
      { target: "PROMOTION", en: "DPC Promotion Review", hi: "DPC पदोन्नति समीक्षा" }
    ]
  },
  {
    id: "ACP",
    icon: "💰",
    enTitle: "ACP",
    hiTitle: "एसीपी / ACP",
    rows: [
      { target: "ACP", en: "9 / 18 / 27 Years ACP Review", hi: "9 / 18 / 27 वर्ष ACP समीक्षा" },
      { target: "ACP", en: "ACP Eligibility & Order Sheet", hi: "ACP पात्रता एवं आदेश पत्रक" }
    ]
  },
  {
    id: "INCREMENT",
    icon: "📈",
    enTitle: "Salary Increment",
    hiTitle: "वार्षिक वेतनवृद्धि / Increment",
    rows: [
      { target: "INCREMENT", en: "1st July Annual Increment List", hi: "1 जुलाई वार्षिक वेतनवृद्धि सूची" },
      { target: "INCREMENT", en: "Withheld / Deferred Increment Check", hi: "रोकी / स्थगित वेतनवृद्धि जांच" }
    ]
  },
  {
    id: "SENIORITY",
    icon: "🏅",
    enTitle: "Seniority",
    hiTitle: "वरिष्ठता / Seniority",
    rows: [
      { target: "SENIORITY", en: "Cadre-Wise Seniority List", hi: "संवर्ग-वार वरिष्ठता सूची" },
      { target: "BHARTI", en: "Bharti Year & Confirmation Roll", hi: "भर्ती वर्ष एवं स्थायीकरण सूची" }
    ]
  },
  {
    id: "LEAVE",
    icon: "🗓️",
    enTitle: "Leave & 300-PL",
    hiTitle: "अवकाश एवं 300-पीएल",
    rows: [
      { target: "LEAVE", en: "Leave Entry (CL / HPL / CCL / ML)", hi: "अवकाश प्रविष्टि (CL / HPL / CCL / ML)" },
      { target: "LEAVE", en: "300 PL Account & Encashment", hi: "300 PL लेखा एवं नकदीकरण" },
      { target: "LEAVE", en: "RSR Leave Rules Portal", hi: "RSR अवकाश नियम पोर्टल" }
    ]
  },
  {
    id: "TRAINING",
    icon: "🎓",
    enTitle: "Training & Nomination",
    hiTitle: "प्रशिक्षण एवं नामांकन",
    rows: [
      { target: "TRAINING", en: "Training Records (All / Post / Year)", hi: "प्रशिक्षण रिकॉर्ड (All / Post / Year)" },
      { target: "TRAINING", en: "Other State & In-State Nomination", hi: "अन्य राज्य व राज्य-स्तरीय नामांकन" },
      { target: "TRAINING", en: "iGOT Karmayogi & Mahila Raksha", hi: "iGOT कर्मयोगी एवं महिला आत्मरक्षा" },
      { target: "TRAINING", en: "DTC & Training Institutes", hi: "DTC एवं प्रशिक्षण संस्थान" }
    ]
  },
  {
    id: "PUNISHMENT",
    icon: "⚖️",
    enTitle: "Punishment & Conduct",
    hiTitle: "अनुशासन एवं दंड",
    rows: [
      { target: "PUNISHMENT", en: "Departmental Punishment (CCA 16/17)", hi: "विभागीय जांच एवं दंड (CCA 16/17)" },
      { target: "PUNISHMENT", en: "Clean Record & Reward Eligibility", hi: "स्वच्छ अभिलेख एवं पुरस्कार पात्रता" }
    ]
  }
];

/**
 * [COMPONENT] DashboardBento — राज-आईएफएमएस 3.0 शैली होम डैशबोर्ड (11 स्वतंत्र पिलर कार्ड्स)
 */
export default function DashboardBento({ modules = [], onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledIds = new Set(
    modules.filter((m) => m.enabled !== false).map((m) => m.id)
  );

  const resolveTarget = (targetId, fallbackId) => {
    if (enabledIds.size === 0) return targetId;
    return enabledIds.has(targetId) ? targetId : fallbackId;
  };

  return (
    <section
      aria-label={english ? "All Operational Modules" : "सभी विभागीय कार्य मॉड्यूल"}
      className="bento-dashboard-section"
    >
      {/* === SECTION HEADER === */}
      <div className="bento-section-header">
        <div>
          <h2 className="bento-section-title">
            {english ? "Operational Modules" : "विभागीय कार्य मॉड्यूल"}
          </h2>
          <p className="bento-section-subtitle">
            {english
              ? "Select any service pillar or sub-workflow below to open records, orders, or registers."
              : "संबंधित बल विवरण, आदेश या पंजिका खोलने के लिए नीचे से विभागीय पिलर या उप-विकल्प चुनें।"}
          </p>
        </div>
      </div>

      {/* === RAJIFMS 3.0 PILLAR CARDS GRID (Desktop: 4 cols | Tablet: 2 cols | Mobile: 1 col) === */}
      <div className="rajifms-pillar-grid">
        {RAJIFMS_PILLARS.map((pillar) => (
          <article key={pillar.id} className="rajifms-pillar-card">
            <button
              type="button"
              onClick={() => onOpenModule(pillar.id)}
              className="rajifms-pillar-header"
            >
              <span className="rajifms-header-icon" aria-hidden="true">
                {pillar.icon}
              </span>
              <span className="rajifms-header-title">
                {english ? pillar.enTitle : pillar.hiTitle}
              </span>
              <span className="rajifms-header-arrow" aria-hidden="true">›</span>
            </button>

            <div className="rajifms-subrow-list">
              {pillar.rows.map((row) => (
                <button
                  key={`${pillar.id}-${row.en}`}
                  type="button"
                  onClick={() => onOpenModule(resolveTarget(row.target, pillar.id))}
                  className="rajifms-subrow-btn"
                >
                  <span className="rajifms-subrow-text">
                    {english ? row.en : row.hi}
                  </span>
                  <span className="rajifms-subrow-chevron" aria-hidden="true">&gt;</span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
