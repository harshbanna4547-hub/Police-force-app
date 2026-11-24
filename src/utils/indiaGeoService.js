const DISTRICT_DATA = `
Andaman and Nicobar Islands|Nicobars,North And Middle Andaman,South Andamans
Andhra Pradesh|Alluri Sitharama Raju,Anakapalli,Ananthapuramu,Annamayya,Bapatla,Chittoor,Dr. B.R. Ambedkar Konaseema,East Godavari,Eluru,Guntur,Kakinada,Krishna,Kurnool,Markapuram,Nandyal,Ntr,Palnadu,Parvathipuram Manyam,Polavaram,Prakasam,Sri Potti Sriramulu Nellore,Sri Sathya Sai,Srikakulam,Tirupati,Visakhapatnam,Vizianagaram,West Godavari,Y.S.R. Kadapa
Arunachal Pradesh|Anjaw,Bichom,Changlang,Dibang Valley,East Kameng,East Siang,Kamle,Keyi Panyor,Kra Daadi,Kurung Kumey,Leparada,Lohit,Longding,Lower Dibang Valley,Lower Siang,Lower Subansiri,Namsai,Pakke Kessang,Papum Pare,Shi Yomi,Siang,Tawang,Tirap,Upper Siang,Upper Subansiri,West Kameng,West Siang
Assam|Bajali,Baksa,Barpeta,Biswanath,Bongaigaon,Cachar,Charaideo,Chirang,Darrang,Dhemaji,Dhubri,Dibrugarh,Dima Hasao,Goalpara,Golaghat,Hailakandi,Hojai,Jorhat,Kamrup,Kamrup Metro,Karbi Anglong,Kokrajhar,Lakhimpur,Majuli,Marigaon,Nagaon,Nalbari,Sivasagar,Sonitpur,South Salmara Mancachar,Sribhumi,Tamulpur,Tinsukia,Udalguri,West Karbi Anglong
Bihar|Araria,Arwal,Aurangabad,Banka,Begusarai,Bhagalpur,Bhojpur,Buxar,Darbhanga,Gaya,Gopalganj,Jamui,Jehanabad,Kaimur (Bhabua),Katihar,Khagaria,Kishanganj,Lakhisarai,Madhepura,Madhubani,Munger,Muzaffarpur,Nalanda,Nawada,Pashchim Champaran,Patna,Purbi Champaran,Purnia,Rohtas,Saharsa,Samastipur,Saran,Sheikhpura,Sheohar,Sitamarhi,Siwan,Supaul,Vaishali
Chhattisgarh|Balod,Balodabazar-Bhatapara,Balrampur-Ramanujganj,Bastar,Bemetara,Bijapur,Bilaspur,Dakshin Bastar Dantewada,Dhamtari,Durg,Gariyaband,Gaurela-Pendra-Marwahi,Janjgir-Champa,Jashpur,Kabeerdham,Khairagarh-Chhuikhadan-Gandai,Kondagaon,Korba,Korea,Mahasamund,Manendragarh-Chirmiri-Bharatpur (MCB),Mohla-Manpur-Ambagarh Chouki,Mungeli,Narayanpur,Raigarh,Raipur,Rajnandgaon,Sakti,Sarangarh-Bilaigarh,Sukma,Surajpur,Surguja,Uttar Bastar Kanker
Goa|Kushavati,North Goa,South Goa
Gujarat|Ahmedabad,Amreli,Anand,Arvalli,Banas Kantha,Bharuch,Bhavnagar,Botad,Chhotaudepur,Dahod,Dangs,Devbhumi Dwarka,Gandhinagar,Gir Somnath,Jamnagar,Junagadh,Kachchh,Kheda,Mahesana,Mahisagar,Morbi,Narmada,Navsari,Panch Mahals,Patan,Porbandar,Rajkot,Sabar Kantha,Surat,Surendranagar,Tapi,Vadodara,Valsad,Vav-Tharad
Haryana|Ambala,Bhiwani,Charkhi Dadri,Faridabad,Fatehabad,Gurugram,Hansi,Hisar,Jhajjar,Jind,Kaithal,Karnal,Kurukshetra,Mahendragarh,Nuh,Palwal,Panchkula,Panipat,Rewari,Rohtak,Sirsa,Sonipat,Yamunanagar
Himachal Pradesh|Bilaspur,Chamba,Hamirpur,Kangra,Kinnaur,Kullu,Lahaul And Spiti,Mandi,Shimla,Sirmaur,Solan,Una
Jharkhand|Bokaro,Chatra,Deoghar,Dhanbad,Dumka,East Singhbhum,Garhwa,Giridih,Godda,Gumla,Hazaribagh,Jamtara,Khunti,Koderma,Latehar,Lohardaga,Pakur,Palamu,Ramgarh,Ranchi,Sahebganj,Saraikela Kharsawan,Simdega,West Singhbhum
Karnataka|Bagalkote,Ballari,Belagavi,Bengaluru Rural,Bengaluru South,Bengaluru Urban,Bidar,Chamarajanagar,Chikkaballapura,Chikkamagaluru,Chitradurga,Dakshina Kannada,Davanagere,Dharwad,Gadag,Hassan,Haveri,Kalaburagi,Kodagu,Kolar,Koppal,Mandya,Mysuru,Raichur,Shivamogga,Tumakuru,Udupi,Uttara Kannada,Vijayanagara,Vijayapura,Yadgir
Kerala|Alappuzha,Ernakulam,Idukki,Kannur,Kasaragod,Kollam,Kottayam,Kozhikode,Malappuram,Palakkad,Pathanamthitta,Thiruvananthapuram,Thrissur,Wayanad
Madhya Pradesh|Agar-Malwa,Alirajpur,Anuppur,Ashoknagar,Balaghat,Barwani,Betul,Bhind,Bhopal,Burhanpur,Chhatarpur,Chhindwara,Damoh,Datia,Dewas,Dhar,Dindori,Guna,Gwalior,Harda,Indore,Jabalpur,Jhabua,Katni,Khandwa (East Nimar),Khargone (West Nimar),Mauganj,Maihar,Mandla,Mandsaur,Morena,Narmadapuram,Narsimhapur,Neemuch,Niwari,Pandhurna,Panna,Raisen,Rajgarh,Ratlam,Rewa,Sagar,Satna,Sehore,Seoni,Shahdol,Shajapur,Sheopur,Shivpuri,Sidhi,Singrauli,Tikamgarh,Ujjain,Umaria,Vidisha
Maharashtra|Ahilyanagar,Akola,Amravati,Beed,Bhandara,Buldhana,Chandrapur,Chhatrapati Sambhajinagar,Dharashiv,Dhule,Gadchiroli,Gondia,Hingoli,Jalgaon,Jalna,Kolhapur,Latur,Mumbai,Mumbai Suburban,Nagpur,Nanded,Nandurbar,Nashik,Palghar,Parbhani,Pune,Raigad,Ratnagiri,Sangli,Satara,Sindhudurg,Solapur,Thane,Wardha,Washim,Yavatmal
Manipur|Bishnupur,Chandel,Churachandpur,Imphal East,Imphal West,Jiribam,Kakching,Kamjong,Kangpokpi,Noney,Pherzawl,Senapati,Tamenglong,Tengnoupal,Thoubal,Ukhrul
Meghalaya|East Garo Hills,East Jaintia Hills,East Khasi Hills,Eastern West Khasi Hills,North Garo Hills,Ri Bhoi,South Garo Hills,South West Garo Hills,South West Khasi Hills,West Garo Hills,West Jaintia Hills,West Khasi Hills
Mizoram|Aizawl,Champhai,Hnahthial,Khawzawl,Kolasib,Lawngtlai,Lunglei,Mamit,Saitual,Serchhip,Siaha
Nagaland|Chumoukedima,Dimapur,Kiphire,Kohima,Longleng,Meluri,Mokokchung,Mon,Niuland,Noklak,Peren,Phek,Shamator,Tseminyu,Tuensang,Wokha,Zunheboto
Odisha|Anugola,Balangir,Baleshwar,Baragada,Bhadrak,Boudh,Debagada,Dhenkanal,Gajapati,Ganjam,Jagatsinghapur,Jajpur,Jharsuguda,Kalahandi,Kandhamala,Kataka,Kendrapada,Kendujhar,Khordha,Koraput,Malkangiri,Mayurbhanj,Nabarangpur,Nayagada,Nuapada,Puri,Rayagada,Sambalpur,Subarnapur,Sundaragada
Punjab|Amritsar,Barnala,Bathinda,Faridkot,Fatehgarh Sahib,Fazilka,Ferozepur,Gurdaspur,Hoshiarpur,Jalandhar,Kapurthala,Ludhiana,Malerkotla,Mansa,Moga,Pathankot,Patiala,Rupnagar,S.A.S Nagar,Sangrur,Shahid Bhagat Singh Nagar,Sri Muktsar Sahib,Tarn Taran
Rajasthan|Ajmer,Alwar,Balotra,Banswara,Baran,Barmer,Beawar,Bharatpur,Bhilwara,Bikaner,Bundi,Chittorgarh,Churu,Dausa,Deeg,Dholpur,Didwana-Kuchaman,Dungarpur,Ganganagar,Hanumangarh,Jaipur,Jaisalmer,Jalore,Jhalawar,Jhunjhunu,Jodhpur,Karauli,Khairthal-Tijara,Kota,Kotputli-Behror,Nagaur,Pali,Phalodi,Pratapgarh,Rajsamand,Salumbar,Sawai Madhopur,Sikar,Sirohi,Tonk,Udaipur
Sikkim|Gangtok,Gyalshing,Mangan,Namchi,Pakyong,Soreng
Tamil Nadu|Ariyalur,Chengalpattu,Chennai,Coimbatore,Cuddalore,Dharmapuri,Dindigul,Erode,Kallakurichi,Kancheepuram,Kanniyakumari,Karur,Krishnagiri,Madurai,Mayiladuthurai,Nagapattinam,Namakkal,Perambalur,Pudukkottai,Ramanathapuram,Ranipet,Salem,Sivaganga,Tenkasi,Thanjavur,The Nilgiris,Theni,Thiruvallur,Thiruvarur,Thoothukkudi,Tiruchirappalli,Tirunelveli,Tirupathur,Tiruppur,Tiruvannamalai,Vellore,Viluppuram,Virudhunagar
Telangana|Adilabad,Bhadradri Kothagudem,Hanumakonda,Hyderabad,Jagitial,Jangoan,Jayashankar Bhupalapally,Jogulamba Gadwal,Kamareddy,Karimnagar,Khammam,Kumuram Bheem Asifabad,Mahabubabad,Mahabubnagar,Mancherial,Medak,Medchal Malkajgiri,Mulugu,Nagarkurnool,Nalgonda,Narayanpet,Nirmal,Nizamabad,Peddapalli,Rajanna Sircilla,Ranga Reddy,Sangareddy,Siddipet,Suryapet,Vikarabad,Wanaparthy,Warangal,Yadadri Bhuvanagiri
Tripura|Dhalai,Gomati,Khowai,North Tripura,Sepahijala,South Tripura,Unakoti,West Tripura
Uttar Pradesh|Agra,Aligarh,Ambedkar Nagar,Amethi,Amroha,Auraiya,Ayodhya,Azamgarh,Baghpat,Bahraich,Ballia,Balrampur,Banda,Bara Banki,Bareilly,Basti,Bhadohi,Bijnor,Budaun,Bulandshahr,Chandauli,Chitrakoot,Deoria,Etah,Etawah,Farrukhabad,Fatehpur,Firozabad,Gautam Buddha Nagar,Ghaziabad,Ghazipur,Gonda,Gorakhpur,Hamirpur,Hapur,Hardoi,Hathras,Jalaun,Jaunpur,Jhansi,Kannauj,Kanpur Dehat,Kanpur Nagar,Kasganj,Kaushambi,Kheri,Kushinagar,Lalitpur,Lucknow,Mahoba,Mahrajganj,Mainpuri,Mathura,Mau,Meerut,Mirzapur,Moradabad,Muzaffarnagar,Pilibhit,Pratapgarh,Prayagraj,Rae Bareli,Rampur,Saharanpur,Sambhal,Sant Kabir Nagar,Shahjahanpur,Shamli,Shrawasti,Siddharthnagar,Sitapur,Sonbhadra,Sultanpur,Unnao,Varanasi
Uttarakhand|Almora,Bageshwar,Chamoli,Champawat,Dehradun,Haridwar,Nainital,Pauri Garhwal,Pithoragarh,Rudraprayag,Tehri Garhwal,Udham Singh Nagar,Uttarkashi
West Bengal|Alipurduar,Bankura,Birbhum,Cooch Behar,Dakshin Dinajpur,Darjeeling,Hooghly,Howrah,Jalpaiguri,Jhargram,Kalimpong,Kolkata,Malda,Murshidabad,Nadia,North 24 Parganas,Paschim Bardhaman,Paschim Medinipur,Purba Bardhaman,Purba Medinipur,Purulia,South 24 Parganas,Uttar Dinajpur
Chandigarh|Chandigarh
Dadra and Nagar Haveli and Daman and Diu|Dadra And Nagar Haveli,Daman,Diu
Delhi|Central,Central North,East,New Delhi,North,North East,North West,Old Delhi,Outer North,South,South East,South West,West
Jammu and Kashmir|Anantnag,Bandipora,Baramulla,Budgam,Doda,Ganderbal,Jammu,Kathua,Kishtwar,Kulgam,Kupwara,Poonch,Pulwama,Rajouri,Ramban,Reasi,Samba,Shopian,Srinagar,Udhampur
Ladakh|Kargil,Leh Ladakh
Lakshadweep|Lakshadweep District
Puducherry|Karaikal,Puducherry
`;

export const INDIA_STATES_DISTRICTS = Object.freeze(Object.fromEntries(
  DISTRICT_DATA.trim().split("\n").map((line) => {
    const [state, districts] = line.split("|");
    return [state, districts.split(",")];
  })
));

export const INDIA_STATES = Object.keys(INDIA_STATES_DISTRICTS);

export const INDIA_STATE_HINDI = Object.freeze({
  "Andaman and Nicobar Islands": "अंडमान और निकोबार द्वीपसमूह",
  "Andhra Pradesh": "आंध्र प्रदेश",
  "Arunachal Pradesh": "अरुणाचल प्रदेश",
  Assam: "असम",
  Bihar: "बिहार",
  Chandigarh: "चंडीगढ़",
  Chhattisgarh: "छत्तीसगढ़",
  "Dadra and Nagar Haveli and Daman and Diu": "दादरा और नगर हवेली और दमन और दीव",
  Delhi: "दिल्ली",
  Goa: "गोवा",
  Gujarat: "गुजरात",
  Haryana: "हरियाणा",
  "Himachal Pradesh": "हिमाचल प्रदेश",
  "Jammu and Kashmir": "जम्मू और कश्मीर",
  Jharkhand: "झारखंड",
  Karnataka: "कर्नाटक",
  Kerala: "केरल",
  Ladakh: "लद्दाख",
  Lakshadweep: "लक्षद्वीप",
  "Madhya Pradesh": "मध्य प्रदेश",
  Maharashtra: "महाराष्ट्र",
  Manipur: "मणिपुर",
  Meghalaya: "मेघालय",
  Mizoram: "मिजोरम",
  Nagaland: "नागालैंड",
  Odisha: "ओडिशा",
  Puducherry: "पुदुच्चेरी",
  Punjab: "पंजाब",
  Rajasthan: "राजस्थान",
  Sikkim: "सिक्किम",
  "Tamil Nadu": "तमिलनाडु",
  Telangana: "तेलंगाना",
  Tripura: "त्रिपुरा",
  "Uttar Pradesh": "उत्तर प्रदेश",
  Uttarakhand: "उत्तराखंड",
  "West Bengal": "पश्चिम बंगाल"
});

export const RAJASTHAN_DISTRICT_HINDI = Object.freeze({
  Ajmer: "अजमेर",
  Alwar: "अलवर",
  Balotra: "बालोतरा",
  Banswara: "बांसवाड़ा",
  Baran: "बारां",
  Barmer: "बाड़मेर",
  Beawar: "ब्यावर",
  Bharatpur: "भरतपुर",
  Bhilwara: "भीलवाड़ा",
  Bikaner: "बीकानेर",
  Bundi: "बूंदी",
  Chittorgarh: "चित्तौड़गढ़",
  Churu: "चूरू",
  Dausa: "दौसा",
  Deeg: "डीग",
  Dholpur: "धौलपुर",
  "Didwana-Kuchaman": "डीडवाना-कुचामन",
  Dungarpur: "डूंगरपुर",
  Ganganagar: "श्रीगंगानगर",
  Hanumangarh: "हनुमानगढ़",
  Jaipur: "जयपुर",
  Jaisalmer: "जैसलमेर",
  Jalore: "जालौर",
  Jhalawar: "झालावाड़",
  Jhunjhunu: "झुंझुनू",
  Jodhpur: "जोधपुर",
  Karauli: "करौली",
  "Khairthal-Tijara": "खैरथल-तिजारा",
  Kota: "कोटा",
  "Kotputli-Behror": "कोटपुतली-बहरोड़",
  Nagaur: "नागौर",
  Pali: "पाली",
  Phalodi: "फलोदी",
  Pratapgarh: "प्रतापगढ़",
  Rajsamand: "राजसमंद",
  Salumbar: "सलूम्बर",
  "Sawai Madhopur": "सवाई माधोपुर",
  Sikar: "सीकर",
  Sirohi: "सिरोही",
  Tonk: "टोंक",
  Udaipur: "उदयपुर"
});

export function uniqueGeoNames(values) {
  const seen = new Set();
  return values.filter((value) => {
    const name = String(value || "").trim().replace(/\s+/g, " ");
    const key = name.toLocaleLowerCase("en-IN");
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readFirst(record, keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record[key] !== null && String(record[key]).trim()) return String(record[key]).trim();
  }
  return "";
}

function normalizePostalBlock(value) {
  const block = String(value || "").trim();
  const normalized = normalizeText(block);
  return ["chittorgah", "chitttorgarh", "cittorgarh"].includes(normalized) ? "Chittorgarh" : block;
}

function cleanPostOfficeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s*(?:\((?:B\.?O\.?|S\.?O\.?|H\.?O\.?)\)|(?:B\.?O\.?|S\.?O\.?|H\.?O\.?))\s*$/i, "")
    .trim();
}

function getPostOffices(payload) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  const bodies = Array.isArray(parsed) ? parsed : [parsed];
  return bodies.flatMap((body) => {
    const offices = body?.PostOffice || body?.postOffices || body?.data || body?.results || [];
    return Array.isArray(offices) ? offices : [];
  }).map((office) => {
    const block = normalizePostalBlock(readFirst(office, ["Block", "block"]));
    const taluk = normalizePostalBlock(readFirst(office, ["Taluk", "taluk", "Circle", "circle"]));
    return {
      village: cleanPostOfficeName(readFirst(office, ["Name", "name", "Village", "village", "PostOffice"])),
      district: readFirst(office, ["District", "district"]),
      state: readFirst(office, ["State", "state"]),
      block: block || taluk,
      taluk: taluk || block,
      pincode: readFirst(office, ["Pincode", "PINCode", "pincode", "PinCode", "pinCode"])
    };
  }).filter((office) => office.village);
}

async function fetchGeoUrl(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Geo lookup failed (${response.status})`);
  const payload = await response.json();
  const offices = getPostOffices(payload);
  if (!offices.length) throw new Error("No postal locations found");
  return offices;
}

export async function fetchPincodeGeo(pincode, signal) {
  if (!/^\d{6}$/.test(String(pincode))) throw new Error("Pincode must contain six digits");
  const urls = [
    `https://postalpincode.in/${pincode}`,
    `https://api.postalpincode.in/pincode/${pincode}`
  ];
  let lastError;
  for (const url of urls) {
    try {
      return await fetchGeoUrl(url, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("Pincode lookup failed");
}

export async function fetchDistrictGeo(district, state, signal) {
  if (!district) return [];
  const urls = [
    `https://postalpincode.in/${encodeURIComponent(district)}`,
    `https://api.postalpincode.in/postoffice/${encodeURIComponent(district)}`
  ];
  let lastError;
  for (const url of urls) {
    try {
      const offices = await fetchGeoUrl(url, signal);
      const matches = offices.filter((office) =>
        normalizeText(office.district) === normalizeText(district) &&
        (!state || !office.state || normalizeText(office.state) === normalizeText(state))
      );
      if (matches.length) return matches;
      throw new Error(`No postal locations found for ${district}`);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("District lookup failed");
}

export function getOfflinePincodeGeo(pincode, records = [], knownLocations = {}) {
  const pin = String(pincode);
  const localRecords = records.filter((record) =>
    readFirst(record, ["PINCODE", "PIN CODE", "PIN", "POSTAL CODE", "POSTCODE"]) === pin
  );
  const known = knownLocations[pin];
  const fromRecords = localRecords.map((record) => {
    const block = readFirst(record, ["BLOCK", "TAHSIL", "CIRCLE"]);
    const taluk = readFirst(record, ["TAHSIL", "CIRCLE", "BLOCK"]);
    return {
      village: cleanPostOfficeName(readFirst(record, ["VILLAGE", "VILLAGE ", "POST OFFICE", "POST OFFICE NAME"])),
      district: readFirst(record, ["DISTRICT"]),
      state: readFirst(record, ["STATE", "STATE NAME"]) || (/^3[0-4]/.test(pin) ? "Rajasthan" : ""),
      block,
      taluk,
      pincode: pin
    };
  }).filter((location) => location.village);
  if (fromRecords.length) return fromRecords;
  if (known) return known.map((location) => ({ ...location, pincode: pin }));
  return [];
}
