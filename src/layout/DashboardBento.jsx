import "./DashboardBento.css";

function sheetCount(allSheets, keys) {
  if (!allSheets || typeof allSheets !== "object") return 0;
  for (const key of keys) {
    if (Array.isArray(allSheets[key])) return allSheets[key].length;
  }
  return 0;
}

/**
 * [COMPONENT] DashboardBento — राज-आईएफएमएस 3.0 फ्रॉस्टेड ग्लास (Glassmorphism) 11-पिलर डैशबोर्ड
 */
export default function DashboardBento({ modules = [], portalData = {}, onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledIds = new Set(
    modules.filter((m) => m.enabled !== false).map((m) => m.id)
  );

  const records = Array.isArray(portalData.records) ? portalData.records : [];
  const attRecords = Array.isArray(portalData.attRecords) ? portalData.attRecords : [];
  const depRecords = Array.isArray(portalData.depRecords) ? portalData.depRecords : [];
  const plLeaveRows = Array.isArray(portalData.plLeaveRows) ? portalData.plLeaveRows : [];
  const allSheets = portalData.allSheets || {};
  const reports = portalData.reports || {};
  const totalSanc = Number(portalData.totalSanc || 0);

  const activeCount = records.length;
  const attDepCount = attRecords.length + depRecords.length;
  const archiveCount = sheetCount(allSheets, ["Employee_Archive", "Relieve_Archive"]);
  const transferOrderCount = sheetCount(allSheets, ["Transfer_Order_History", "Transfer_Orders"]);
  const rosterCount = sheetCount(allSheets, ["Duty_Roster", "PS_Roster"]) || activeCount;
  const trainingCount = sheetCount(allSheets, ["Training_History"]);
  const nominationCount = sheetCount(allSheets, ["Training_Nominations"]);
  const leaveCount = sheetCount(allSheets, ["Leave_Register", "Leave_Entries"]) || plLeaveRows.length;
  const punishmentCount = sheetCount(allSheets, ["Punishment_History", "Punishment_Records"]);
  const cleanCount = Math.max(0, activeCount - punishmentCount);
  const seniorityCount = Array.isArray(reports.seniorityList) ? reports.seniorityList.length : activeCount;

  const pillars = [
    {
      id: "STRENGTH",
      icon: "🛡️",
      enTitle: "Strength",
      hiTitle: "नफरी / Strength",
      enSubtitle: "Force Establishment",
      hiSubtitle: "बल स्थापना एवं स्वीकृति",
      rows: [
        { target: "STRENGTH", en: "Sanctioned & Working Strength", hi: "स्वीकृत एवं कार्यरत नफरी", count: `${activeCount}/${totalSanc}` },
        { target: "STRENGTH", en: "Cadre-Wise Summary (Male/Female)", hi: "संवर्ग-वार सारांश (पुरुष/महिला)", count: activeCount }
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
        { target: "POSTING", en: "SP Office, ASP, CO & PS Posting", hi: "SP कार्यालय, ASP, CO व थाना पदस्थापन", count: activeCount },
        { target: "TRANSFER", en: "Attachment & Deputation", hi: "संलग्नीकरण एवं प्रतिनियुक्ति", count: attDepCount },
        { target: "ARCHIVE", en: "Relieve / Retire / Death Archive", hi: "रिलीव / सेवानिवृत्ति / मृत्यु अभिलेख", count: archiveCount }
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
        { target: "TRANSFER", en: "Transfer Orders & Generator", hi: "स्थानांतरण आदेश एवं जनरेटर", count: transferOrderCount },
        { target: "TRANSFER", en: "Station Tenure Check", hi: "थाना पदस्थापन अवधि जांच", count: activeCount }
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
        { target: "ROSTER", en: "PS Daily & Beat Duty Roster", hi: "थाना दैनिक एवं बीट ड्यूटी रोस्टर", count: rosterCount },
        { target: "ROSTER", en: "Guard & Special Duty Chart", hi: "गार्ड एवं विशेष ड्यूटी चार्ट", count: sheetCount(allSheets, ["Guard_Duty_Chart", "Duty_Roster"]) }
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
        { target: "PROMOTION", en: "PCC Exam Eligibility", hi: "PCC परीक्षा पात्रता", count: activeCount },
        { target: "PROMOTION", en: "DPC Promotion Review", hi: "DPC पदोन्नति समीक्षा", count: seniorityCount }
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
        { target: "ACP", en: "9 / 18 / 27 Years ACP Review", hi: "9 / 18 / 27 वर्ष ACP समीक्षा", count: activeCount },
        { target: "ACP", en: "ACP Eligibility & Order Sheet", hi: "ACP पात्रता एवं आदेश पत्रक", count: sheetCount(allSheets, ["ACP_Orders", "ACP_Review"]) }
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
        { target: "INCREMENT", en: "1st July Annual Increment List", hi: "1 जुलाई वार्षिक वेतनवृद्धि सूची", count: activeCount },
        { target: "INCREMENT", en: "Withheld / Deferred Increment Check", hi: "रोकी / स्थगित वेतनवृद्धि जांच", count: punishmentCount }
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
        { target: "SENIORITY", en: "Cadre-Wise Seniority List", hi: "संवर्ग-वार वरिष्ठता सूची", count: seniorityCount },
        { target: "BHARTI", en: "Bharti Year & Confirmation Roll", hi: "भर्ती वर्ष एवं स्थायीकरण सूची", count: activeCount }
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
        { target: "LEAVE", en: "Leave Entry (CL / HPL / CCL / ML)", hi: "अवकाश प्रविष्टि (CL / HPL / CCL / ML)", count: leaveCount },
        { target: "LEAVE", en: "300 PL Account & Encashment", hi: "300 PL लेखा एवं नकदीकरण", count: plLeaveRows.length },
        { target: "LEAVE", en: "RSR Leave Rules Portal", hi: "RSR अवकाश नियम पोर्टल", count: "RSR" }
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
        { target: "TRAINING", en: "Training Records (All / Post / Year)", hi: "प्रशिक्षण रिकॉर्ड (All / Post / Year)", count: trainingCount },
        { target: "TRAINING", en: "Other State & In-State Nomination", hi: "अन्य राज्य व राज्य-स्तरीय नामांकन", count: nominationCount },
        { target: "TRAINING", en: "iGOT Karmayogi & Mahila Raksha", hi: "iGOT कर्मयोगी एवं महिला आत्मरक्षा", count: "iGOT" },
        { target: "TRAINING", en: "DTC & Training Institutes", hi: "DTC एवं प्रशिक्षण संस्थान", count: "DTC" }
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
        { target: "PUNISHMENT", en: "Departmental Punishment (CCA 16/17)", hi: "विभागीय जांच एवं दंड (CCA 16/17)", count: punishmentCount },
        { target: "PUNISHMENT", en: "Clean Record & Reward Eligibility", hi: "स्वच्छ अभिलेख एवं पुरस्कार पात्रता", count: cleanCount }
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
              ? "Select any service pillar or sub-workflow below to open records, orders, or registers."
              : "संबंधित बल विवरण, आदेश या पंजिका खोलने के लिए नीचे से विभागीय पिलर या उप-विकल्प चुनें।"}
          </p>
        </div>
      </div>

      {/* === SLIM, TALL FROSTED-GLASS PILLAR GRID === */}
      <div className="rajifms-pillar-grid">
        {pillars.map((pillar) => (
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
              <span className="rajifms-header-subtitle">
                {english ? pillar.enSubtitle : pillar.hiSubtitle}
              </span>
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
                  <span className="rajifms-subrow-right">
                    <span className="rajifms-count-pill">{row.count}</span>
                    <span className="rajifms-subrow-chevron" aria-hidden="true">&gt;</span>
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
