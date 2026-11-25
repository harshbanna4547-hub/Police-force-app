import "./DashboardBento.css";

/**
 * [COMPONENT] DashboardBento — आधुनिक Minimal Royal-Blue / Magenta / Light-Purple
 * राज-आईएफएमएस 3.0 पिलर कार्ड्स (Non-clickable header, Zero chevrons/badges, Ice & Fire hover)
 */
export default function DashboardBento({ modules = [], onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledIds = new Set(
    modules.filter((m) => m.enabled !== false).map((m) => m.id)
  );

  const pillars = [
    {
      id: "STRENGTH",
      icon: "🛡️",
      enTitle: "Strength",
      hiTitle: "नफरी / Strength",
      enSubtitle: "Force Establishment",
      hiSubtitle: "बल स्थापना एवं स्वीकृति",
      rows: [
        { target: "STRENGTH", initialTab: "POST_WISE", en: "Post-Wise Strength", hi: "पदवार नफरी (Post-Wise)" },
        { target: "STRENGTH", initialTab: "OFFICE_PS_WISE", en: "PS / CO / Office-Wise Strength", hi: "थाना / वृत्त / कार्यालयवार नफरी" },
        { target: "STRENGTH", initialTab: "SUMMARY", en: "Strength Summary (Male / Female)", hi: "समेकित सारांश एवं Male/Female" },
        { target: "STRENGTH", initialTab: "CASTE_WISE", en: "Caste-Wise Strength", hi: "जाति / वर्गवार नफरी" }
      ]
    },
    {
      id: "POSTING",
      icon: "📍",
      enTitle: "Posting",
      hiTitle: "पदस्थापन / Posting",
      enSubtitle: "Unit Deployment",
      hiSubtitle: "इकाई व थाना पदस्थापन",
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
      enSubtitle: "Orders & Tenure",
      hiSubtitle: "स्थानांतरण एवं अवधि",
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
      enSubtitle: "Daily Deployment",
      hiSubtitle: "दैनिक व विशेष ड्यूटी",
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
      enSubtitle: "PCC & DPC Track",
      hiSubtitle: "पदोन्नति एवं परीक्षा",
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
      enSubtitle: "9 / 18 / 27 Progression",
      hiSubtitle: "समयबद्ध वेतनमान",
      rows: [
        { target: "ACP", en: "9 / 18 / 27 Years ACP Review", hi: "9 / 18 / 27 वर्ष ACP समीक्षा" },
        { target: "ACP", en: "ACP Eligibility & Order Sheet", hi: "ACP पात्रता एवं आदेश पत्रक" }
      ]
    },
    {
      id: "INCREMENT",
      icon: "📈",
      enTitle: "Salary Increment",
      hiTitle: "वेतनवृद्धि / Increment",
      enSubtitle: "Annual Pay Matrix",
      hiSubtitle: "जुलाई वार्षिक वेतनवृद्धि",
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
      enSubtitle: "Gradation & Bharti",
      hiSubtitle: "वरिष्ठता एवं स्थायीकरण",
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
      enSubtitle: "RSR Leave Ledger",
      hiSubtitle: "अवकाश एवं 300-पीएल खाता",
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
      enSubtitle: "Courses & Orders",
      hiSubtitle: "प्रशिक्षण एवं नामांकन",
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
      enSubtitle: "Discipline & CCA",
      hiSubtitle: "विभागीय अनुशासन एवं दंड",
      rows: [
        { target: "PUNISHMENT", en: "Departmental Punishment (CCA 16/17)", hi: "विभागीय जांच एवं दंड (CCA 16/17)" },
        { target: "PUNISHMENT", en: "Clean Record & Reward Eligibility", hi: "स्वच्छ अभिलेख एवं पुरस्कार पात्रता" }
      ]
    }
  ];

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
              ? "Click any sub-item inside the pillars below to open registers, orders, or reports."
              : "संबंधित बल विवरण, आदेश या पंजिका खोलने के लिए पिलर कार्ड के अंदर किसी भी उप-विकल्प पर क्लिक करें।"}
          </p>
        </div>
      </div>

      {/* === FROSTED GLASS PILLAR GRID === */}
      <div className="rajifms-pillar-grid">
        {pillars.map((pillar) => (
          <article key={pillar.id} className="rajifms-pillar-card">
            {/* Non-Clickable Top Header */}
            <div className="rajifms-pillar-header">
              <span className="rajifms-header-icon" aria-hidden="true">
                {pillar.icon}
              </span>
              <span className="rajifms-header-title">
                {english ? pillar.enTitle : pillar.hiTitle}
              </span>
              <span className="rajifms-header-subtitle">
                {english ? pillar.enSubtitle : pillar.hiSubtitle}
              </span>
            </div>

            {/* Only Sub-Items Inside Card Are Clickable (No > chevrons, No count badges) */}
            <div className="rajifms-subrow-list">
              {pillar.rows.map((row) => (
                <button
                  key={`${pillar.id}-${row.en}`}
                  type="button"
                  onClick={() => onOpenModule(resolveTarget(row.target, pillar.id), row.initialTab)}
                  className="rajifms-subrow-btn"
                >
                  <span className="rajifms-subrow-text">
                    {english ? row.en : row.hi}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
