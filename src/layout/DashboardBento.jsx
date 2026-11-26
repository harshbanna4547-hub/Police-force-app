import "./DashboardBento.css";

/**
 * [COMPONENT] DashboardBento — आधुनिक Minimal Editorial राज-आईएफएमएस 3.0 पिलर कार्ड्स
 * Clickable Pillar Top Headers -> Full Module (all sub-tabs visible)
 * Clickable Sub-Item Rows -> Direct Single-View Deep-Link (singleTabMode = true)
 */
export default function DashboardBento({
  modules = [],
  onOpenModule,
  language = "hi"
}) {
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
        { target: "POSTING", initialTab: "ALL", en: "SP Office, ASP, CO & PS Posting", hi: "SP कार्यालय, ASP, CO व थाना पदस्थापन" },
        { target: "TRANSFER", initialTab: "DUTY", en: "Attachment & Deputation", hi: "संलग्नीकरण एवं प्रतिनियुक्ति" },
        { target: "ARCHIVE", initialTab: "ARCHIVE", en: "Relieve / Retire / Death Archive", hi: "रिलीव / सेवानिवृत्ति / मृत्यु अभिलेख" }
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
        { target: "TRANSFER", initialTab: "CREATE", en: "Transfer Orders & Generator", hi: "स्थानांतरण आदेश एवं जनरेटर" },
        { target: "TRANSFER", initialTab: "TENURE", en: "Station Tenure Check", hi: "थाना पदस्थापन अवधि जांच" }
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
        { target: "ROSTER", initialTab: "PS_ROSTER", en: "PS Daily & Beat Duty Roster", hi: "थाना दैनिक एवं बीट ड्यूटी रोस्टर" },
        { target: "ROSTER", initialTab: "GUARD_CHART", en: "Guard & Special Duty Chart", hi: "गार्ड एवं विशेष ड्यूटी चार्ट" }
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
        { target: "PROMOTION", initialTab: "PCC", en: "PCC Exam Eligibility", hi: "PCC परीक्षा पात्रता" },
        { target: "PROMOTION", initialTab: "DPC", en: "DPC Promotion Review", hi: "DPC पदोन्नति समीक्षा" }
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
        { target: "ACP", initialTab: "REVIEW", en: "9 / 18 / 27 Years ACP Review", hi: "9 / 18 / 27 वर्ष ACP समीक्षा" },
        { target: "ACP", initialTab: "ORDERS", en: "ACP Eligibility & Order Sheet", hi: "ACP पात्रता एवं आदेश पत्रक" }
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
        { target: "INCREMENT", initialTab: "ANNUAL", en: "1st July Annual Increment List", hi: "1 जुलाई वार्षिक वेतनवृद्धि सूची" },
        { target: "INCREMENT", initialTab: "WITHHELD", en: "Withheld / Deferred Increment Check", hi: "रोकी / स्थगित वेतनवृद्धि जांच" }
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
        { target: "SENIORITY", initialTab: "CADRE_WISE", en: "Cadre-Wise Seniority List", hi: "संवर्ग-वार वरिष्ठता सूची" },
        { target: "BHARTI", initialTab: "CONFIRMATION", en: "Bharti Year & Confirmation Roll", hi: "भर्ती वर्ष एवं स्थायीकरण सूची" }
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
        { target: "LEAVE", initialTab: "REGISTER", en: "Leave Entry (CL / HPL / CCL / ML)", hi: "अवकाश प्रविष्टि (CL / HPL / CCL / ML)" },
        { target: "LEAVE", initialTab: "PL_300", en: "300 PL Account & Encashment", hi: "300 PL लेखा एवं नकदीकरण" },
        { target: "LEAVE", initialTab: "TRACKER", en: "Overstay / Absentee & Return Tracker", hi: "अवधि-पार / अनुपस्थिति एवं आमद ट्रैकर" }
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
        { target: "TRAINING", initialTab: "ALL_RECORDS", en: "Training Records (All / Post / Year)", hi: "प्रशिक्षण रिकॉर्ड (All / Post / Year)" },
        { target: "TRAINING", initialTab: "OTHER_STATE", en: "Other State & In-State Nomination", hi: "अन्य राज्य व राज्य-स्तरीय नामांकन" },
        { target: "TRAINING", initialTab: "IGOT", en: "iGOT Karmayogi & Mahila Raksha", hi: "iGOT कर्मयोगी एवं महिला आत्मरक्षा" },
        { target: "TRAINING", initialTab: "DTC", en: "DTC & Training Institutes", hi: "DTC एवं प्रशिक्षण संस्थान" }
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
        { target: "PUNISHMENT", initialTab: "PUNISHMENT", en: "Departmental Punishment (CCA 16/17)", hi: "विभागीय जांच एवं दंड (CCA 16/17)" },
        { target: "PUNISHMENT", initialTab: "CLEAN", en: "Clean Record & Reward Eligibility", hi: "स्वच्छ अभिलेख एवं पुरस्कार पात्रता" }
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
      {/* === EDITORIAL PILLAR GRID === */}
      <div className="rajifms-pillar-grid">
        {pillars.map((pillar, index) => {
          const toneClasses = ["tone-olive", "tone-espresso", "tone-slate", "tone-terracotta"];
          const toneClass = toneClasses[index % toneClasses.length];
          return (
            <article key={pillar.id} className={`rajifms-pillar-card ${toneClass}`}>
              {/* Clickable Top Header -> Opens Full Module with Sub-Tabs */}
              <button
                type="button"
                onClick={() => onOpenModule(resolveTarget(pillar.id, pillar.id), null, false)}
                className="rajifms-pillar-header"
                title={english
                  ? `Open full ${pillar.enTitle} module`
                  : `पूरा ${pillar.hiTitle} मॉड्यूल खोलें`}
              >
                <span className="rajifms-header-icon" aria-hidden="true">
                  {pillar.icon}
                </span>
                <span className="rajifms-header-title">
                  {english ? pillar.enTitle : pillar.hiTitle}
                </span>
                <span className="rajifms-header-subtitle">
                  {english ? pillar.enSubtitle : pillar.hiSubtitle}
                </span>
              </button>

              {/* Clickable Sub-Item Rows -> Direct Single-View Deep-Link (singleTabMode = true) */}
              <div className="rajifms-subrow-list">
                {pillar.rows.map((row) => (
                  <button
                    key={`${pillar.id}-${row.en}`}
                    type="button"
                    onClick={() => onOpenModule(resolveTarget(row.target, pillar.id), row.initialTab, true)}
                    className="rajifms-subrow-btn"
                  >
                    <span className="rajifms-subrow-text">
                      {english ? row.en : row.hi}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
