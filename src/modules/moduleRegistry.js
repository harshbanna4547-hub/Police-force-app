import AcpModule from "./AcpModule";
import BhartiModule from "./BhartiModule";
import IncrementModule from "./IncrementModule";
import LeaveModule from "./LeaveModule";
import Pl300ChartModule from "./Pl300ChartModule";
import PostingModule from "./PostingModule";
import PromotionExamModule from "./PromotionExamModule";
import PunishmentModule from "./PunishmentModule";
import RosterModule from "./RosterModule";
import SeniorityModule from "./SeniorityModule";
import StrengthModule from "./01_strength/StrengthModule";
import StorageVaultModule from "./13_storage/StorageVaultModule";
import TrainingModule from "./TrainingModule";
import TransferModule from "./02_transfer/TransferModule";

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
    id: "POSTING",
    title: "Posting",
    hindiTitle: "पदस्थापन",
    icon: "📍",
    color: "#4F46E5",
    description: "थाना-वार पदस्थापन विवरण",
    enabled: true,
    component: PostingModule
  },
  {
    id: "BHARTI",
    title: "Bharti",
    hindiTitle: "भर्ती",
    icon: "⚡",
    color: "#D97706",
    description: "नवीन भर्ती और खाली बेल्ट नंबर",
    enabled: true,
    component: BhartiModule
  },
  {
    id: "TRAINING",
    title: "Training",
    hindiTitle: "प्रशिक्षण",
    icon: "🎓",
    color: "#7C3AED",
    description: "प्रशिक्षण और कोर्स रिकॉर्ड",
    enabled: true,
    component: TrainingModule
  },
  {
    id: "LEAVE",
    title: "Leave",
    hindiTitle: "अवकाश",
    icon: "🏖️",
    color: "#15803D",
    description: "अवकाश प्रविष्टि और खाता",
    enabled: true,
    component: LeaveModule
  },
  {
    id: "PL300",
    title: "300 PL Chart",
    hindiTitle: "300 पीएल चार्ट",
    icon: "📊",
    color: "#047857",
    description: "उपार्जित और शेष पीएल चार्ट",
    enabled: true,
    component: Pl300ChartModule
  },
  {
    id: "INCREMENT",
    title: "Increment",
    hindiTitle: "वेतन वृद्धि",
    icon: "📈",
    color: "#0369A1",
    description: "वार्षिक वेतन वृद्धि विवरण",
    enabled: true,
    component: IncrementModule
  },
  {
    id: "ACP",
    title: "ACP",
    hindiTitle: "एसीपी",
    icon: "🎖️",
    color: "#4338CA",
    description: "एसीपी पात्रता गणना",
    enabled: true,
    component: AcpModule
  },
  {
    id: "PUNISHMENT",
    title: "Punishment",
    hindiTitle: "दण्ड",
    icon: "⚖️",
    color: "#B91C1C",
    description: "विभागीय सज़ा और कार्रवाई",
    enabled: true,
    component: PunishmentModule
  },
  {
    id: "PROMOTION",
    title: "Promotion Exam",
    hindiTitle: "पदोन्नति परीक्षा",
    icon: "🏅",
    color: "#B45309",
    description: "पीसीसी परीक्षा और डीपीसी",
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
    id: "ROSTER",
    title: "Roster",
    hindiTitle: "रोस्टर",
    icon: "🏢",
    color: "#065F46",
    description: "मासिक थाना नफरी रोस्टर",
    enabled: true,
    component: RosterModule
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
  }
]);
