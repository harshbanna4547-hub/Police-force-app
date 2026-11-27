/* ==========================================================================
   OFFICIAL GOVERNMENT PORTALS & MODULE ESTABLISHMENT ARTICLES
   ========================================================================== */

export const GOVT_PORTALS = Object.freeze({
  POLICE: {
    id: "POLICE",
    category: "POLICE",
    icon: "local_police",
    badge: "PHQ Circulars",
    title: "Rajasthan Police Official",
    hiTitle: "राजस्थान पुलिस मुख्यालय",
    url: "https://police.rajasthan.gov.in",
    summary: "PHQ Standing Orders, Promotions, Transfers & Force Circulars",
    hiSummary: "पुलिस मुख्यालय स्थायी आदेश, पदोन्नति, स्थानांतरण एवं परिपत्र"
  },
  CCTNS: {
    id: "CCTNS",
    category: "POLICE",
    icon: "security",
    badge: "NCRB / MHA",
    title: "CCTNS Portal",
    hiTitle: "सी.सी.टी.एन.एस. पोर्टल (CCTNS)",
    url: "https://digitalpolice.gov.in",
    summary: "Crime & Criminal Tracking Network and Police Station portal",
    hiSummary: "अपराध एवं अपराधी ट्रैकिंग नेटवर्क (NCRB / पुलिस थाना पोर्टल)"
  },
  SCRB: {
    id: "SCRB",
    category: "POLICE",
    icon: "analytics",
    badge: "SCRB Rajasthan",
    title: "SCRB Rajasthan",
    hiTitle: "राज्य अपराध अभिलेख ब्यूरो (SCRB)",
    url: "https://police.rajasthan.gov.in",
    summary: "State Crime Records Bureau statistics, crime digests & circulars",
    hiSummary: "राज्य अपराध अभिलेख ब्यूरो सांख्यिकी, अपराध विवरण एवं परिपत्र"
  },
  RPA: {
    id: "RPA",
    category: "POLICE",
    icon: "military_tech",
    badge: "RPA Jaipur",
    title: "RPA Jaipur",
    hiTitle: "राजस्थान पुलिस अकादमी (RPA जयपुर)",
    url: "http://rpa.rajasthan.gov.in",
    summary: "Rajasthan Police Academy Jaipur courses, syllabus & training orders",
    hiSummary: "राजस्थान पुलिस अकादमी जयपुर कोर्स, पाठ्यक्रम एवं प्रशिक्षण आदेश"
  },
  CDTI_BPRD: {
    id: "CDTI_BPRD",
    category: "POLICE",
    icon: "policy",
    badge: "CDTI / BPR&D",
    title: "CDTI / BPR&D",
    hiTitle: "सी.डी.टी.आई. / बी.पी.आर. एंड डी.",
    url: "https://bprd.mha.gov.in",
    summary: "Bureau of Police Research & Development and Central Detective Training Institutes",
    hiSummary: "पुलिस अनुसंधान एवं विकास ब्यूरो तथा केंद्रीय गुप्तचर प्रशिक्षण संस्थान"
  },
  SSO: {
    id: "SSO",
    category: "HR_FINANCE",
    icon: "login",
    badge: "Rajasthan SSO",
    title: "SSO Rajasthan",
    hiTitle: "राजस्थान एसएसओ (SSO)",
    url: "https://sso.rajasthan.gov.in",
    summary: "Single Sign-On for RajKaj, IFMS, SIPF & e-Governance services",
    hiSummary: "राज-काज, IFMS, SIPF एवं ई-गवर्नेंस सेवाओं के लिए सिंगल साइन-ऑन"
  },
  RAJKAJ: {
    id: "RAJKAJ",
    category: "HR_FINANCE",
    icon: "description",
    badge: "e-Office / Leave",
    title: "RajKaj Portal",
    hiTitle: "राज-काज (RajKaj)",
    url: "https://rajkaj.rajasthan.gov.in",
    summary: "e-File movement, Leave, APAR/ACR, IPR & Transfer orders",
    hiSummary: "ई-फ़ाइल संचलन, अवकाश, APAR/ACR, IPR एवं स्थानांतरण आदेश"
  },
  IFMS: {
    id: "IFMS",
    category: "HR_FINANCE",
    icon: "account_balance",
    badge: "RajIFMS 3.0",
    title: "RajIFMS 3.0",
    hiTitle: "राज-आईएफएमएस 3.0 (RajIFMS 3.0)",
    url: "https://ifms.rajasthan.gov.in",
    summary: "Salary bills, Annual Increment, ACP Pay Fixation & PL Encashment",
    hiSummary: "वेतन बिल, वार्षिक वेतनवृद्धि, ACP वेतन निर्धारण एवं PL नकदीकरण"
  },
  PAYMANAGER: {
    id: "PAYMANAGER",
    category: "HR_FINANCE",
    icon: "payments",
    badge: "Pay & Bills",
    title: "PayManager",
    hiTitle: "पे-मैनेजर (PayManager)",
    url: "https://paymanager.rajasthan.gov.in/",
    summary: "Salary slips, GA-55, DDO bills & deduction schedules",
    hiSummary: "वेतन पर्ची, GA-55, DDO बिल एवं कटौती अनुसूची"
  },
  FINANCE: {
    id: "FINANCE",
    category: "HR_FINANCE",
    icon: "gavel",
    badge: "Finance Dept",
    title: "Finance Department Rajasthan",
    hiTitle: "वित्त विभाग (राजस्थान सरकार)",
    url: "https://finance.rajasthan.gov.in",
    summary: "RSR Rules, RPS 2017 Orders, DA Circulars & Financial Rules",
    hiSummary: "RSR नियम, RPS 2017 आदेश, महंगाई भत्ता परिपत्र एवं वित्तीय नियम"
  },
  SIPF: {
    id: "SIPF",
    category: "HR_FINANCE",
    icon: "savings",
    badge: "GPF / NPS / SI",
    title: "SIPF Portal",
    hiTitle: "एसआईपीएफ पोर्टल (SIPF)",
    url: "https://sipf.rajasthan.gov.in",
    summary: "State Insurance, GPF Ledger & NPS Deduction Verification",
    hiSummary: "राज्य बीमा (SI), GPF खाता एवं NPS कटौती सत्यापन"
  },
  IGOT: {
    id: "IGOT",
    category: "TRAINING",
    icon: "school",
    badge: "Mission Karmayogi",
    title: "iGOT Karmayogi",
    hiTitle: "आईगॉट कर्मयोगी (iGOT Karmayogi)",
    url: "https://igotkarmayogi.gov.in",
    summary: "Online capacity building & mandatory MDO training courses",
    hiSummary: "ऑनलाइन क्षमता निर्माण एवं अनिवार्य MDO प्रशिक्षण पाठ्यक्रम"
  },
  HCM_RIPA: {
    id: "HCM_RIPA",
    category: "TRAINING",
    icon: "apartment",
    badge: "HCM RIPA",
    title: "HCM RIPA",
    hiTitle: "एच.सी.एम. रीपा (HCM RIPA जयपुर)",
    url: "https://hcmripa.rajasthan.gov.in/",
    summary: "Harish Chandra Mathur Rajasthan State Institute of Public Administration",
    hiSummary: "हरिश्चंद्र माथुर राजस्थान राज्य लोक प्रशासन संस्थान, जयपुर"
  },
  DOPT: {
    id: "DOPT",
    category: "SERVICE_RULES",
    icon: "menu_book",
    badge: "Service Rules",
    title: "DoPT / Service Rules",
    hiTitle: "सेवा नियम एवं डीओपीटी",
    url: "https://dopt.gov.in",
    summary: "CCA Conduct Rules, Roster Reservation & Service Jurisprudence",
    hiSummary: "CCA आचरण नियम, रोस्टर आरक्षण एवं सेवा विधि"
  }
});

export const SERVICE_PORTAL_CATEGORIES = Object.freeze([
  {
    id: "POLICE",
    icon: "🚔",
    title: "Police & Crime Portals",
    hiTitle: "पुलिस एवं अपराध नियंत्रण पोर्टल",
    portalIds: ["POLICE", "CCTNS", "SCRB", "RPA", "CDTI_BPRD"]
  },
  {
    id: "HR_FINANCE",
    icon: "🏛️",
    title: "HR, Finance & Service Portals",
    hiTitle: "एचआर, वित्त एवं सेवा नियम पोर्टल",
    portalIds: ["SSO", "RAJKAJ", "IFMS", "PAYMANAGER", "FINANCE", "SIPF"]
  },
  {
    id: "TRAINING",
    icon: "🎓",
    title: "Training & Learning",
    hiTitle: "प्रशिक्षण एवं क्षमता निर्माण",
    portalIds: ["IGOT", "HCM_RIPA"]
  }
]);

export const ALL_GOVT_PORTALS = Object.values(GOVT_PORTALS);

export const MODULE_ARTICLES = Object.freeze({
  STRENGTH: {
    artType: "waves",
    tag: "Establishment & Sanctioned Cadre",
    enTitle: "Force Sanctioned vs. Working Strength Brief",
    hiTitle: "स्वीकृत एवं कार्यरत नफरी (स्थापना दिशा-निर्देश)",
    enArticle: "Track rank-wise sanctioned strength across Executive Police, Ministerial, Accounts, IT, and Class-IV cadres alongside PS/CO/Branch distribution and category-wise reservation tallies.",
    hiArticle: "कार्यकारी पुलिस, मंत्रालयिक, लेखा, आईटी एवं चतुर्थ श्रेणी संवर्ग की स्वीकृत बनाम कार्यरत नफरी, थाना/वृत्त आवंटन तथा वर्गवार (GEN/OBC/MBC/EWS/SC/ST) अद्यतन स्थिति का समेकित विश्लेषण।",
    portals: ["POLICE", "FINANCE", "RAJKAJ", "SSO"]
  },
  POSTING: {
    artType: "stones",
    tag: "Unit & Branch Deployment",
    enTitle: "Office, Circle & Police Station Posting Register",
    hiTitle: "कार्यालय, वृत्त एवं थाना पदस्थापन व्यवस्था",
    enArticle: "Compare unit-level sanctioned versus deployed personnel across SP Office branches, ASP, CO Circles, Police Stations, and Chowkis to balance operational manpower.",
    hiArticle: "एसपी कार्यालय शाखाओं, एएसपी, वृत्ताधिकारी कार्यालयों, थानों और चौकियों में स्वीकृत एवं कार्यरत नफरी का संतुलित वितरण और व्यक्तिगत सेवा विवरण प्रबंधन।",
    portals: ["POLICE", "RAJKAJ", "SSO"]
  },
  TRANSFER: {
    artType: "stones",
    tag: "Transfer Orders & Tenure Compliance",
    enTitle: "Station Tenure & Attachment Control Guidelines",
    hiTitle: "स्थानांतरण आदेश एवं थाना कार्यकाल नियम",
    enArticle: "Prevent home-station posting conflicts, audit long-standing station tenures before general transfers, and maintain separate Attachment and Deputation sheets synced with IFMS.",
    hiArticle: "गृह थाना पदस्थापन की जांच, दीर्घ कार्यकाल समीक्षा, संलग्नीकरण/प्रतिनियुक्ति पृथक पंजिका तथा मानक स्थानांतरण आदेश मुद्रण एवं राज-काज अद्यतन।",
    portals: ["RAJKAJ", "POLICE", "IFMS", "SSO"]
  },
  LEAVE: {
    artType: "waves",
    tag: "RSR Rules & 300 PL Ledger",
    enTitle: "RSR Earned Leave (300 PL) & 15-Day Encashment Rule",
    hiTitle: "आरएसआर (RSR) 300 पीएल खाता एवं 15 दिवस नकदीकरण नियम",
    enArticle: "Earned Leave credits +15 PL semi-annually on 1st January and 1st July up to the 300+15 RSR accumulation cap, with 15-day PL encashment permitted once per financial year alongside CL, HPL, ML, Paternity & CCL.",
    hiArticle: "राजस्थान सेवा नियम (RSR) के अनुसार 1 जनवरी व 1 जुलाई को अर्धवार्षिक +15 PL क्रेडिट (अधिकतम 300+15 संचय सीमा) तथा प्रति वित्तीय वर्ष 15 दिवस पीएल नकदीकरण (IFMS 3.0) एवं सीएल/एचपीएल/सीसीएल लेखा।",
    portals: ["FINANCE", "IFMS", "RAJKAJ", "SSO"]
  },
  ACP: {
    artType: "ledger",
    tag: "9 / 18 / 27 Years Financial Upgradation",
    enTitle: "ACP 9-18-27 Eligibility & Penalty Deferment Rules",
    hiTitle: "9 / 18 / 27 वर्ष एसीपी पात्रता एवं दंड प्रभाव",
    enArticle: "Evaluate 9, 18, and 27 years continuous service milestones from appointment/joining date while screening for CCA penalties and deferment periods before IFMS 3.0 pay fixation.",
    hiArticle: "नियुक्ति तिथि से 9, 18 व 27 वर्ष की संतोषजनक सेवा पूर्ण होने पर समयबद्ध वेतनमान (ACP) पात्रता, विभागीय जांच/दंड अवधि की समायोजन जांच और IFMS 3.0 वेतन निर्धारण।",
    portals: ["FINANCE", "IFMS", "SIPF", "RAJKAJ"]
  },
  PROMOTION: {
    artType: "badge",
    tag: "PCC Exam & DPC Review",
    enTitle: "Promotion Examination & DPC Eligibility Rules",
    hiTitle: "पदोन्नति परीक्षा (PCC) एवं डीपीसी पात्रता",
    enArticle: "Verify qualifying service, CCA clean-record clearance, and mandatory training prerequisites for HC/ASI/SI Promotion Cadre Course (PCC) and Departmental Promotion Committees.",
    hiArticle: "हेड कांस्टेबल/एएसआई/एसआई पदोन्नति कैडर कोर्स (PCC) व डीपीसी हेतु न्यूनतम सेवा अवधि, स्वच्छ छवि प्रमाण-पत्र एवं विभागीय आदेश निर्देश।",
    portals: ["POLICE", "RAJKAJ", "DOPT", "SSO"]
  },
  SENIORITY: {
    artType: "ledger",
    tag: "Gradation & Confirmation Roll",
    enTitle: "Cadre-Wise Seniority & Inter-Se Merit Rules",
    hiTitle: "संवर्गवार वरिष्ठता सूची एवं स्थायीकरण नियम",
    enArticle: "Maintain chronological seniority rolls by rank, appointment year, merit/belt number, and confirmation dates for transparent DPC consideration.",
    hiArticle: "संवर्ग एवं पद के अनुसार नियुक्ति वर्ष, मेरिट व बेल्ट क्रमांक आधारित अद्यतन वरिष्ठता सूची एवं स्थायीकरण अभिलेख संधारण।",
    portals: ["POLICE", "RAJKAJ", "DOPT"]
  },
  BHARTI: {
    artType: "shield",
    tag: "Probation & Confirmation",
    enTitle: "2-Year Probation Completion & Confirmation Procedure",
    hiTitle: "भर्ती बैच एवं परिवीक्षा (Probation) स्थायीकरण",
    enArticle: "Track recruitment batches from date of joining through 2-year probation completion and regular pay-matrix confirmation orders on IFMS 3.0.",
    hiArticle: "भर्ती वर्षवार कार्मिकों के 2 वर्षीय परिवीक्षाकाल पूर्ण होने पर नियमित वेतन श्रृंखला एवं स्थायीकरण आदेश जारी करने की प्रक्रिया।",
    portals: ["IFMS", "FINANCE", "POLICE", "SSO"]
  },
  INCREMENT: {
    artType: "ledger",
    tag: "1st July Annual Increment (RPS 2017)",
    enTitle: "Annual Grade Increment & Withheld Review",
    hiTitle: "1 जुलाई वार्षिक वेतनवृद्धि एवं स्थगन समीक्षा",
    enArticle: "Generate annual 1st July increment rolls under Rajasthan Civil Services (Revised Pay) Rules while flagging LWP/suspension or penalty-based stoppage cases.",
    hiArticle: "राजस्थान सिविल सेवा (संशोधित वेतनमान) नियमों के तहत 1 जुलाई वार्षिक वेतनवृद्धि पात्रता तथा असाधारण अवकाश/दंड से प्रभावित प्रकरणों की जांच।",
    portals: ["IFMS", "FINANCE", "SIPF", "SSO"]
  },
  TRAINING: {
    artType: "waves",
    tag: "iGOT, BNS/BNSS/BSA & Nomination",
    enTitle: "Course History, Nominations & iGOT Karmayogi Compliance",
    hiTitle: "प्रशिक्षण नामांकन, बीएनएस एवं आईगॉट कर्मयोगी निर्देश",
    enArticle: "Manage complete 4-stage nomination orders (Relieving, Completion with DOB, Cancellation) across Other State, In-State, DTC, Mahila Aatma Raksha, and mandatory BNS/BNSS/BSA & iGOT tracks.",
    hiArticle: "अन्य राज्य व राज्य-स्तरीय प्रशिक्षण नामांकन, रवानगी व बेतार आदेश, DOB इंद्राज द्वारा पूर्ण रिकॉर्ड अद्यतन तथा BNS/BNSS/BSA व iGOT कर्मयोगी कोर्स ट्रैकिंग।",
    portals: ["IGOT", "POLICE", "RAJKAJ", "SSO"]
  },
  PUNISHMENT: {
    artType: "shield",
    tag: "CCA Rules 1958 (Rule 16 & 17)",
    enTitle: "Departmental Inquiries & Clean Record Register",
    hiTitle: "विभागीय जांच (CCA नियम 16/17) एवं स्वच्छ अभिलेख",
    enArticle: "Log major (Rule 16) and minor (Rule 17) CCA punishments, censure/withholding periods, and surface clean-record personnel eligible for rewards and commendations.",
    hiArticle: "राजस्थान सीसीए नियम 1958 (नियम 16 व 17) के अंतर्गत दंड, परिनिंदा एवं वेतनवृद्धि रोक अवधि की प्रविष्टि तथा पुरस्कार हेतु स्वच्छ अभिलेख सूची।",
    portals: ["DOPT", "POLICE", "RAJKAJ"]
  },
  ROSTER: {
    artType: "stones",
    tag: "PS & Guard Deployment",
    enTitle: "Daily Beat, Guard & Special Law-and-Order Roster",
    hiTitle: "थाना दैनिक ड्यूटी, बीट एवं विशेष कानून-व्यवस्था रोस्टर",
    enArticle: "Prepare equitable duty rotation rosters across police stations, ceremonial guards, VIP escorts, and reserve lines.",
    hiArticle: "थानों, गार्ड ड्यूटी, वीआईपी सुरक्षा एवं रिजर्व पुलिस लाइन हेतु संतुलित चक्रानुक्रम ड्यूटी रोस्टर निर्माण।",
    portals: ["POLICE", "RAJKAJ", "SSO"]
  },
  REPORTS: {
    artType: "ledger",
    tag: "PHQ & Range Returns",
    enTitle: "Executive Force Returns & Multi-Format Export Hub",
    hiTitle: "मुख्यालय रिपोर्ट्स, रिटर्न एवं डेटा निर्यात केंद्र",
    enArticle: "Export audit-ready district establishment returns to Excel, PDF, and print formats in bilingual DevLys 010 and Times New Roman layouts.",
    hiArticle: "रेंज एवं पुलिस मुख्यालय को भेजी जाने वाली मासिक नफरी, प्रशिक्षण व सेवा विवरणी का Excel/PDF मुद्रण।",
    portals: ["POLICE", "IFMS", "RAJKAJ", "FINANCE"]
  },
  EMPLOYEES: {
    artType: "badge",
    tag: "Master Personnel Registry",
    enTitle: "Master Force Directory & Bilingual Service Slips",
    hiTitle: "समेकित कार्मिक पंजिका एवं सेवा विवरण पर्ची",
    enArticle: "Maintain verified employee profiles, education degrees, family/nominee details, and single-click printable service slips synced cleanly with OneDrive.",
    hiArticle: "प्रत्येक कार्मिक का पूर्ण सेवा विवरण, शैक्षणिक योग्यता (स्मार्ट फ़ॉन्ट सहित), और एक-क्लिक प्रिंट सेवा पर्ची प्रबंधन।",
    portals: ["RAJKAJ", "IFMS", "SIPF", "SSO"]
  },
  ARCHIVE: {
    artType: "stones",
    tag: "Relieve / Retirement / Deputation",
    enTitle: "Archived Relieved, Retired & Deputed Force Ledger",
    hiTitle: "रिलीव, सेवानिवृत्ति एवं प्रतिनियुक्ति अभिलेखागार",
    enArticle: "Preserve year-wise retirement, transfer-out, death, and deputation records with pension/dues verification references.",
    hiArticle: "सेवानिवृत्त, रिलीव, दिवंगत एवं अन्यत्र स्थानांतरित कार्मिकों का वर्षवार स्थायी अभिलेख एवं पेंशन/देय जांच संदर्भ।",
    portals: ["IFMS", "SIPF", "FINANCE", "RAJKAJ"]
  },
  DEV_SERVICES: {
    artType: "waves",
    tag: "OneDrive Sync & Backup Console",
    enTitle: "Cloud Sync, Offline Backups & District Diagnostic Tools",
    hiTitle: "वनड्राइव सिंक, ऑफ़लाइन बैकअप एवं पोर्टल नियंत्रण केंद्र",
    enArticle: "Monitor real-time OneDrive synchronization, export/restore encrypted JSON district snapshots, and manage master Excel templates.",
    hiArticle: "जिला स्तर पर OneDrive रीयल-टाइम सिंक, JSON पूर्ण बैकअप और मास्टर एक्सेल डेटाबेस रखरखाव।",
    portals: ["SSO", "RAJKAJ", "IFMS"]
  }
});
