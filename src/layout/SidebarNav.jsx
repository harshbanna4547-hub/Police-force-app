import { useState } from "react";
import Sidebar from "./Sidebar";
import { DistrictSwitcherModal } from "../core/AuthAndCloudSync";

const TEMPLATE_OPTIONS = [
  { id: "novara", label: "1. Novara (Teal)" },
  { id: "finora", label: "2. Finora (Green)" },
  { id: "aurora", label: "3. Aurora (Editorial)" },
  { id: "wizardz", label: "4. WizardZ (Lime)" },
  { id: "twinkle", label: "5. Twinkle (Dark Gold)" },
  { id: "xenon", label: "6. Xenon (Liquid Glass)" }
];

/**
 * [COMPONENT] SidebarNav — बायां नेविगेशन रैपर एवं जिला स्विचर मोडल नियंत्रण
 */
export default function SidebarNav({
  portalData,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  currentDistrict,
  onDistrictChange,
  theme,
  onThemeChange,
  portalTemplate = "aurora",
  onTemplateChange,
  language,
  onLanguageChange
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleDistrictChange = (district) => {
    onDistrictChange(district);
    setSwitcherOpen(false);
    setActiveView("HOME");
  };

  return (
    <>
      <Sidebar
        className="portal-sidebar-nav"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        modules={modules}
        activeProfile={portalData.activeProfile}
        currentDistrict={currentDistrict}
        theme={theme}
        onThemeChange={onThemeChange}
        portalTemplate={portalTemplate}
        onTemplateChange={onTemplateChange}
        templateOptions={TEMPLATE_OPTIONS}
        language={language}
        onLanguageChange={onLanguageChange}
        onOpenDistrictSwitcher={() => setSwitcherOpen(true)}
      />
      {switcherOpen && (
        <DistrictSwitcherModal
          currentDistrict={currentDistrict}
          onClose={() => setSwitcherOpen(false)}
          onSelect={handleDistrictChange}
        />
      )}
    </>
  );
}
