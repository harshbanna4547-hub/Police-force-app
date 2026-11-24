// src/utils/devlysConverter.js

const EXACT_DICTIONARY = [
  ["fpÙkkSMx<+", "चित्तौड़गढ़"], ["fpRrkSMx<+", "चित्तौड़गढ़"], ["fpRrkSMx<", "चित्तौड़गढ़"], ["fprkSM+x<+", "चित्तौड़गढ़"],
  ["jkorHkkVk", "रावतभाटा"], ["fuEckgsM+k", "निम्बाहेड़ा"], ["fuEckgsMk", "निम्बाहेड़ा"],
  ["cM+hlknM+h", "बड़ीसादड़ी"], ["cMhlknMh", "बड़ीसादड़ी"], ["pUnsfj;k", "चन्देरिया"],
  ["Hkwikylkxj", "भूपालसागर"], ["HkasljksM+x<+", "भैंसरोड़गढ़"], ["ikjlksyh", "पारसोली"],
  ["'kEHkwiqjk", "शम्भूपुरा"], ["Hknslj", "भदेसर"], ["csxw¡", "बेगूं"], ["csxwa", "बेगूं"], ["csaxw", "बेगूं"],
  ["xaxjkj", "गंगरार"], ["diklu", "कपासन"], ["cLlh", "बस्सी"], ["jk'keh", "राशमी"], ["lkMkl", "साडास"],
  ["HknlksM+k", "भदसोड़ा"], ["e.MfQ;k", "मण्डफिया"], ["vkdksyk", "आकोला"], ["dusjk", "कनेरा"],
  ["fudqEHk", "निकुम्भ"], ["Mw¡xyk", "डूंगला"], ["eaxyokM+", "मंगलवाड़"], ["fot;iqj", "विजयपुर"], ["tko+nk", "जावदा"],
  ["Rofjr vuqla/kku lSy", "त्वरित अनुसंधान सैल"], ["Rofjr", "त्वरित"],
  ["efgyk vijk/k vuqla/kku lSy", "महिला अपराध अनुसंधान सैल"], ["vijk/k vuqla/kku lSy", "अपराध अनुसंधान सैल"],
  ["o`Rrkf/kdkjh", "वृत्ताधिकारी"], ["o`rkf/kdkjh", "वृत्ताधिकारी"], ["o`Rr dk;kZy;", "वृत्त कार्यालय"],
  ["Fkkukf/kdkjh", "थानाधिकारी"], ["Fkkuk", "थाना"], ["dksrokyh", "कोतवाली"], ["lnj", "सदर"],
  ["vfrfjDr iqfyl v/kh{kd", "अतिरिक्त पुलिस अधीक्षक"], ["vfr- iqfyl v/kh{kd", "अति. पुलिस अधीक्षक"],
  ["iqfyl v/kh{kd", "पुलिस अधीक्षक"], ["iqfyl mi v/kh{kd", "पुलिस उप अधीक्षक"], ["mi v/kh{kd", "उप अधीक्षक"],
  ["¼eq[;ky;½", "(मुख्यालय)"], ["eq[;ky;", "मुख्यालय"], ["dzkbZe", "क्राइम"], [";krk;kr", "यातायात"],
  ["lkbZcj", "साइबर"], ["efgyk", "महिला"], ["dk;kZy;", "कार्यालय"], ["iqfyl ykbZu", "पुलिस लाईन"],
  ["gky iq0v0", "हाल पु.अ."], ["uoinksUur", "नवपदोन्नत"], ["Jh ", "श्री "], ["Jhefr ", "श्रीमती "], ["lqJh ", "सुश्री "]
];

const DEVLYS_MAP = [
  // 1. संयुक्त व्यंजन
  ["ç", "प्र"], ["iz", "प्र"], ["Ø", "क्र"], ["æ", "द्र"], ["nz", "द्र"],
  ["=k", "त्र"], ["=", "त्र्"], ["K", "ज्ञ"], ["{k", "क्ष"], ["{", "क्ष्"],
  ["Jks", "श्रो"], ["Js", "श्रे"], ["J+", "श्रृ"], ["J", "श्र"], ["Ük", "श्र"], ["Ü", "श्"],
  ["Ùk", "त्त"], ["Ù", "त्त्"], ["Í", "द्द"], ["Ì", "द्ध"], ["í", "ट्ट"],
  ["î", "ट्ठ"], ["ï", "ड्ड"], ["ð", "ढ्ढ"], ["ì", "ह्न"], ["à", "ह्म"],
  ["á", "ह्य"], ["â", "ह्ल"], ["ã", "ह्व"], ["º", "हृ"], ["‰", "झ"],
  ["Å", "ऊ"], ["vks", "ओ"], ["vkS", "औ"], ["vk", "आ"], ["v", "अ"],
  ["bZ", "ई"], ["b", "इ"], ["m", "उ"], [",s", "ऐ"], [",", "ए"], ["_", "ऋ"],

  // 2. दो-अक्षर वाले पूरे व्यंजन (आकार सहित)
  ["[k", "ख"], ["?k", "घ"], [".k", "ण"], ["Fk", "थ"], ["/k", "ध"],
  ["Hk", "भ"], ["'k", "श"], ["\"k", "ष"],

  // 3. एक-अक्षर वाले व्यंजन
  ["l", "स"], ["d", "क"], ["x", "ग"], ["p", "च"], ["N", "छ"], ["t", "ज"],
  [">", "झ"], ["Ö", "झ"], ["V", "ट"], ["B", "ठ"], ["M", "ड"], ["<", "ढ"],
  ["r", "त"], ["n", "द"], ["u", "न"], ["i", "प"], ["Q", "फ"], ["c", "ब"],
  ["e", "म"], [";", "य"], ["j", "र"], ["y", "ल"], ["o", "व"], ["g", "ह"], ["G", "ळ"],

  // 4. आधे अक्षर (Consonant + Halant)
  ["D", "क्"], ["[", "ख्"], ["X", "ग्"], ["?", "घ्"], ["P", "च्"],
  ["T", "ज्"], ["¶", "झ्"], [".", "ण्"], ["R", "त्"], ["F", "थ्"],
  ["/", "ध्"], ["U", "न्"], ["I", "प्"], ["C", "ब्"],
  ["H", "भ्"], ["E", "म्"], ["¸", "य्"], ["Y", "ल्"], ["O", "व्"],
  ["'", "श्"], ["\"", "ष्"], ["L", "स्"], ["g~", "ह्"], ["~", "्"],

  // 5. मात्राएं
  ["ks", "ो"], ["kS", "ौ"], ["k", "ा"], ["h", "ी"], ["q", "ु"],
  ["w", "ू"], ["`", "ृ"], ["s", "े"], ["S", "ै"], ["a", "ं"],
  ["%", "ः"], ["¡", "ँ"], ["W", "ॉ"], ["‚", "ॅ"],

  // 6. चिह्न
  ["A", "।"], ["\\", "?"], ["+", "़"], ["¼", "("], ["½", ")"]
];

function convertWord(word) {
  if (!word) return "";
  if (/^[\d\-/.:,()@&]+$/.test(word)) return word;
  if (/^(B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Ed|M\.?Ed|LLB|LLM|10th|12th|IPS|RPS|GEN|OBC|SC|ST|MBC|EWS|SC\/ST|IT|MOB|DCRB|PCR|SPO|RPL|AHTU|CO|PS|CI|SI|ASI|HC|FC|MFC|MHC|MT|RT|GD)$/i.test(word)) {
    return word;
  }
  if (/[\u0900-\u097F]/.test(word)) return word;

  // Smart quotes (‘ ’ “ ”) को सामान्य DevLys quotes (' ") में बदलें
  let text = word
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/fZ/g, "Zf");

  for (const [legacy, uni] of DEVLYS_MAP) {
    text = text.split(legacy).join(uni);
  }

  // श् + ा -> श, क् + ा -> क
  text = text.replace(/([क-हक़-य़])्ा/g, "$1");

  // छोटी 'इ' की मात्रा (f -> ि) को पूरे संयुक्ताक्षर के बाद ले जाएं
  text = text.replace(/f(([क-हक़-य़]़?्)*[क-हक़-य़]़?)/g, "$1ि");

  // रेफ (Z -> र्) को व्यंजन से पहले ले जाएं
  text = text.replace(/(([क-हक़-य़]़?्)*[क-हक़-य़]़?[ा-ौ]*)Z/g, "र्$1");
  text = text.replace(/Z/g, "र्");

  text = text
    .replace(/ाे/g, "ो")
    .replace(/ाै/g, "ौ")
    .replace(/अा/g, "आ")
    .replace(/अो/g, "ओ")
    .replace(/अौ/g, "औ");

  return text;
}

export function devToHindi(txt) {
  if (txt === null || txt === undefined) return "";
  let s = String(txt).trim();
  if (!s) return "";

  // पहले पूरे टेक्स्ट के smart quotes सामान्य करें
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

  EXACT_DICTIONARY.forEach(([dev, uni]) => {
    s = s.split(dev).join(uni);
  });

  if (/[a-zA-Z+;<>[\]{}\\~`'¼½çØæ=ÍÌíîïðìàáâãº‰Å,_"/.%¡W‚\\]/.test(s)) {
    s = s
      .split(" ")
      .map((part) => convertWord(part))
      .join(" ");
  }

  return s.replace(/\s+/g, " ").trim();
}

export function unicodeToDevlys(txt) {
  if (txt === null || txt === undefined) return "";
  let s = String(txt);
  if (!/[\u0900-\u097F]/.test(s)) return s;
  const sorted = [...EXACT_DICTIONARY].sort((a, b) => b.length - a.length);
  sorted.forEach(([dev, uni]) => {
    s = s.split(uni).join(dev);
  });
  return s;
}
