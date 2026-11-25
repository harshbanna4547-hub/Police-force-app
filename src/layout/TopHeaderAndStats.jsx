import TopHeader from "./TopHeader";

const TEMPLATE_OPTIONS = [
  { id: "novara", label: "1. Novara (Teal)" },
  { id: "finora", label: "2. Finora (Green)" },
  { id: "aurora", label: "3. Aurora (Editorial)" },
  { id: "wizardz", label: "4. WizardZ (Lime)" },
  { id: "twinkle", label: "5. Twinkle (Dark Gold)" },
  { id: "xenon", label: "6. Xenon (Liquid Glass)" }
];

/**
 * [COMPONENT] TopHeaderAndStats — शीर्ष नेविगेशन बार एवं 6-टेम्पलेट ग्लोबल थीम स्विचर बार
 * Themes: Aurora · Novara · Finora · WizardZ · Twinkle · Xenon Liquid Glass
 */
export default function TopHeaderAndStats({
  sidebarOpen,
  setSidebarOpen,
  currentDistrict,
  language,
  portalTemplate = "aurora",
  onTemplateChange
}) {
  const english = language === "en";

  return (
    <>
      <TopHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentDistrict={currentDistrict}
        language={language}
      />
      <div className="portal-template-bar" role="region" aria-label="Portal Style Switcher">
        <span className="portal-template-label">
          🎨 {english ? "Theme Style:" : "थीम स्टाइल:"}
        </span>
        <div className="portal-template-pills">
          {TEMPLATE_OPTIONS.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onTemplateChange?.(tpl.id)}
              className={`portal-template-btn${portalTemplate === tpl.id ? " is-active" : ""}`}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
