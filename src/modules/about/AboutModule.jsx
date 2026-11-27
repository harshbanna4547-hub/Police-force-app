import { useState } from "react";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import DevServicesModule from "../17_dev_services/DevServicesModule";
import "./about.css";

const CORE_CAPABILITIES = [
  {
    id: "STRENGTH",
    icon: "🛡️",
    enName: "Strength",
    hiName: "नफरी (Strength)",
    enDesc: "Sanctioned vs. working force by rank, PS/CO/Office, summary, and caste category.",
    hiDesc: "पदवार, थाना/वृत्त/कार्यालयवार, समेकित एवं वर्गवार स्वीकृत बनाम कार्यरत नफरी।"
  },
  {
    id: "POSTING",
    icon: "📍",
    enName: "Posting",
    hiName: "पदस्थापन (Posting)",
    enDesc: "Unit-wise deployment across SP Office, ASP, CO Circles, Police Stations, and Chowkis.",
    hiDesc: "एसपी कार्यालय, एएसपी, वृत्त, थाना एवं चौकीवार बल पदस्थापन नियंत्रण।"
  },
  {
    id: "TRANSFER",
    icon: "🔄",
    enName: "Transfer",
    hiName: "स्थानांतरण (Transfer)",
    enDesc: "Transfer order generator, station tenure audits, attachment, and deputation logs.",
    hiDesc: "स्थानांतरण आदेश जनरेटर, थाना कार्यकाल जांच, संलग्नीकरण एवं प्रतिनियुक्ति अभिलेख।"
  },
  {
    id: "ROSTER",
    icon: "📋",
    enName: "Roster",
    hiName: "ड्यूटी रोस्टर (Roster)",
    enDesc: "Daily PS beat roster, ceremonial guard charts, and PL-300 readiness view.",
    hiDesc: "दैनिक थाना बीट ड्यूटी रोस्टर, गार्ड चार्ट एवं पीएल-300 चार्ट।"
  },
  {
    id: "PROMOTION",
    icon: "🎖️",
    enName: "Promotion",
    hiName: "पदोन्नति (Promotion)",
    enDesc: "PCC exam eligibility screening (FC/HC/ASI) and DPC promotion review.",
    hiDesc: "पीसीसी परीक्षा पात्रता जांच एवं डीपीसी पदोन्नति समीक्षा।"
  },
  {
    id: "ACP",
    icon: "💰",
    enName: "ACP",
    hiName: "एसीपी (ACP)",
    enDesc: "9 / 18 / 27 years financial upgradation milestone tracking and order sheets.",
    hiDesc: "9 / 18 / 27 वर्ष समयबद्ध वेतनमान पात्रता समीक्षा एवं आदेश पत्रक।"
  },
  {
    id: "INCREMENT",
    icon: "📈",
    enName: "Increment",
    hiName: "वेतनवृद्धि (Increment)",
    enDesc: "Annual 1st July pay matrix increment lists and LWP/penalty deferment checks.",
    hiDesc: "1 जुलाई वार्षिक वेतनवृद्धि सूची तथा रोकी/स्थगित वेतनवृद्धि जांच।"
  },
  {
    id: "SENIORITY",
    icon: "🏅",
    enName: "Seniority",
    hiName: "वरिष्ठता (Seniority)",
    enDesc: "Cadre-wise gradation rolls, recruitment batches, and probation confirmation.",
    hiDesc: "संवर्गवार वरिष्ठता सूची, भर्ती बैच एवं परिवीक्षा स्थायीकरण अभिलेख।"
  },
  {
    id: "LEAVE",
    icon: "🗓️",
    enName: "Leave & 300-PL",
    hiName: "अवकाश एवं 300-पीएल",
    enDesc: "RSR Leave Ledger (CL, HPL, ML, CCL), 300-PL encashment, and overstay tracker.",
    hiDesc: "आरएसआर अवकाश लेखा, 300 पीएल नकदीकरण एवं अवधि-पार/आमद ट्रैकर।"
  },
  {
    id: "TRAINING",
    icon: "🎓",
    enName: "Training & Nomination",
    hiName: "प्रशिक्षण एवं नामांकन",
    enDesc: "4-stage nomination lifecycle, iGOT Karmayogi, Mahila Raksha, and DTC records.",
    hiDesc: "4-चरणीय नामांकन आदेश, आईगॉट कर्मयोगी, महिला आत्मरक्षा एवं डीटीसी रिकॉर्ड।"
  },
  {
    id: "PUNISHMENT",
    icon: "⚖️",
    enName: "Punishment",
    hiName: "दण्ड एवं अनुशासन",
    enDesc: "CCA Rule 16/17 departmental inquiry log and clean-record reward eligibility.",
    hiDesc: "सीसीए नियम 16/17 विभागीय जांच रिकॉर्ड एवं स्वच्छ छवि पुरस्कार पात्रता।"
  },
  {
    id: "STORAGE",
    icon: "🖥️",
    enName: "Windows 11 Storage Vault",
    hiName: "विंडोज 11 स्टोरेज वॉल्ट",
    enDesc: "Desktop-style file vault, offline backups, Excel sync, and built-in document tools.",
    hiDesc: "डेस्कटॉप शैली फ़ाइल वॉल्ट, ऑफ़लाइन बैकअप, एक्सेल सिंक एवं इनबिल्ट दस्तावेज़ उपकरण।"
  }
];

const ARCHITECTURE_PILLARS = [
  {
    icon: "🔒",
    enTitle: "Offline-First Data Security",
    hiTitle: "ऑफ़लाइन-प्रथम डेटा सुरक्षा",
    enText: "District establishment records save instantly to local IndexedDB storage with zero data loss offline, syncing safely to OneDrive & backend servers when connected.",
    hiText: "समस्त जिला स्थापना अभिलेख पहले स्थानीय IndexedDB स्टोरेज में सुरक्षित रहते हैं और नेटवर्क उपलब्ध होने पर OneDrive व सर्वर से सिंक होते हैं।"
  },
  {
    icon: "📜",
    enTitle: "DevLys 010 & Times New Roman Gazette Formatting",
    hiTitle: "DevLys 010 एवं Times New Roman राजपत्र मुद्रण",
    enText: "Dual-typography engine preserves legacy DevLys 010 / Kruti Dev Hindi records alongside Times New Roman figures across Excel, Word, PDF, and Print outputs.",
    hiText: "द्वि-फ़ॉन्ट इंजन एक्सेल, वर्ड, पीडीएफ और प्रिंट आदेशों में DevLys 010 / Kruti Dev हिंदी तथा Times New Roman अंकों की सटीक शुद्धता बनाए रखता है।"
  },
  {
    icon: "🌐",
    enTitle: "100% Bilingual Force Establishment Suite",
    hiTitle: "100% द्विभाषी स्थापना कार्यप्रणाली",
    enText: "Instant Hindi and English workspace switching across every module, service slip, transfer order, training wireless, and gazette report.",
    hiText: "प्रत्येक मॉड्यूल, सेवा पर्ची, स्थानांतरण आदेश, प्रशिक्षण बेतार संदेश एवं रिपोर्ट में त्वरित हिंदी और अंग्रेज़ी भाषा रूपांतरण।"
  }
];

/**
 * [COMPONENT] AboutModule — पोर्टल परिचय, सिस्टम क्षमताएं एवं एम्बेडेड डेवलपमेंट सेवाएं
 */
export default function AboutModule({
  districtId,
  currentDistrict,
  portalData,
  initialTab = "OVERVIEW",
  language = "hi"
}) {
  const [activeTab, setActiveTab] = useState(() =>
    initialTab === "DEV_SERVICES" ? "DEV_SERVICES" : "OVERVIEW"
  );
  const english = language === "en";
  const districtLabel = currentDistrict?.name || portalData?.activeProfile || "Chittorgarh";

  const exportRows = CORE_CAPABILITIES.map((item, idx) => ({
    [english ? "S.N." : "क्र.सं."]: idx + 1,
    [english ? "Module" : "मॉड्यूल"]: english ? item.enName : item.hiName,
    [english ? "Capabilities" : "कार्यक्षमता"]: english ? item.enDesc : item.hiDesc
  }));

  const sectionLabel = activeTab === "DEV_SERVICES"
    ? (english ? "Development Services" : "डेवलपमेंट सेवाएँ")
    : (english ? "Portal Overview" : "पोर्टल परिचय");

  return (
    <section
      className="about-module module-panel"
      aria-label={english ? "About Portal & Development Services" : "पोर्टल परिचय एवं डेवलपमेंट सेवाएँ"}
    >
      {/* === 1. TOP UNIFIED TOOLBAR & BREADCRUMB === */}
      <ModuleHeaderToolbar
        title={english ? "ℹ️ About District Police Establishment Portal" : "ℹ️ जिला पुलिस बल एवं स्थापना पोर्टल परिचय"}
        sectionLabel={sectionLabel}
        onModuleRoot={() => setActiveTab("OVERVIEW")}
        rows={exportRows}
        fileName="Police_Portal_Capabilities"
        language={language}
      />

      {/* === 2. ADMINISTRATIVE SECTION TABS (OVERVIEW | DEVELOPMENT SERVICES) === */}
      <nav
        className="about-section-tabs"
        role="tablist"
        aria-label={english ? "About portal sections" : "पोर्टल परिचय अनुभाग"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "OVERVIEW"}
          onClick={() => setActiveTab("OVERVIEW")}
          className={`about-tab-btn${activeTab === "OVERVIEW" ? " is-active" : ""}`}
        >
          <span>ℹ️</span>
          <span>{english ? "Portal Overview & Capabilities" : "पोर्टल परिचय एवं मुख्य क्षमताएं"}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "DEV_SERVICES"}
          onClick={() => setActiveTab("DEV_SERVICES")}
          className={`about-tab-btn${activeTab === "DEV_SERVICES" ? " is-active" : ""}`}
        >
          <span>🛠️</span>
          <span>{english ? "Development Services (Sync, Hosting & Devices)" : "डेवलपमेंट सेवाएँ (सिंक, होस्टिंग एवं डिवाइस)"}</span>
        </button>
      </nav>

      {/* === 3. TAB 1: PORTAL OVERVIEW & SYSTEM CAPABILITIES === */}
      {activeTab === "OVERVIEW" && (
        <div className="about-overview-stack">
          {/* Executive Hero Card */}
          <article className="about-hero-card">
            <div className="about-hero-copy">
              <span className="about-eyebrow">
                {english
                  ? `RAJASTHAN POLICE · ${districtLabel.toUpperCase()} FORCE BRANCH`
                  : `राजस्थान पुलिस · ${districtLabel} पुलिस बल एवं स्थापना`}
              </span>
              <h2 className="about-hero-title">
                {english
                  ? "District Police Force & Establishment Portal"
                  : "जिला पुलिस बल एवं स्थापना प्रबंधन पोर्टल"}
              </h2>
              <p className="about-hero-summary">
                {english
                  ? `An integrated, offline-first establishment workspace engineered for ${districtLabel} Police Force Branch — unifying personnel strength, posting control, transfer orders, ACP/increment/promotion reviews, RSR 300-PL ledgers, training nominations, and gazette-ready bilingual exports.`
                  : `${districtLabel} पुलिस बल शाखा के लिए निर्मित एक समेकित, ऑफ़लाइन-प्रथम स्थापना कार्यक्षेत्र — जो नफरी नियंत्रण, पदस्थापन, स्थानांतरण आदेश, ACP/वेतनवृद्धि/पदोन्नति समीक्षा, RSR 300-PL लेखा, प्रशिक्षण नामांकन तथा राजपत्र-स्तरीय प्रिंट निर्यात को एक मंच पर जोड़ता है।`}
              </p>
            </div>
            <div className="about-hero-badges">
              <div className="about-stat-chip">
                <strong>12</strong>
                <span>{english ? "Core Modules" : "मुख्य मॉड्यूल"}</span>
              </div>
              <div className="about-stat-chip">
                <strong>Offline-First</strong>
                <span>{english ? "IndexedDB + Sync" : "सुरक्षित स्टोरेज"}</span>
              </div>
              <div className="about-stat-chip">
                <strong>DevLys 010</strong>
                <span>{english ? "& Times New Roman" : "व Times New Roman"}</span>
              </div>
            </div>
          </article>

          {/* Core Architecture Pillars */}
          <div className="about-pillars-grid">
            {ARCHITECTURE_PILLARS.map((pillar) => (
              <article key={pillar.enTitle} className="about-pillar-card">
                <span className="about-pillar-icon" aria-hidden="true">{pillar.icon}</span>
                <h3 className="about-pillar-title">
                  {english ? pillar.enTitle : pillar.hiTitle}
                </h3>
                <p className="about-pillar-text">
                  {english ? pillar.enText : pillar.hiText}
                </p>
              </article>
            ))}
          </div>

          {/* 12 Core Modules Grid */}
          <section className="about-capabilities-section" aria-labelledby="about-cap-heading">
            <header className="about-section-heading">
              <h3 id="about-cap-heading">
                {english ? "Core Operational Modules" : "प्रमुख विभागीय कार्य मॉड्यूल"}
              </h3>
              <span>{english ? "12 Integrated Modules" : "12 समेकित मॉड्यूल"}</span>
            </header>

            <div className="about-capabilities-grid">
              {CORE_CAPABILITIES.map((mod) => (
                <article key={mod.id} className="about-capability-card">
                  <div className="about-capability-top">
                    <span className="about-capability-icon" aria-hidden="true">{mod.icon}</span>
                    <strong className="about-capability-title">
                      {english ? mod.enName : mod.hiName}
                    </strong>
                  </div>
                  <p className="about-capability-desc">
                    {english ? mod.enDesc : mod.hiDesc}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Developer & Technical Administration Footer Card */}
          <section className="about-author-card" aria-label={english ? "Developer & Administration" : "विकासकर्ता एवं तकनीकी प्रशासन"}>
            <div className="about-author-info">
              <span className="about-eyebrow">
                {english ? "DESIGNED & MAINTAINED BY" : "परिकल्पना एवं तकनीकी विकास"}
              </span>
              <h3 className="about-author-name">Harshvardhan Singh Rathore</h3>
              <div className="about-author-meta">
                <span>
                  <strong>{english ? "Role:" : "पद:"}</strong>{" "}
                  {english ? "Govt. Employee — Junior Assistant" : "सरकारी कर्मचारी — कनिष्ठ सहायक"}
                </span>
                <span>
                  <strong>{english ? "Posting:" : "पदस्थापन:"}</strong>{" "}
                  {english ? "SP Office (Force Branch), Chittorgarh" : "पुलिस अधीक्षक कार्यालय (फोर्स शाखा), चित्तौड़गढ़"}
                </span>
                <span>
                  <strong>{english ? "Work Deal:" : "कार्य दायित्व:"}</strong>{" "}
                  {english
                    ? "Training, Exam Permission, Seniority, Roster & Promotion Exams"
                    : "प्रशिक्षण, परीक्षा अनुमति, वरिष्ठता, रोस्टर एवं पदोन्नति परीक्षा कार्य"}
                </span>
                <span>
                  <strong>{english ? "Email:" : "ई-मेल:"}</strong>{" "}
                  <a href="mailto:harshbanna4547@gmail.com" className="about-author-mail">
                    harshbanna4547@gmail.com
                  </a>
                </span>
              </div>
            </div>

            <div className="about-author-actions">
              <button
                type="button"
                onClick={() => setActiveTab("DEV_SERVICES")}
                className="about-open-dev-btn"
              >
                🛠️ {english ? "Open Development Services" : "डेवलपमेंट सेवाएँ खोलें"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* === 4. TAB 2: EMBEDDED DEVELOPMENT SERVICES SECTION === */}
      {activeTab === "DEV_SERVICES" && (
        <div className="about-dev-container">
          <DevServicesModule
            districtId={districtId}
            portalData={portalData}
            language={language}
          />
        </div>
      )}
    </section>
  );
}
