import { DESKX_OVERLAY_WIDGETS, WALLPAPER_PRESETS } from "../../16_storage/storageLogic";

const SPEED_OPTIONS = [
  { id: "calm", label: "Calm (0.6x)", hiLabel: "धीमा (0.6x)" },
  { id: "balanced", label: "Balanced (1.0x)", hiLabel: "संतुलित (1.0x)" },
  { id: "vivid", label: "Vivid (1.6x)", hiLabel: "तीव्र (1.6x)" }
];

/**
 * [APP] DeskXWallpaperApp — DeskX Wallpaper Engine Studio
 * Controls live canvas wallpaper scenes, frosted blur, motion speed, and floating widgets.
 */
export default function DeskXWallpaperApp({
  wallpaper,
  onSelectWallpaper,
  widgetMode,
  onSelectWidgetMode,
  speed,
  onSelectSpeed,
  blurEnabled,
  onToggleBlur,
  language = "hi"
}) {
  const english = language === "en";
  const currentScene = WALLPAPER_PRESETS.find((w) => w.id === wallpaper) || WALLPAPER_PRESETS[0];

  return (
    <div className="deskx-studio-shell">
      {/* DeskX Engine Brand Hero */}
      <header className="deskx-studio-hero">
        <img
          src="/assets/deskx/deskx-logo.png"
          alt="DeskX Wallpaper Engine"
          className="deskx-studio-logo"
        />
        <div className="deskx-studio-hero-copy">
          <div className="deskx-studio-badge-row">
            <span className="deskx-studio-badge">DESKX ENGINE</span>
            {currentScene.isLive && (
              <span className="deskx-live-pill">LIVE RENDERER ACTIVE</span>
            )}
          </div>
          <h3 className="deskx-studio-title">
            {english ? "DeskX Live Wallpaper & Widget Engine" : "DeskX लाइव वॉलपेपर व विजेट इंजन"}
          </h3>
          <p className="deskx-studio-subtitle">
            {english
              ? `Current Scene: ${currentScene.label} · Customize animated canvas shaders, backdrop glass blur, and desktop widgets.`
              : `सक्रिय दृश्य: ${currentScene.hiLabel} · एनिमेटेड कैनवास सीन, ग्लास ब्लर और डेस्कटॉप विजेट नियंत्रित करें।`}
          </p>
        </div>
      </header>

      {/* Scene Picker Grid */}
      <section className="deskx-studio-section">
        <div className="deskx-section-head">
          <h4>🎨 {english ? "Wallpaper Scenes (Live Canvas + Windows 11 + Arras)" : "वॉलपेपर दृश्य (लाइव कैनवास व क्लासिक)"}</h4>
        </div>
        <div className="deskx-scene-grid">
          {WALLPAPER_PRESETS.map((scene) => {
            const active = wallpaper === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectWallpaper(scene.id)}
                className={`deskx-scene-card${active ? " is-active" : ""}`}
              >
                <div className={`deskx-scene-swatch ${scene.className}`}>
                  {scene.isLive && <span className="deskx-swatch-tag">LIVE</span>}
                </div>
                <span className="deskx-scene-name">{english ? scene.label : scene.hiLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Engine Speed, Glass Blur & Overlay Widget Controls */}
      <div className="deskx-controls-split">
        <section className="deskx-studio-section">
          <div className="deskx-section-head">
            <h4>⚡ {english ? "Motion Speed & Backdrop Blur" : "एनिमेशन गति व बैकड्रॉप ब्लर"}</h4>
          </div>
          <div className="deskx-pill-group">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectSpeed(opt.id)}
                className={`deskx-ctrl-pill${speed === opt.id ? " is-active" : ""}`}
              >
                {english ? opt.label : opt.hiLabel}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleBlur}
            className={`deskx-blur-toggle${blurEnabled ? " is-active" : ""}`}
          >
            <span>{blurEnabled ? "💧 Frosted Atmospheric Blur: ON" : "💧 Frosted Atmospheric Blur: OFF"}</span>
            <small>{english ? "Applies soft DeskX optical diffusion over live scenes" : "लाइव सीन पर सॉफ्ट ऑप्टिकल ब्लर प्रभाव"}</small>
          </button>
        </section>

        <section className="deskx-studio-section">
          <div className="deskx-section-head">
            <h4>🧩 {english ? "Desktop Floating Overlay Widget" : "डेस्कटॉप फ्लोटिंग ओवरले विजेट"}</h4>
          </div>
          <div className="deskx-pill-group">
            {DESKX_OVERLAY_WIDGETS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWidgetMode(w.id)}
                className={`deskx-ctrl-pill${widgetMode === w.id ? " is-active" : ""}`}
              >
                {w.icon} {english ? w.label : w.hiLabel}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
