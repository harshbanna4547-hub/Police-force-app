// src/forceLogic.js
import { devToHindi } from "./utils/devlysConverter.js";

export const CADRE_GROUPS = [
  {
    id: "IPS_OFFICERS",
    title: "आई. पी. एस. अधिकारी (IPS Officers)",
    ranks: [{ code: "SP", label: "पुलिस अधीक्षक (SP)" }]
  },
  {
    id: "RPS_OFFICERS",
    title: "आर. पी. एस. अधिकारी (RPS Officers)",
    ranks: [
      { code: "ASP", label: "अतिरिक्त पुलिस अधीक्षक (ASP)" },
      { code: "DYSP", label: "पुलिस उप अधीक्षक (DySP)" }
    ]
  },
  {
    id: "CI_GROUP",
    title: "पुलिस निरीक्षक (Inspector/CI)",
    ranks: [
      { code: "CI", label: "पुलिस निरीक्षक (सामान्य)" },
      { code: "MTO", label: "पु.नि. (एम.टी. / MTO)" }
    ]
  },
  {
    id: "SI_GROUP",
    title: "उप निरीक्षक (Sub Inspector)",
    ranks: [
      { code: "SI", label: "पुलिस उप निरीक्षक (सामान्य)" },
      { code: "SI_MT", label: "उ.नि. (एम.टी.)" },
      { code: "SI_ARM", label: "उ.नि. (आर्मरर)" },
      { code: "SI_BAND", label: "उ.नि. (बैण्ड)" },
      { code: "SI_BUGL", label: "उ.नि. (बिगुलर)" }
    ]
  },
  {
    id: "ASI_GROUP",
    title: "सहायक उप निरीक्षक (ASI)",
    ranks: [
      { code: "ASI", label: "सहायक उप निरीक्षक (सामान्य)" },
      { code: "ASI_MT", label: "स.उ.नि. (एम.टी.)" },
      { code: "ASI_ARM", label: "स.उ.नि. (आर्मरर)" },
      { code: "ASI_BAND", label: "स.उ.नि. (बैण्ड)" }
    ]
  },
  {
    id: "HC_GROUP",
    title: "हैड कानिस्टेबल (HC)",
    ranks: [
      { code: "HC", label: "हैड कानिस्टेबल (सामान्य)" },
      { code: "MT_HC", label: "हैड कानि. (एम.टी.)" },
      { code: "ARM_HC", label: "हैड कानि. (आर्मरर)" },
      { code: "BAND_HC", label: "हैड कानि. (बैण्ड)" },
      { code: "DOG_HC", label: "हैड कानि. (श्वान दल)" }
    ]
  },
  {
    id: "FC_GROUP",
    title: "कानिस्टेबल (FC)",
    ranks: [
      { code: "CT", label: "कानिस्टेबल (सामान्य)" },
      { code: "MT_CT", label: "कानि. (एम.टी. / चालक)" },
      { code: "BAND_CT", label: "कानि. (बैण्ड)" },
      { code: "ARM_CT", label: "कानि. (आर्मरर)" },
      { code: "BUGLER_CT", label: "कानि. (बिगुलर)" },
      { code: "DOG_CT", label: "कानि. (श्वान दल)" },
      { code: "MOUNTED_CT", label: "कानि. (घुड़सवार)" }
    ]
  },
  {
    id: "MINISTERIAL_CADRE",
    title: "मंत्रालयिक संवर्ग (Ministerial)",
    ranks: [
      { code: "AO_MIN", label: "प्रशासनिक अधिकारी (AO)" },
      { code: "ADDL_AO", label: "अतिरिक्त प्रशासनिक अधिकारी (Addl. AO)" },
      { code: "AAO_MIN", label: "सहायक प्रशासनिक अधिकारी (AAO)" },
      { code: "STENO", label: "स्टेनो (STENO PA-II)" },
      { code: "SR_ASST", label: "वरिष्ठ सहायक (Sr. Assistant)" },
      { code: "JR_ASST", label: "कनिष्ठ सहायक / लिपिक ग्रेड-II (Jr. Assistant)" }
    ]
  },
  {
    id: "ACCOUNTS_CADRE",
    title: "लेखा संवर्ग (Accounts)",
    ranks: [
      { code: "AO_ACCT", label: "लेखाधिकारी (Accounts Officer)" },
      { code: "AAO_1", label: "सहायक लेखाधिकारी प्रथम (AAO-I)" },
      { code: "AAO_2", label: "सहायक लेखाधिकारी द्वितीय (AAO-II)" },
      { code: "JR_ACCT", label: "कनिष्ठ लेखाकार (Jr. Accountant)" }
    ]
  },
  {
    id: "IT_CADRE",
    title: "आईटी संवर्ग (IT)",
    ranks: [
      { code: "PROGRAMMER", label: "प्रोग्रामर / डेटा एनालिस्ट" },
      { code: "IA", label: "सूचना सहायक (Informatics Assistant)" }
    ]
  },
  {
    id: "CLASS_4_CADRE",
    title: "चतुर्थ श्रेणी संवर्ग (Class-IV)",
    ranks: [
      { code: "COOK", label: "कुक (लांगरी)" },
      { code: "JAMADAR", label: "जमादार" },
      { code: "C4_GEN", label: "च.श्रे. कर्म. (साधारण)" },
      { code: "SYCE", label: "सईस (Syce)" },
      { code: "JALDHARI", label: "जलधारी" },
      { code: "WATERMAN", label: "जलवाहक (वाटरमेन)" },
      { code: "BAGWAN", label: "बागवान / माली" },
      { code: "WASHERMAN", label: "धोबी" },
      { code: "BARBER", label: "नाई" },
      { code: "SWEEPER", label: "स्वीपर (सफाई कर्मचारी)" },
      { code: "BHISHTI", label: "भिश्ती" },
      { code: "FARASH", label: "फराश" },
      { code: "HELPER", label: "हेल्पर" },
      { code: "PEON", label: "चपरासी" },
      { code: "COBBLER", label: "कोबलर (मोची)" },
      { code: "KENNEL_BOY", label: "केनलबाय" },
      { code: "TAILOR", label: "टेलर (दर्जी)" }
    ]
  }
];

export const DEFAULT_SANCTIONED = {
  SP: 1, ASP: 4, DYSP: 12,
  CI: 38, MTO: 1,
  SI: 71, SI_MT: 3, SI_ARM: 1, SI_BAND: 0, SI_BUGL: 0,
  ASI: 279, ASI_MT: 0, ASI_ARM: 0, ASI_BAND: 0,
  HC: 371, MT_HC: 22, ARM_HC: 2, BAND_HC: 2, DOG_HC: 0,
  CT: 1524, MT_CT: 95, BAND_CT: 9, ARM_CT: 4, BUGLER_CT: 0, DOG_CT: 0, MOUNTED_CT: 0,
  AO_MIN: 1, ADDL_AO: 2, AAO_MIN: 3, STENO: 1, SR_ASST: 5, JR_ASST: 10,
  AO_ACCT: 1, AAO_1: 0, AAO_2: 1, JR_ACCT: 0,
  PROGRAMMER: 1, IA: 1,
  COOK: 10, JAMADAR: 1, C4_GEN: 3, SYCE: 0, JALDHARI: 0,
  WATERMAN: 1, BAGWAN: 1, WASHERMAN: 1, BARBER: 2, SWEEPER: 2,
  BHISHTI: 0, FARASH: 1, HELPER: 0, PEON: 0, COBBLER: 1,
  KENNEL_BOY: 0, TAILOR: 1
};

export const normalizeUnitText = (value) => String(value || "")
  .toLocaleLowerCase()
  .replace(/चितौडगढ़|चितौड़गढ़|चित्तौडगढ|चित्तौड़गढ|चित्तौडगढ़/g, "चित्तौड़गढ़")
  .replace(/निंबाहेड़ा|निम्बाहेडा|निंबाहेडा|निम्बाहेड़ा/g, "निम्बाहेड़ा")
  .replace(/बेगूँ|बेगू|बेंगु|बैगूं|बैंगू|बैगू|बेगूं/g, "बेगूं")
  .replace(/भैसरोडगढ|भैसरोड़गढ़|भैसरोडगढ़|भैंसरोड़गढ/g, "भैंसरोड़गढ़")
  .replace(/भादसोडा|भादसौड़ा|भदसौड़ा|भदसोडा/g, "भदसोड़ा")
  .replace(/निकुंभ|निकंम|निकुम्भ/g, "निकुम्भ")
  .replace(/बिजयपुर|विजयपुर/g, "विजयपुर")
  .replace(/साड़ास|साडास/g, "साडास")
  .replace(/डूँगला|डंगला|डूंगला/g, "डूंगला")
  .replace(/शंभूपुरा|शंम्भुपुरा|शम्भूपुरा/g, "शम्भूपुरा")
  .replace(/मंगलवाड|मंगलवाड़/g, "मंगलवाड़")
  .replace(/भदसेर|भदेसर/g, "भदेसर")
  .replace(/भोपालसागर|भूपालसागर/g, "भूपालसागर")
  .replace(/बड़ीसादड़ी|बडी सादडी|बडीसादड़ी|बड़ी सादड़ी/g, "बड़ीसादड़ी")
  .replace(/चंदेरिया|चन्देरिया/g, "चन्देरिया")
  .replace(/सैंती|सेंती|सेती/g, "सैंती")
  .replace(/साईबर|साइबर/g, "साइबर")
  .replace(/लाईन|लाइन/g, "लाइन")
  .replace(/सेल|सैल/g, "सेल")
  .replace(/वृत्त्वा|वृत|वृत्त/g, "वृत्त")
  .replace(/अतिरिक्त/g, "अति")
  .replace(/पु\.?\s*था\.?|पुलिस\s+थाना/g, "थाना")
  .replace(/पु\.?\s*च\.?|पुलिस\s+चौकी/g, "चौकी")
  .replace(/[().,/\-–—]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const unitVariants = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const rawNorm = normalizeUnitText(raw);
  const convertedNorm = /[\u0900-\u097F]/.test(raw) ? rawNorm : normalizeUnitText(devToHindi(raw));
  return [...new Set([rawNorm, convertedNorm].filter(Boolean))];
};

const UNIT_ALIASES = new Map([
  // SP Office & Branches
  ["कार्यालय पुलिस अधीक्षक चित्तौड़गढ़ (SPO)", ["dk;kZy; iqfyl v/kh{kd", "iqfyl v/kh{kd dk;kZy;", "dk;kZy; iq v", "SP Office", "SPO", "S P Office", "पुलिस अधीक्षक कार्यालय", "पुलिस अधीक्षक"]],
  ["अपराध शाखा (Crime Branch)", ["vijk/k 'kk[kk", "dzkbZe 'kk[kk", "Crime Branch", "अपराध शाखा", "क्राइम ब्रांच", "गुमशुदा", "कायर् प्रणाली", "कार्य प्रणाली"]],
  ["एमओबी शाखा (MOB)", ["MOB", "M O B", "एमओबी", "एम ओ बी", "एमओबी शाखा"]],
  ["विविध शाखा (Vividh / General Branch)", ["fofo/k 'kk[kk", "vkod tkod", "Vividh", "General Branch", "विविध शाखा", "आवक जावक", "सम्पर्क"]],
  ["लेखा शाखा (Account Branch)", ["ys[kk 'kk[kk", "Account Branch", "Accounts Branch", "लेखा शाखा", "अकाउन्ट"]],
  ["एफ.एस.एल. शाखा (FSL)", ["FSL", "F S L", "एफएसएल", "एफ एस एल", "एफएसएल शाखा"]],
  ["जिला विशेष शाखा (DSB)", ["DSB", "D S B", "ftYk fo'ks\"k 'kk[kk", "xqIr 'kk[kk", "जिला विशेष शाखा", "जिला विशोष", "गुप्त शाखा"]],
  ["स्थापना शाखा (Force Branch)", ["LFkkiuk 'kk[kk", "Qksjl 'kk[kk", "laLFkkiu", "Force Branch", "Establishment Branch", "स्थापना शाखा", "फोर्स शाखा", "संस्थापन"]],
  ["साइबर सेल (Cyber Cell)", ["lkbZcj lsy", "lkbZcj lSy", "Cyber Cell", "साइबर सेल", "साईबर सेल"]],
  ["पी.ए. शाखा (PA Branch)", ["PA Branch", "P A Branch", "पीए शाखा", "पी ए शाखा", "स्टेनो"]],
  ["डी.ई. / पी.ई. शाखा (DE/PE Branch)", ["DE PE", "DE Branch", "PE Branch", "डीई", "पीई", "डी ई", "पी ई"]],
  ["डीसीआरबी (DCRB)", ["DCRB", "D C R B", "डीसीआरबी", "डी सी आर बी"]],
  ["यातायात शाखा (Traffic Branch)", [";krk;kr 'kk[kk", ";krk;kr", "VªsfQd", "Traffic Branch", "Traffic Police", "Traffic", "यातायात शाखा", "यातायात पुलिस", "परिवहन"]],
  ["मानव तस्करी विरोधी यूनिट (AHTU)", ["AHTU", "A H T U", "मानव तस्करी", "मानव तस्करी विरोधी यूनिट"]],
  ["सम्मन वारन्ट सेल (Summon Warrant)", ["lEeu okjUV", "Summon Warrant", "Summon Cell", "सम्मन वारन्ट", "सम्मन सेल"]],
  ["एससी/एसटी सेल (SC/ST Cell)", ["SC ST Cell", "SC/ST Cell", "एससी एसटी सेल", "अनु जाति सेल"]],

  // ASP Offices
  ["कार्यालय अति. पुलिस अधीक्षक (मुख्यालय) (ASP HQ)", ["ASP HQ", "ASP Office", "Addl SP HQ", "vfr iqfyl v/kh{kd eq[;ky;", "अति पुलिस अधीक्षक मुख्यालय", "अतिरिक्त पुलिस अधीक्षक मुख्यालय"]],
  ["कार्यालय अति. पुलिस अधीक्षक रावतभाटा", ["ASP Rawatbhata", "Addl SP Rawatbhata", "vfr iqfyl v/kh{kd jkorHkkVk", "अति पुलिस अधीक्षक रावतभाटा", "अतिरिक्त पुलिस अधीक्षक रावतभाटा"]],
  ["अति. पुलिस अधीक्षक महिला अपराध अनुसंधान सैल (SIUCAW)", ["SIUCAW", "efgyk vijk/k vuqla/kku lSy", "महिला अपराध अनुसंधान सेल", "महिला उत्पीडन", "महिला यौन"]],
  ["अति. पुलिस अधीक्षक त्वरित अनुसंधान सैल (IUCAW)", ["IUCAW", "Rofjr vuqla/kku lSy", "त्वरित अनुसंधान सेल"]],

  // CO Offices
  ["वृत्त कार्यालय चित्तौड़गढ़ शहर", ["CO City", "CO Chittorgarh", "CO Chittorgarh City", "o`Rr dk;kZy; 'kgj", "o`Rrkf/kdkjh 'kgj", "वृत्त कार्यालय शहर", "वृत्ताधिकारी शहर", "सीओ शहर"]],
  ["वृत्त कार्यालय चित्तौड़गढ़ ग्रामीण", ["CO Rural", "CO Chittorgarh Rural", "o`Rr xzkeh.k", "o`Rrkf/kdkjh xzkeh.k", "वृत्त ग्रामीण", "वृत्ताधिकारी ग्रामीण", "सीओ ग्रामीण"]],
  ["वृत्त कार्यालय निम्बाहेड़ा", ["CO Nimbahera", "o`Rr fuEckgsM+k", "o`Rrkf/kdkjh fuEckgsM+k", "वृत्त निम्बाहेड़ा", "वृत्ताधिकारी निम्बाहेड़ा", "सीओ निम्बाहेड़ा"]],
  ["वृत्त कार्यालय गंगरार", ["CO Gangrar", "o`Rr xaxjkj", "o`Rrkf/kdkjh xaxjkj", "वृत्त गंगरार", "वृत्ताधिकारी गंगरार", "सीओ गंगरार"]],
  ["वृत्त कार्यालय बेगूं", ["CO Begun", "o`Rr csxw¡", "o`Rrkf/kdkjh csxw¡", "वृत्त बेगूं", "वृत्ताधिकारी बेगूं", "सीओ बेगूं"]],
  ["वृत्त कार्यालय रावतभाटा", ["CO Rawatbhata", "o`Rr jkorHkkVk", "o`Rrkf/kdkjh jkorHkkVk", "वृत्त रावतभाटा", "वृत्ताधिकारी रावतभाटा", "सीओ रावतभाटा"]],
  ["वृत्त कार्यालय कपासन", ["CO Kapasan", "o`Rr diklu", "o`Rrkf/kdkjh diklu", "वृत्त कपासन", "वृत्ताधिकारी कपासन", "सीओ कपासन"]],
  ["वृत्त कार्यालय भदेसर", ["CO Bhadesar", "o`Rr Hknslj", "o`Rrkf/kdkjh Hknslj", "वृत्त भदेसर", "वृत्ताधिकारी भदेसर", "सीओ भदेसर"]],
  ["वृत्त कार्यालय बड़ीसादड़ी", ["CO Barisadri", "CO Badisadri", "o`Rr cM+hlknM+h", "o`Rrkf/kdkjh cM+hlknM+h", "वृत्त बड़ीसादड़ी", "वृत्ताधिकारी बड़ीसादड़ी", "सीओ बड़ीसादड़ी"]],

  // Police Stations
  ["थाना कोतवाली चित्तौड़गढ़", ["Fkkuk dksrokyh", "Fkkuk dksrokyh fprkSMx<+", "Fkkuk dksrokyh fpÙkkSMx<+", "PS Kotwali", "PS Kotwali Chittorgarh", "Thana Kotwali", "थाना कोतवाली"]],
  ["थाना सदर चित्तौड़गढ़", ["Fkkuk lnj", "Fkkuk lnj fpÙkkSMx<+", "PS Sadar", "PS Sadar Chittorgarh", "Thana Sadar Chittorgarh", "थाना सदर"]],
  ["थाना महिला चित्तौड़गढ़", ["efgyk Fkkuk", "Fkkuk efgyk", "PS Mahila", "Mahila Thana", "थाना महिला", "महिला थाना"]],
  ["थाना साइबर चित्तौड़गढ़", ["lkbZcj Fkkuk", "Fkkuk lkbZcj", "PS Cyber", "Cyber PS", "Cyber Thana", "थाना साइबर", "साइबर थाना"]],
  ["थाना चन्देरिया", ["Fkkuk pUnsfj;k", "pUnsfj;k", "PS Chanderiya", "Thana Chanderiya"]],
  ["थाना बस्सी", ["Fkkuk cLlh", "cLlh", "PS Bassi", "Thana Bassi"]],
  ["थाना गंगरार", ["Fkkuk xaxjkj", "xaxjkj", "PS Gangrar", "Thana Gangrar"]],
  ["थाना बेगूं", ["Fkkuk csxw¡", "Fkkuk csxwa", "Fkkuk csaxw", "PS Begun", "Thana Begun"]],
  ["थाना रावतभाटा", ["Fkkuk jkorHkkVk", "jkorHkkVk", "PS Rawatbhata", "Thana Rawatbhata"]],
  ["थाना भैंसरोड़गढ़", ["Fkkuk HkasljksM+x<+", "HkasljksM+x<+", "PS Bhainsrorgarh", "Thana Bhainsrorgarh"]],
  ["थाना कोतवाली निम्बाहेड़ा", ["Fkkuk dksrokyh fuEckgsM+k", "Fkkuk fuEckgsM+k", "PS Kotwali Nimbahera", "PS Nimbahera", "Thana Kotwali Nimbahera", "थाना निम्बाहेड़ा"]],
  ["थाना सदर निम्बाहेड़ा", ["Fkkuk lnj fuEckgsM+k", "PS Sadar Nimbahera", "Thana Sadar Nimbahera"]],
  ["थाना कपासन", ["Fkkuk diklu", "diklu", "PS Kapasan", "Thana Kapasan"]],
  ["थाना भूपालसागर", ["Fkkuk Hkwikylkxj", "Hkwikylkxj", "PS Bhupalsagar", "Thana Bhupalsagar"]],
  ["थाना राशमी", ["Fkkuk jk'keh", "jk'keh", "PS Rashmi", "Thana Rashmi"]],
  ["थाना भदेसर", ["Fkkuk Hknslj", "Hknslj", "PS Bhadesar", "Thana Bhadesar"]],
  ["थाना भदसोड़ा", ["Fkkuk HknlksM+k", "HknlksM+k", "PS Bhadsoda", "Thana Bhadsoda"]],
  ["थाना मण्डफिया", ["Fkkuk e.MfQ;k", "e.MfQ;k", "PS Mandaphia", "Thana Mandaphia"]],
  ["थाना आकोला", ["Fkkuk vkdksyk", "vkdksyk", "PS Akola", "Thana Akola"]],
  ["थाना कनेरा", ["Fkkuk dusjk", "dusjk", "PS Kanera", "Thana Kanera"]],
  ["थाना निकुम्भ", ["Fkkuk fudqEHk", "fudqEHk", "PS Nikumbh", "Thana Nikumbh"]],
  ["थाना बड़ीसादड़ी", ["Fkkuk cM+hlknM+h", "Fkkuk cMhlknMh", "cM+hlknM+h", "PS Barisadri", "PS Badisadri", "Thana Barisadri"]],
  ["थाना डूंगला", ["Fkkuk Mw¡xyk", "Mw¡xyk", "PS Dungla", "Thana Dungla"]],
  ["थाना मंगलवाड़", ["Fkkuk eaxyokM+", "eaxyokM+", "PS Mangalwar", "Thana Mangalwar"]],
  ["थाना पारसोली", ["Fkkuk ikjlksyh", "ikjlksyh", "PS Parsoli", "Thana Parsoli"]],
  ["थाना शम्भूपुरा", ["Fkkuk 'kEHkwiqjk", "'kEHkwiqjk", "PS Shambhupura", "Thana Shambhupura"]],
  ["थाना विजयपुर", ["Fkkuk fot;iqj", "fot;iqj", "PS Vijaypur", "Thana Vijaypur"]],
  ["थाना जावदा", ["Fkkuk tko+nk", "Fkkuk tkoank", "tko+nk", "PS Jawada", "Thana Jawada"]],
  ["थाना साडास", ["Fkkuk lkMkl", "lkMkl", "PS Sadas", "Thana Sadas"]],

  // Reserve Police Line
  ["पुलिस लाईन चित्तौड़गढ़ (RPL)", ["iqfyl ykbZu", "iqfyl ykbZu fpÙkkSMx<+", "fjtoZ iqfyl ykbZu", "Police Line", "Reserve Police Line", "RPL", "R P L", "MTO", "एमटीओ", "संचित निरीक्षक", "पुलिस लाइन"]],
  ["अभय कमाण्ड सेन्टर (Abhay Command)", ["vHk; dek.M", "Abhay Command", "Abhay Command Center", "अभय कमाण्ड"]],
  ["पुलिस नियंत्रण कक्ष (Police Control Room)", ["fu;a=.k d{k", "Control Room", "Police Control Room", "PCR", "नियंत्रण कक्ष"]],
  ["जिला प्रशिक्षण केन्द्र (District Training Center - DTC)", ["DTC", "D T C", "District Training Center", "जिला प्रशिक्षण केन्द्र", "डीटीसी"]]
]);

export function matchEmployeeToUnit(posting, unit) {
  const postingVariants = unitVariants(posting);
  if (!postingVariants.length) return false;
  const unitText = String(unit || "").trim();
  const aliases = UNIT_ALIASES.get(unitText) || [];
  const candidates = [...new Set([unitText, ...aliases].flatMap(unitVariants))];

  return postingVariants.some((postingText) => candidates.some((variant) => (
    postingText === variant ||
    (variant.length >= 4 && postingText.includes(variant)) ||
    (postingText.length >= 6 && variant.includes(postingText))
  )));
}

export function matchesEmployeeSearch(employee, query, fields = ["NAME", "FATHER NAME", "CADER", "BELT NO", "POSTING"]) {
  const normalizedQuery = normalizeUnitText(query);
  if (!normalizedQuery) return true;
  const rawQuery = String(query || "").trim().toLocaleLowerCase();

  return fields.some((field) => {
    const raw = String(employee?.[field] ?? "").trim();
    if (!raw) return false;
    if (raw.toLocaleLowerCase().includes(rawQuery)) return true;
    const converted = /[\u0900-\u097F]/.test(raw) ? raw : devToHindi(raw);
    return (
      converted.toLocaleLowerCase().includes(rawQuery) ||
      normalizeUnitText(raw).includes(normalizedQuery) ||
      normalizeUnitText(converted).includes(normalizedQuery)
    );
  });
}

export function getEmployeeGender(employee) {
  const genderValue = [
    employee?.GENDER,
    employee?.Gender,
    employee?.SEX,
    employee?.Sex,
    employee?.लिंग,
    employee?.["M/F"],
    employee?.["GENDER (M/F)"]
  ].find((value) => String(value || "").trim());
  const gender = String(genderValue || "").trim().toLocaleLowerCase();
  if (/^(f|female|woman|women|महिला|स्त्री)$/.test(gender) || /\b(mhc|mfc)\b/i.test(`${employee?.CADER || ""} ${employee?.["BELT NO"] || ""}`)) {
    return "FEMALE";
  }
  if (/^(m|male|man|men|पुरुष)$/.test(gender)) return "MALE";
  return "UNKNOWN";
}

export function filterEmployeesByGender(records = [], filter = "ALL") {
  if (filter === "ALL") return records;
  return records.filter((employee) => getEmployeeGender(employee) === filter);
}

export function mapRankToCode(rankRaw = "", beltRaw = "") {
  const r = `${rankRaw} ${beltRaw}`.toUpperCase();
  if (r.includes("SP") && !r.includes("ASP") && !r.includes("DY")) return "SP";
  if (r.includes("ASP") || r.includes("ADDL")) return "ASP";
  if (r.includes("DYSP") || r.includes("DSP") || r.includes("CO ")) return "DYSP";
  if (r.includes("MTO")) return "MTO";
  if (r.includes("CI") || r.includes("INSPECTOR")) return "CI";

  const isMt = r.includes("MT") || r.includes("DRV") || r.includes("DRIVER") || r.includes("चालक");
  const isArm = r.includes("ARM") || r.includes("आर्मरर") || r.includes("आर्मोरर");
  const isBand = r.includes("BAND") || r.includes("बैण्ड") || r.includes("बैंड");
  const isBugl = r.includes("BUGL") || r.includes("बिगुल");
  const isDog = r.includes("DOG") || r.includes("SWAN") || r.includes("श्वान");
  const isMnt = r.includes("MOUNT") || r.includes("HORSE") || r.includes("घुड़") || r.includes("सवार");

  if (r.includes("ASI")) {
    if (isMt) return "ASI_MT";
    if (isArm) return "ASI_ARM";
    if (isBand) return "ASI_BAND";
    return "ASI";
  }
  if (r.includes("SI") && !r.includes("ASI")) {
    if (isMt) return "SI_MT";
    if (isArm) return "SI_ARM";
    if (isBand) return "SI_BAND";
    if (isBugl) return "SI_BUGL";
    return "SI";
  }
  if (r.includes("HC") || r.includes("HEAD") || r.includes("हैड")) {
    if (isMt) return "MT_HC";
    if (isArm) return "ARM_HC";
    if (isBand) return "BAND_HC";
    if (isDog) return "DOG_HC";
    return "HC";
  }

  if (r.includes("PROG") || r.includes("ANALYST")) return "PROGRAMMER";
  if (r.includes("IA") || r.includes("सूचना")) return "IA";
  if (r.includes("ADDL") && r.includes("AO")) return "ADDL_AO";
  if (r.includes("AAO-I") || r.includes("AAO 1")) return "AAO_1";
  if (r.includes("AAO-II") || r.includes("AAO 2") || (r.includes("AAO") && (r.includes("ACCT") || r.includes("लेखा")))) return "AAO_2";
  if (r.includes("AO") && !r.includes("AAO") && (r.includes("ACCT") || r.includes("लेखा"))) return "AO_ACCT";
  if (r.includes("ACCT") || r.includes("लेखा")) return "JR_ACCT";
  if (r.includes("STENO") || r.includes("स्टेनो")) return "STENO";
  if (r.includes("AO") && !r.includes("AAO")) return "AO_MIN";
  if (r.includes("AAO")) return "AAO_MIN";
  if (r.includes("SR") && r.includes("ASST")) return "SR_ASST";
  if ((r.includes("JR") && r.includes("ASST")) || r.includes("LDC") || r.includes("लिपिक")) return "JR_ASST";

  const class4Map = [
    ["COOK", "COOK"], ["JAMADAR", "JAMADAR"], ["SYCE", "SYCE"],
    ["JALDHARI", "JALDHARI"], ["WATERMAN", "WATER"], ["BAGWAN", "BAGWAN"],
    ["BAGWAN", "MALI"], ["WASHERMAN", "WASH"], ["BARBER", "BARBER"],
    ["SWEEPER", "SWEEP"], ["BHISHTI", "BHISHTI"], ["FARASH", "FARASH"],
    ["HELPER", "HELPER"], ["PEON", "PEON"], ["COBBLER", "COBBLER"],
    ["KENNEL_BOY", "KENNEL"], ["TAILOR", "TAILOR"], ["C4_GEN", "CLASS"]
  ];
  for (const [cKey, kw] of class4Map) {
    if (r.includes(kw)) return cKey;
  }

  if (isMt) return "MT_CT";
  if (isBand) return "BAND_CT";
  if (isArm) return "ARM_CT";
  if (isBugl) return "BUGLER_CT";
  if (isDog) return "DOG_CT";
  if (isMnt) return "MOUNTED_CT";
  return "CT";
}

export function parseAnyDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === "number") {
    const utcDays = Math.floor(val - 25569);
    return new Date(utcDays * 86400 * 1000);
  }
  const str = String(val).trim();
  const match = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(str);
  return isNaN(parsed) ? null : parsed;
}

export function calcRetirementDate(dobVal) {
  const dob = parseAnyDate(dobVal);
  if (!dob) return null;
  const retYear = dob.getFullYear() + 60;
  const day = dob.getDate();
  const month = dob.getMonth();

  if (day === 1) {
    if (month === 0) return new Date(retYear - 1, 11, 31);
    return new Date(retYear, month, 0);
  } else {
    return new Date(retYear, month + 1, 0);
  }
}

export function formatDateDDMMYYYY(dt) {
  if (!dt) return "-";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}
