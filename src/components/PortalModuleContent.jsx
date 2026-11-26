import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmployeeEditModal from "../core/EmployeeEditModal";
import ModuleResourceCompanion from "./shared/ModuleResourceCompanion";
import { ModuleNavigationContext } from "./shared/ModuleNavigationContext";

/**
 * [COMPONENT] PortalModuleContent — सक्रिय मॉड्यूल, बॉटम बैक बटन, ग्लोबल राइट-क्लिक मेन्यू एवं संपादन मोडल
 */
export default function PortalModuleContent({
  activeView,
  setActiveView,
  initialTab = null,
  singleTabMode = false,
  onBack,
  onHome,
  portalData,
  districtId,
  currentDistrict,
  modules,
  language = "hi"
}) {
  const english = language === "en";
  const [editInitialTab, setEditInitialTab] = useState("personal");
  const [moduleResetCounter, setModuleResetCounter] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = () => setContextMenu(null);
    const onPointerDown = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) closeMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("blur", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("blur", closeMenu);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    const el = contextRef.current;
    if (!el || !contextMenu) return;
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - rect.width - 10);
    const maxY = Math.max(8, window.innerHeight - rect.height - 10);
    el.style.left = `${Math.max(8, Math.min(contextMenu.x, maxX))}px`;
    el.style.top = `${Math.max(8, Math.min(contextMenu.y, maxY))}px`;
  }, [contextMenu]);
  const {
    activeProfile,
    allSheets,
    setAllSheets,
    records,
    setRecords,
    attRecords,
    setAttRecords,
    depRecords,
    setDepRecords,
    totalSanc,
    plLeaveRows,
    setPlLeaveRows,
    sanctioned,
    setSanctioned,
    unitRankSanc,
    setUnitRankSanc,
    onSaveSanctioned,
    onSaveUnitRankSanc,
    reports,
    editingEmployee,
    setEditingEmployee,
    updateEmployeeRecord,
    addNewEmployee,
    onLoadExcelBlob,
    fileName,
    hasUnsavedChanges,
    onSaveToExcel,
    onExportMasterFile,
    isExportingMaster,
    onRemoveDistrictData,
    removeEmployee
  } = portalData;

  const openEmployeeEditor = (employee, tab = "personal") => {
    setEditInitialTab(tab);
    setEditingEmployee(employee);
  };

  if (activeView === "HOME") {
    return <p className="module-muted-text">मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
  }

  const selectedModule = modules.find((module) => module.id === activeView && module.enabled);
  if (!selectedModule) {
    return <p className="module-muted-text">मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
  }

  const propsByModule = {
    STRENGTH: {
      records,
      sanctioned,
      setSanctioned,
      unitRankSanc,
      setUnitRankSanc,
      onSaveSanctioned,
      onSaveUnitRankSanc,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      totalSanc,
      attCount: attRecords.length,
      depCount: depRecords.length,
      setActiveView,
      initialTab,
      currentDistrict: currentDistrict || { id: districtId, name: activeProfile },
      language
    },
    TRANSFER: {
      records,
      setRecords,
      allSheets,
      setAllSheets,
      attRecords,
      setAttRecords,
      depRecords,
      setDepRecords,
      language
    },
    BHARTI: { records, setRecords, allSheets, setAllSheets, language },
    TRAINING: { records, allSheets, setAllSheets, activeProfile, language },
    LEAVE: { records, plLeaveRows, setPlLeaveRows, allSheets, setAllSheets, activeProfile, language },
    INCREMENT: { records, allSheets, setAllSheets, language },
    ACP: { records, allSheets, setAllSheets, language },
    PUNISHMENT: { records, allSheets, setAllSheets, language },
    PROMOTION: { records, setRecords, allSheets, setAllSheets, language },
    SENIORITY: { seniorityList: reports.seniorityList, records, language },
    ROSTER: { records, reports, plSummary: reports.plSummary, allSheets, setAllSheets, language },
    REPORTS: { records, language },
    STORAGE: {
      activeProfile,
      records,
      allSheets,
      onLoadExcelBlob,
      onRestoreBackup: portalData.onRestoreBackup,
      fileName,
      hasData: records.length > 0,
      hasUnsavedChanges,
      onSaveToExcel,
      onExportMasterFile,
      isExportingMaster,
      onRemoveDistrictData,
      language
    },
    POSTING: {
      records,
      sanctioned,
      unitRankSanc,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      language
    },
    EMPLOYEES: {
      records,
      activeProfile,
      editingEmployee,
      setEditingEmployee: openEmployeeEditor,
      onUpdateEmployee: updateEmployeeRecord,
      onSaveSmartEmployee: addNewEmployee,
      onRemoveEmployee: removeEmployee,
      onDirectExcelConnect: portalData.onDirectExcelConnect,
      fileName,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      language
    },
    ARCHIVE: { records, allSheets, onArchiveEmployee: removeEmployee, language },
    DEV_SERVICES: { districtId, portalData, language }
  };
  const ActiveModule = selectedModule.component;
  const activeKey = `${activeView}_${initialTab || "ROOT"}_${singleTabMode ? "SINGLE" : "FULL"}_${moduleResetCounter}`;
  const moduleTitle = english
    ? selectedModule.title
    : (selectedModule.hindiTitle || selectedModule.title);

  const navigationContextValue = {
    moduleTitle,
    onHome: () => (onHome ? onHome() : setActiveView?.("HOME")),
    onModuleRoot: () => {
      setActiveView?.(activeView, null, false);
      setModuleResetCounter((count) => count + 1);
    }
  };

  const handleGlobalContextMenu = (e) => {
    if (activeView === "STORAGE" || e.target.closest(".win11-desktop-shell")) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <ModuleNavigationContext.Provider value={navigationContextValue}>
      <div className="portal-module-stage" onContextMenu={handleGlobalContextMenu}>
        <ActiveModule
          key={activeKey}
          {...propsByModule[activeView]}
          initialTab={initialTab}
          singleTabMode={singleTabMode}
        />

      {/* === IN-MODULE ESTABLISHMENT ARTICLE, VECTOR ART & GOVT PORTALS === */}
      {activeView !== "STORAGE" && (
        <ModuleResourceCompanion
          variant="module"
          moduleId={activeView}
          language={language}
        />
      )}

      {/* === DUAL BACK NAVIGATION: BOTTOM GLASSMORPHIC BACK BAR === */}
      <div className="module-bottom-back-bar">
        <div className="module-bottom-back-actions">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : setActiveView?.("HOME"))}
            className="module-bottom-back-btn"
          >
            ⬅️ {english ? "Back" : "पीछे जाएं (Back)"}
          </button>
          <button
            type="button"
            onClick={() => (onHome ? onHome() : setActiveView?.("HOME"))}
            className="module-bottom-home-btn"
          >
            🏠 {english ? "Dashboard" : "मुख्य डैशबोर्ड"}
          </button>
        </div>
        {activeView !== "STORAGE" && (
          <span className="module-bottom-hint">
            {english
              ? "Tip: Right-click anywhere for Back / Dashboard / Print"
              : "सुझाव: Back / Dashboard / Print के लिए कहीं भी राइट-क्लिक करें"}
          </span>
        )}
      </div>

      {/* === GLOBAL RIGHT-CLICK CONTEXT MENU (Outside Storage Desktop) === */}
      {contextMenu && createPortal(
        <div
          ref={contextRef}
          role="menu"
          className="portal-context-menu"
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setContextMenu(null);
              if (onBack) onBack();
              else setActiveView?.("HOME");
            }}
            className="portal-context-item"
          >
            ⬅️ {english ? "Back to Previous" : "पिछले पृष्ठ पर वापस"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setContextMenu(null);
              if (onHome) onHome();
              else setActiveView?.("HOME");
            }}
            className="portal-context-item"
          >
            🏠 {english ? "Go to Dashboard" : "डैशबोर्ड पर जाएं"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setContextMenu(null);
              window.print();
            }}
            className="portal-context-item"
          >
            🖨️ {english ? "Print Page" : "पृष्ठ प्रिंट करें"}
          </button>
        </div>,
        document.body
      )}

      {editingEmployee && (
        <EmployeeEditModal
          key={`${editingEmployee._uid || editingEmployee.NAME}-${editInitialTab}`}
          employee={editingEmployee}
          initialTab={editInitialTab}
          onSave={updateEmployeeRecord}
          onClose={() => setEditingEmployee(null)}
        />
      )}
      </div>
    </ModuleNavigationContext.Provider>
  );
}
