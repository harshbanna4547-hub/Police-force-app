import { APP_STORE_CATALOG } from "../../16_storage/storageLogic";

/**
 * [APP] AppStoreApp — Windows 11 App Store to Install / Uninstall & Pin Apps to Desktop
 */
export default function AppStoreApp({
  installedApps,
  pinnedApps,
  onToggleInstall,
  onTogglePin,
  onLaunchApp,
  language = "hi"
}) {
  const english = language === "en";

  return (
    <div className="wapp-store-grid">
      {APP_STORE_CATALOG.map((app) => {
        const installed = installedApps.includes(app.id);
        const pinned = pinnedApps.includes(app.id);

        return (
          <article key={app.id} className="wapp-store-card">
            <div className="wapp-store-head">
              <span className="wapp-store-icon">{app.icon}</span>
              <strong>{app.title}</strong>
            </div>

            <p className="wapp-store-desc">{app.desc}</p>

            <div className="wapp-store-actions">
              <button
                type="button"
                onClick={() => onToggleInstall(app.id)}
                className={`wapp-btn${installed ? "" : " is-save"}`}
              >
                {installed
                  ? (english ? "Uninstall" : "हटाएं")
                  : (english ? "⬇ Install" : "⬇ इंस्टॉल")}
              </button>

              {installed && (
                <>
                  <button
                    type="button"
                    onClick={() => onTogglePin(app.id)}
                    className={`wapp-btn${pinned ? " is-active" : ""}`}
                  >
                    {pinned
                      ? (english ? "📌 Pinned" : "📌 पिन किया")
                      : (english ? "📌 Pin to Desktop" : "📌 डेस्कटॉप पर पिन")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchApp(app.id)}
                    className="wapp-btn is-download"
                  >
                    ▶ {english ? "Open" : "खोलें"}
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
