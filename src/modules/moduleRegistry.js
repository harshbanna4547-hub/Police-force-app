import "../shared/sharedModule.css";
import StrengthModule from "./01_strength/StrengthModule";
import PostingModule from "./02_posting/PostingModule";
import TransferModule from "./03_transfer/TransferModule";
import EmployeeManagementModule from "./04_employee/EmployeeManagementModule";
import LeaveModule from "./05_leave/LeaveModule";
import AcpModule from "./06_acp/AcpModule";
import EmployeeArchiveModule from "./07_archive/EmployeeArchiveModule";
import PromotionExamModule from "./08_promotion/PromotionExamModule";
import SeniorityModule from "./09_seniority/SeniorityModule";
import BhartiModule from "./10_bharti/BhartiModule";
import IncrementModule from "./11_increment/IncrementModule";
import TrainingModule from "./12_training/TrainingModule";
import PunishmentModule from "./13_punishment/PunishmentModule";
import RosterModule from "./14_roster/RosterModule";
import ReportsModule from "./15_reports/ReportsModule";
import StorageVaultModule from "./16_storage/StorageVaultModule";
import DevServicesModule from "./17_dev_services/DevServicesModule";
import ServicesModule from "./services/ServicesModule";
import AboutModule from "./about/AboutModule";

export const MODULES_CONFIG = Object.freeze([
  {
    id: "STRENGTH",
    title: "Strength",
    hindiTitle: "नफरी",
    icon: "🛡️",
    color: "#2563EB",
    description: "स्वीकृत एवं कार्यरत नफरी",
    englishDescription: "Sanctioned & Working Strength",
    enabled: true,
    component: StrengthModule
  },
  {
    id: "POSTING",
    title: "Posting",
    hindiTitle: "पदस्थापन सूची",
    icon: "📍",
    color: "#0F766E",
    description: "Office, CO, PS और Post-Wise कार्यरत नफरी",
    englishDescription: "Office, CO, PS and Post-Wise Working Strength",
    enabled: true,
    component: PostingModule
  },
  {
    id: "EMPLOYEES",
    title: "Employee Management",
    hindiTitle: "कर्मचारी प्रबंधन",
    icon: "👮",
    color: "#2563EB",
    description: "कर्मचारी विवरण एवं कार्यवाही",
    englishDescription: "Employee Records & Actions",
    enabled: true,
    component: EmployeeManagementModule
  },
  {
    id: "ARCHIVE",
    title: "Employee Archive",
    hindiTitle: "सेवानिवृत्ति / रिलीव अभिलेख",
    icon: "🗂️",
    color: "#475569",
    description: "वर्ष-वार Relieve, Retirement, Death और Deputation",
    englishDescription: "Year-wise Relieve, Retirement, Death & Deputation Archive",
    enabled: true,
    component: EmployeeArchiveModule
  },
  {
    id: "TRANSFER",
    title: "Transfer",
    hindiTitle: "स्थानांतरण आदेश",
    icon: "⇄",
    color: "#DC2626",
    description: "स्थानांतरण आदेश, अवधि जाँच और प्रिंट",
    englishDescription: "Transfer Orders, Tenure Check & Print",
    enabled: true,
    component: TransferModule
  },
  {
    id: "LEAVE",
    title: "Leave",
    hindiTitle: "अवकाश",
    icon: "🏖️",
    color: "#15803D",
    description: "अवकाश प्रविष्टि और PL खाता",
    englishDescription: "Leave Entry & PL Account Ledger",
    enabled: true,
    component: LeaveModule
  },
  {
    id: "ACP",
    title: "ACP",
    hindiTitle: "एसीपी",
    icon: "🎖️",
    color: "#4338CA",
    description: "9 / 18 / 27 वर्ष सेवा-अवधि समीक्षा",
    englishDescription: "9 / 18 / 27 Years Service Review",
    enabled: true,
    component: AcpModule
  },
  {
    id: "PROMOTION",
    title: "Promotion Exam",
    hindiTitle: "पदोन्नति परीक्षा",
    icon: "🏅",
    color: "#B45309",
    description: "पीसीसी परीक्षा और डीपीसी समीक्षा",
    englishDescription: "PCC Exam & DPC Eligibility Review",
    enabled: true,
    component: PromotionExamModule
  },
  {
    id: "SENIORITY",
    title: "Seniority",
    hindiTitle: "वरिष्ठता",
    icon: "📋",
    color: "#6D28D9",
    description: "संवर्ग-वार वरिष्ठता सूची",
    englishDescription: "Cadre-wise Seniority List",
    enabled: true,
    component: SeniorityModule
  },
  {
    id: "BHARTI",
    title: "Bharti",
    hindiTitle: "भर्ती",
    icon: "⚡",
    color: "#D97706",
    description: "वर्षवार भर्ती और स्थायीकरण",
    englishDescription: "Year-wise Recruitment & Confirmation",
    enabled: true,
    component: BhartiModule
  },
  {
    id: "INCREMENT",
    title: "Increment",
    hindiTitle: "वेतन वृद्धि",
    icon: "📈",
    color: "#0369A1",
    description: "वार्षिक वेतन वृद्धि समीक्षा",
    englishDescription: "Annual Increment Review",
    enabled: true,
    component: IncrementModule
  },
  {
    id: "TRAINING",
    title: "Training",
    hindiTitle: "प्रशिक्षण",
    icon: "🎓",
    color: "#7C3AED",
    description: "प्रशिक्षण इतिहास और लंबित कोर्स",
    englishDescription: "Training History & Pending Courses",
    enabled: true,
    component: TrainingModule
  },
  {
    id: "PUNISHMENT",
    title: "Punishment",
    hindiTitle: "दण्ड",
    icon: "⚖️",
    color: "#B91C1C",
    description: "विभागीय सज़ा एवं स्वच्छ-छवि सूची",
    englishDescription: "Departmental Punishment & Clean Record List",
    enabled: true,
    component: PunishmentModule
  },
  {
    id: "ROSTER",
    title: "Roster & PL-300",
    hindiTitle: "रोस्टर एवं पीएल-300",
    icon: "🏢",
    color: "#065F46",
    description: "थाना रोस्टर, ड्यूटी और PL-300 चार्ट",
    englishDescription: "PS Roster, Duty & PL-300 Chart",
    enabled: true,
    component: RosterModule
  },
  {
    id: "REPORTS",
    title: "Reports",
    hindiTitle: "रिपोर्ट्स एवं रिटर्न",
    icon: "📊",
    color: "#4F46E5",
    description: "पदस्थापन एवं कार्यकाल रिपोर्ट",
    englishDescription: "Posting & Tenure Reports",
    enabled: true,
    component: ReportsModule
  },
  {
    id: "STORAGE",
    title: "Storage Vault",
    hindiTitle: "स्टोरेज वॉल्ट",
    icon: "🗄️",
    color: "#0369A1",
    description: "Excel, दस्तावेज़ और फ़ाइल प्रबंधन",
    englishDescription: "Excel, Documents & File Vault",
    enabled: true,
    component: StorageVaultModule
  },
  {
    id: "SERVICES",
    title: "Services",
    hindiTitle: "सरकारी पोर्टल एवं लिंक",
    icon: "🌐",
    color: "#0F766E",
    description: "आधिकारिक पुलिस एवं सरकारी पोर्टल निर्देशिका",
    englishDescription: "Official Police & Government Portals Directory",
    enabled: true,
    component: ServicesModule
  },
  {
    id: "ABOUT",
    title: "About Portal",
    hindiTitle: "पोर्टल परिचय",
    icon: "ℹ️",
    color: "#0F766E",
    description: "पोर्टल परिचय, मुख्य क्षमताएं एवं तकनीकी सेवाएँ",
    englishDescription: "Portal Overview, Capabilities & Development Services",
    enabled: true,
    component: AboutModule
  },
  {
    id: "DEV_SERVICES",
    title: "Development Services",
    hindiTitle: "डेवलपमेंट सेवाएँ",
    icon: "🛠️",
    color: "#0F766E",
    description: "डिप्लॉयमेंट, क्लाउड सिंक और सक्रिय डिवाइस",
    englishDescription: "Deployment, Cloud Sync & Active Devices",
    enabled: true,
    component: DevServicesModule
  }
]);
