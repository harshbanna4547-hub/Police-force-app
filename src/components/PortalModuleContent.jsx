import { devToHindi } from "../utils/devlysConverter";
import StorageVaultModule from "../modules/StorageVaultModule";
import HomeGrid from "./HomeGrid";
import StrengthModule from "../modules/StrengthModule";
import TransferModule from "../modules/TransferModule";
import PostingModule from "../modules/PostingModule";
import BhartiModule from "../modules/BhartiModule";
import TrainingModule from "../modules/TrainingModule";
import LeaveModule from "../modules/LeaveModule";
import Pl300ChartModule from "../modules/Pl300ChartModule";
import IncrementModule from "../modules/IncrementModule";
import AcpModule from "../modules/AcpModule";
import PunishmentModule from "../modules/PunishmentModule";
import PromotionExamModule from "../modules/PromotionExamModule";
import SeniorityModule from "../modules/SeniorityModule";
import RosterModule from "../modules/RosterModule";

export default function PortalModuleContent({ activeView, setActiveView, portalData }) {
  const {
    activeProfile,
    allSheets,
    setAllSheets,
    records,
    setRecords,
    setAttRecords,
    setDepRecords,
    plLeaveRows,
    setPlLeaveRows,
    sanctioned,
    setSanctioned,
    reports,
    setEditingEmployee,
    onLoadExcelBlob
  } = portalData;

  const moduleViews = {
    HOME: <HomeGrid setActiveView={setActiveView} />,
    STRENGTH: (
      <StrengthModule
        records={records}
        sanctioned={sanctioned}
        setSanctioned={setSanctioned}
        devToHindi={devToHindi}
        onEditEmployee={setEditingEmployee}
      />
    ),
    TRANSFER: <TransferModule records={records} setRecords={setRecords} setAttRecords={setAttRecords} setDepRecords={setDepRecords} devToHindi={devToHindi} />,
    POSTING: <PostingModule records={records} devToHindi={devToHindi} />,
    BHARTI: <BhartiModule records={records} setRecords={setRecords} devToHindi={devToHindi} />,
    TRAINING: <TrainingModule allSheets={allSheets} setAllSheets={setAllSheets} devToHindi={devToHindi} />,
    LEAVE: <LeaveModule plLeaveRows={plLeaveRows} setPlLeaveRows={setPlLeaveRows} devToHindi={devToHindi} />,
    PL300: <Pl300ChartModule plSummary={reports.plSummary} devToHindi={devToHindi} />,
    INCREMENT: <IncrementModule allSheets={allSheets} setAllSheets={setAllSheets} devToHindi={devToHindi} />,
    ACP: <AcpModule records={records} devToHindi={devToHindi} />,
    PUNISHMENT: <PunishmentModule allSheets={allSheets} setAllSheets={setAllSheets} devToHindi={devToHindi} />,
    PROMOTION: <PromotionExamModule records={records} setRecords={setRecords} allSheets={allSheets} setAllSheets={setAllSheets} devToHindi={devToHindi} />,
    SENIORITY: <SeniorityModule seniorityList={reports.seniorityList} devToHindi={devToHindi} />,
    ROSTER: <RosterModule reports={reports} devToHindi={devToHindi} />,
    STORAGE: (
      <StorageVaultModule
        activeProfile={activeProfile}
        records={records}
        allSheets={allSheets}
        onLoadExcelBlob={onLoadExcelBlob}
      />
    )
  };

  return moduleViews[activeView];
}
