import "../shared/sharedModule.css";
import StrengthModule from "./01_strength/StrengthModule";
import TransferModule from "./03_transfer/TransferModule";
import LeaveModule from "./05_leave/LeaveModule";
import AcpModule from "./06_acp/AcpModule";
import PromotionExamModule from "./08_promotion/PromotionExamModule";
import SeniorityModule from "./09_seniority/SeniorityModule";
import BhartiModule from "./10_bharti/BhartiModule";
import IncrementModule from "./11_increment/IncrementModule";
import TrainingModule from "./12_training/TrainingModule";
import PunishmentModule from "./13_punishment/PunishmentModule";
import RosterModule from "./14_roster/RosterModule";
import ReportsModule from "./15_reports/ReportsModule";
import StorageVaultModule from "./16_storage/StorageVaultModule";
import PostingModule from "./02_posting/PostingModule";
import EmployeeManagementModule from "./04_employee/EmployeeManagementModule";
import EmployeeArchiveModule from "./07_archive/EmployeeArchiveModule";
import DevServicesModule from "./17_dev_services/DevServicesModule";

export const MODULES_CONFIG = Object.freeze([
  {
    id: "STRENGTH",
    title: "Strength",
    hindiTitle: "नफरी",
    icon: "🛡️",
    color: "#2563EB",
    description: "स्वीकृत एवं कार्यरत नफरी",
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
    enabled: true,
    component: RosterModule
  },
  {
    id: "REPORTS",
    title: "Reports",
    hindiTitle: "रिपोर्ट एवं पदस्थापन",
    icon: "📑",
    color: "#4F46E5",
    description: "पदस्थापन एवं कार्यकाल रिपोर्ट",
    enabled: true,
    component: ReportsModule
  },
  {
    id: "STORAGE",
    title: "Storage Vault",
    hindiTitle: "स्टोरेज",
    icon: "🗄️",
    color: "#0369A1",
    description: "Excel, दस्तावेज़ और फ़ाइल प्रबंधन",
    enabled: true,
    component: StorageVaultModule
  },
  {
    id: "DEV_SERVICES",
    title: "Development Services",
    hindiTitle: "Development Services",
    icon: "🛠️",
    color: "#0F766E",
    description: "डिप्लॉयमेंट, क्लाउड सिंक और सक्रिय डिवाइस",
    enabled: true,
    component: DevServicesModule
  }
]);
