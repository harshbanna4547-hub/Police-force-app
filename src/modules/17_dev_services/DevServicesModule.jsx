import { useCallback, useEffect, useState } from "react";
import "./DevServicesModule.css";
import { getDistrictStorageItems } from "../../utils/vaultStorage.js";
import { getOfficeServerConfig } from "../../core/lanSyncClient.js";
import {
  AZURE_CLIENT_ID,
  PKCE_PENDING_STORAGE_KEY,
  PKCE_VERIFIER_STORAGE_KEY,
  buildMicrosoftAuthorizeUrl,
  exchangeAuthorizationCode,
  generateCodeChallenge,
  generateCodeVerifier
} from "./pkceAuth.js";

const REPOSITORY_URL = "https://github.com/harshbanna4547-hub/Police-force-app";
const ACCOUNT_EMAIL_KEY = "police_portal_onedrive_account_reference";
const ACTIVE_NOW_MS = 5 * 60 * 1000;

function getDeploymentUrl() {
  const configuredUrl = String(import.meta.env.VITE_PORTAL_URL || "").trim();
  if (configuredUrl) return configuredUrl;
  return window.location.hostname.endsWith(".vercel.app") ? window.location.origin : "";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusLabel(state) {
  if (state === "synced") return { icon: "🟢", label: "Synced" };
  if (state === "syncing" || state === "checking") return { icon: "🟡", label: "Syncing" };
  if (state === "error") return { icon: "🔴", label: "Sync Error" };
  if (state === "offline") return { icon: "🟠", label: "Offline" };
  return { icon: "⚪", label: "Background Sync" };
}

function getDeviceStatus(device) {
  const lastActive = Date.parse(device.lastActiveAt || "");
  return Number.isFinite(lastActive) && Date.now() - lastActive <= ACTIVE_NOW_MS
    ? { icon: "🟢", label: "Active Now" }
    : { icon: "⚪", label: "Last Seen" };
}

export default function DevServicesModule({ districtId, portalData }) {
  const [activeTab, setActiveTab] = useState("onedrive");
  const [configuration, setConfiguration] = useState(null);
  const [health, setHealth] = useState("checking");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [backupFiles, setBackupFiles] = useState([]);
  const [deviceName, setDeviceName] = useState(portalData.currentDevice?.name || "");
  const [pkceStatus, setPkceStatus] = useState("idle");
  const [pkceError, setPkceError] = useState("");
  const [generatedRefreshToken, setGeneratedRefreshToken] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [accountEmail, setAccountEmail] = useState(() => {
    try {
      return localStorage.getItem(ACCOUNT_EMAIL_KEY) || "";
    } catch (error) {
      console.error("OneDrive account reference could not be read:", error);
      return "";
    }
  });
  const deploymentUrl = getDeploymentUrl();
  const syncStatus = statusLabel(portalData.cloudSyncState);
  const {
    getOneDriveConfigurationStatus,
    refreshActiveDevices,
    activeProfile
  } = portalData;

  const refreshStatus = useCallback(async () => {
    if (!navigator.onLine) {
      setHealth("offline");
      return;
    }
    setHealth("checking");
    const healthRequest = fetch(deploymentUrl || window.location.origin, {
      method: "GET",
      cache: "no-store"
    }).then((response) => {
      setHealth(response.ok ? "active" : "error");
    }).catch((error) => {
      console.error("Portal health check failed:", error);
      setHealth("error");
    });
    const configurationRequest = getOneDriveConfigurationStatus()
      .then((result) => setConfiguration(result.configuration))
      .catch((error) => {
        console.error("OneDrive configuration status could not be loaded:", error);
        setConfiguration({ error: error.message });
      });
    const devicesRequest = refreshActiveDevices()
      .catch((error) => {
        console.error("Active devices could not be loaded:", error);
      });
    await Promise.all([healthRequest, configurationRequest, devicesRequest]);
  }, [deploymentUrl, getOneDriveConfigurationStatus, refreshActiveDevices]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshStatus(), 0);
    const interval = window.setInterval(() => void refreshStatus(), 30_000);
    const handleOnline = () => void refreshStatus();
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleOnline);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(initialRefresh);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleOnline);
    };
  }, [refreshStatus]);

  useEffect(() => {
    let active = true;
    getDistrictStorageItems(activeProfile)
      .then((items) => {
        if (active) {
          setBackupFiles(items.filter((item) => item.kind === "FILE"
            && (item.oneDriveFolder === "Backup" || /^Backup_/i.test(item.name || ""))));
        }
      })
      .catch((error) => console.error("Offline backup list could not be loaded:", error));
    return () => { active = false; };
  }, [activeProfile]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("code");
    const authError = params.get("error");
    const authErrorDescription = params.get("error_description");
    if (!authCode && !authError) return undefined;

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
    const codeVerifier = (() => {
      try {
        return window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) || "";
      } catch {
        return "";
      }
    })();

    const clearPkceStorage = () => {
      try {
        window.sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
        window.sessionStorage.removeItem(PKCE_PENDING_STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
    };

    const runCallback = async () => {
      if (authError) {
        clearPkceStorage();
        if (!active) return;
        setPkceStatus("error");
        setPkceError(authErrorDescription || authError);
        return;
      }
      if (!codeVerifier) {
        clearPkceStorage();
        if (!active) return;
        setPkceStatus("error");
        setPkceError("PKCE code_verifier sessionStorage में नहीं मिला। कृपया 'Connect Microsoft OneDrive' पर पुनः क्लिक करें।");
        return;
      }
      setPkceStatus("exchanging");
      setPkceError("");
      try {
        const { token: officeServerToken } = getOfficeServerConfig();
        const result = await exchangeAuthorizationCode({
          code: authCode,
          codeVerifier,
          redirectUri: window.location.origin,
          clientId: AZURE_CLIENT_ID,
          officeServerToken
        });
        clearPkceStorage();
        if (!active) return;
        setGeneratedRefreshToken(result.refresh_token);
        setPkceStatus("success");
        setFeedback("🔑 OneDrive Refresh Token सफलतापूर्वक प्राप्त हो गया है। नीचे 1-Click Copy करें।");
      } catch (error) {
        clearPkceStorage();
        if (!active) return;
        setPkceStatus("error");
        setPkceError(error.message || "Microsoft authorization code exchange असफल रहा।");
      }
    };

    const timer = window.setTimeout(() => void runCallback(), 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const handleConnectMicrosoftOneDrive = async () => {
    setPkceError("");
    setGeneratedRefreshToken("");
    setCopiedToken(false);
    setPkceStatus("redirecting");
    try {
      const codeVerifier = generateCodeVerifier();
      window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);
      window.sessionStorage.setItem(PKCE_PENDING_STORAGE_KEY, "1");
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const authorizeUrl = buildMicrosoftAuthorizeUrl({
        clientId: AZURE_CLIENT_ID,
        redirectUri: window.location.origin,
        codeChallenge
      });
      window.location.assign(authorizeUrl);
    } catch (error) {
      setPkceStatus("error");
      setPkceError(`PKCE authorization शुरू नहीं हो सकी: ${error.message}`);
    }
  };

  const handleCopyRefreshToken = async () => {
    if (!generatedRefreshToken) return;
    try {
      await navigator.clipboard.writeText(generatedRefreshToken);
      setCopiedToken(true);
      window.setTimeout(() => setCopiedToken(false), 2500);
    } catch (error) {
      setFeedback(`कॉपी नहीं हो सका: ${error.message}`);
    }
  };

  const runSyncAction = async (action, successMessage) => {
    setIsRefreshing(true);
    setFeedback("");
    try {
      const completed = await action();
      if (completed) {
        try {
          await portalData.refreshActiveDevices();
        } catch (deviceError) {
          console.warn("Active devices refresh after sync failed:", deviceError);
        }
        setFeedback(`✅ ${successMessage} (Last Synced: ${new Date().toLocaleString()})`);
      }
    } catch (error) {
      console.error("OneDrive action failed:", error);
      setFeedback(`⚠️ कार्रवाई असफल: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const saveAccountEmail = (value) => {
    setAccountEmail(value);
    try {
      localStorage.setItem(ACCOUNT_EMAIL_KEY, value);
    } catch (error) {
      console.error("OneDrive account reference could not be saved:", error);
      setFeedback(`Account reference सेव नहीं हुआ: ${error.message}`);
    }
  };

  const saveDeviceName = () => {
    try {
      const savedDevice = portalData.renameCurrentDevice(deviceName);
      setDeviceName(savedDevice.name);
      setFeedback("इस डिवाइस का नाम सेव कर दिया गया है।");
    } catch (error) {
      setFeedback(`डिवाइस का नाम सेव नहीं हुआ: ${error.message}`);
    }
  };

  const refreshDevices = async () => {
    try {
      await refreshActiveDevices();
    } catch (error) {
      console.error("Active devices could not be refreshed:", error);
      setFeedback(`Active devices लोड नहीं हो सके: ${error.message}`);
    }
  };

  const tabs = [
    { id: "onedrive", label: "☁️ OneDrive & Azure Config" },
    { id: "vercel", label: "▲ Vercel Deployment Info" },
    { id: "github", label: "🐙 GitHub & Backup Logs" }
  ];
  const configAvailable = configuration && !configuration.error;
  const activeDevices = portalData.activeDevices || [];

  return (
    <section className="dev-services">
      <header className="dev-services-heading">
        <div>
          <p className="dev-services-eyebrow">SYSTEM OPERATIONS</p>
          <h1>🛠️ Development Services</h1>
          <p>डिप्लॉयमेंट, OneDrive सिंक और सक्रिय डिवाइस की स्थिति।</p>
        </div>
        <span className="dev-services-district">जिला: {portalData.activeProfile || districtId}</span>
      </header>

      <div className="dev-services-status-grid">
        <article className="dev-services-status-card">
          <span className="dev-services-card-icon">🐙</span>
          <div>
            <h2>GitHub Repository</h2>
            <p>Branch: <strong>main</strong></p>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open GitHub Repo ↗</a>
          </div>
        </article>
        <article className="dev-services-status-card">
          <span className="dev-services-card-icon">{health === "active" ? "🟢" : health === "checking" ? "🟡" : "🔴"}</span>
          <div>
            <h2>Vercel Live Hosting</h2>
            <p>
              {deploymentUrl
                ? (health === "active" ? "Active / Live" : health === "checking" ? "Checking…" : "Unreachable")
                : (health === "active" ? "Page reachable · URL not configured" : "Deployment URL not configured")}
            </p>
            {deploymentUrl && <a href={deploymentUrl} target="_blank" rel="noreferrer">Open Live Website ↗</a>}
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Open Vercel Dashboard ↗</a>
          </div>
        </article>
        <article className="dev-services-status-card">
          <span className="dev-services-card-icon">🔐</span>
          <div>
            <h2>Microsoft Azure App</h2>
            <p className="dev-services-wrap">Client ID: {AZURE_CLIENT_ID}</p>
            <p>Redirect URI: {configAvailable ? (configuration.redirectUriConfigured ? "Configured" : "Not configured") : "Status unavailable"}</p>
            <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noreferrer">Open Azure Portal ↗</a>
          </div>
        </article>
        <article className="dev-services-status-card">
          <span className="dev-services-card-icon">{syncStatus.icon}</span>
          <div>
            <h2>OneDrive Cloud Database</h2>
            <p>{syncStatus.icon} {syncStatus.label}</p>
            <p className="dev-services-sync-detail">{portalData.cloudSyncStatus || "Standby"}</p>
            <p><strong>Last Synced:</strong> {formatDate(portalData.lastSyncedAt)}</p>
            <div className="dev-services-card-actions">
              <button type="button" disabled={isRefreshing || portalData.isCloudSyncing} onClick={() => void runSyncAction(portalData.onForceOneDriveSync, "OneDrive sync पूरा हुआ।")}>
                🔄 Force Sync Now
              </button>
              <button type="button" disabled={isRefreshing || portalData.isCloudSyncing} onClick={() => void runSyncAction(portalData.onPullLatestFromOneDrive, "OneDrive का नवीनतम डेटा डाउनलोड हुआ।")}>
                📥 Pull Latest
              </button>
            </div>
          </div>
        </article>
      </div>

      <nav className="dev-services-tabs" role="tablist" aria-label="Development Services sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "is-active" : ""}
            aria-selected={activeTab === tab.id}
            role="tab"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {portalData.cloudSyncState === "error" && portalData.cloudSyncStatus && (
        <p className="dev-services-feedback is-error" role="alert">
          ⚠️ {portalData.cloudSyncStatus}
        </p>
      )}
      {feedback && (
        <p className={`dev-services-feedback${feedback.startsWith("⚠️") ? " is-error" : ""}`} role="status">
          {feedback}
        </p>
      )}

      {activeTab === "onedrive" && (
        <section className="dev-services-panel">
          <h2>🔐 OneDrive Account &amp; Backend Sync Settings</h2>
          <p className="dev-services-security-note">
            Client Secret और Refresh Token केवल सुरक्षित backend environment variables में रहते हैं।
            इन्हें ब्राउज़र में दिखाया या सेव नहीं किया जाता।
          </p>

          <section className="dev-services-pkce-card" aria-label="Generate OneDrive Refresh Token">
            <div className="dev-services-pkce-header">
              <div>
                <h3>🔑 Generate OneDrive Refresh Token (PKCE S256)</h3>
                <p>
                  Microsoft SPA PKCE (<code>S256</code>) के माध्यम से सुरक्षित Refresh Token जनरेट करें।
                  Redirect URI: <code>{window.location.origin}</code>
                </p>
              </div>
              <button
                type="button"
                className="dev-services-pkce-btn"
                disabled={pkceStatus === "redirecting" || pkceStatus === "exchanging"}
                onClick={() => void handleConnectMicrosoftOneDrive()}
              >
                {pkceStatus === "redirecting"
                  ? "⏳ Redirecting to Microsoft…"
                  : pkceStatus === "exchanging"
                    ? "⏳ Exchanging Auth Code…"
                    : "🔗 Connect Microsoft OneDrive"}
              </button>
            </div>

            {pkceError && (
              <p className="dev-services-pkce-error" role="alert">
                ⚠️ {pkceError}
              </p>
            )}

            {generatedRefreshToken && (
              <div className="dev-services-pkce-result">
                <label htmlFor="onedrive-refresh-token-output">
                  <strong>ONEDRIVE_REFRESH_TOKEN</strong> (इसे Vercel Environment Variables में सेव करें)
                </label>
                <div className="dev-services-pkce-copy-row">
                  <input
                    id="onedrive-refresh-token-output"
                    type="text"
                    value={generatedRefreshToken}
                    readOnly
                    aria-readonly="true"
                  />
                  <button
                    type="button"
                    className="dev-services-pkce-copy-btn"
                    onClick={() => void handleCopyRefreshToken()}
                  >
                    {copiedToken ? "✅ Copied!" : "📋 Copy Refresh Token"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="dev-services-settings-grid">
            <label>
              OneDrive Sync Email / Account ID (संदर्भ)
              <input value={accountEmail} onChange={(event) => saveAccountEmail(event.target.value)} placeholder="account@example.com" autoComplete="off" />
            </label>
            <label>
              Azure Client ID
              <input value={AZURE_CLIENT_ID} readOnly aria-readonly="true" />
            </label>
            <div className="dev-services-config-status">
              <strong>Backend credential status</strong>
              {configAvailable ? (
                <ul>
                  <li>Client ID: {configuration.clientIdConfigured ? "Configured" : "Missing"}</li>
                  <li>Client Secret: {configuration.clientSecretConfigured ? "Configured" : "Missing"}</li>
                  <li>Refresh Token: {configuration.refreshTokenConfigured ? "Configured" : "Missing"}</li>
                </ul>
              ) : (
                <p>{configuration?.error || "Configuration status is loading…"}</p>
              )}
            </div>
            <label>
              Auto-Sync Interval
              <select
                value={portalData.autoSyncInterval}
                onChange={(event) => {
                  try {
                    portalData.setAutoSyncInterval(event.target.value);
                  } catch (error) {
                    setFeedback(`Auto-Sync interval सेव नहीं हुआ: ${error.message}`);
                  }
                }}
              >
                <option value="20000">हर 20 सेकंड</option>
                <option value="60000">हर 1 मिनट</option>
                <option value="change-only">केवल बदलाव पर</option>
              </select>
            </label>
          </div>

          <section className="dev-services-devices">
            <div className="dev-services-device-heading">
              <div>
                <h3>📱 Active Devices (कौन-कौन से डिवाइस पर चल रहा है)</h3>
                <p>सक्रिय स्थिति अंतिम पाँच मिनट के heartbeat के आधार पर दिखाई जाती है।</p>
              </div>
              <button type="button" onClick={() => void refreshDevices()}>↻ Refresh Devices</button>
            </div>
            <div className="dev-services-device-rename">
              <label htmlFor="current-device-name">इस डिवाइस का नाम</label>
              <input id="current-device-name" value={deviceName} maxLength={80} onChange={(event) => setDeviceName(event.target.value)} />
              <button type="button" onClick={saveDeviceName}>Save Device Name</button>
            </div>
            <div className="dev-services-table-wrap">
              <table>
                <thead>
                  <tr><th>Device Name</th><th>Type</th><th>Status</th><th>OS / Browser</th><th>Last Active</th><th>Last Data Update</th></tr>
                </thead>
                <tbody>
                  {activeDevices.length ? activeDevices.map((device) => {
                    const status = getDeviceStatus(device);
                    return (
                      <tr key={device.deviceId}>
                        <td>{device.name}</td>
                        <td>{device.screenType === "Mobile" ? "Mobile" : device.screenType === "Tablet" ? "Tablet" : "PC"}</td>
                        <td>{status.icon} {status.label}</td>
                        <td>{device.os || "Unknown"} / {device.browser || "Unknown"}</td>
                        <td>{formatDate(device.lastActiveAt)}</td>
                        <td>{formatDate(device.lastDataUpdatedAt)}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="6">अभी कोई सक्रिय डिवाइस रिकॉर्ड उपलब्ध नहीं है।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === "vercel" && (
        <section className="dev-services-panel">
          <h2>▲ Vercel Deployment Info</h2>
          <div className="dev-services-detail-grid">
            <div><strong>Project URL</strong><p>{deploymentUrl || "VITE_PORTAL_URL सेट नहीं है और वर्तमान host vercel.app नहीं है।"}</p></div>
            <div><strong>Live reachability</strong><p>{health === "active" ? "🟢 Active / Live" : health === "checking" ? "🟡 Checking…" : "⚪ Standby"}</p></div>
            <div><strong>Sync endpoint</strong><p>/api/onedrive-sync</p></div>
          </div>
          <button className="dev-services-primary-button" type="button" onClick={() => void refreshStatus()}>↻ Refresh Status</button>
          <a className="dev-services-secondary-link" href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Open Vercel Dashboard ↗</a>
        </section>
      )}

      {activeTab === "github" && (
        <section className="dev-services-panel">
          <h2>🐙 GitHub &amp; Backup Logs</h2>
          <div className="dev-services-detail-grid">
            <div><strong>Repository</strong><p>harshbanna4547-hub/Police-force-app</p></div>
            <div><strong>Branch</strong><p>main</p></div>
            <div><strong>Current district</strong><p>{districtId || "—"}</p></div>
            <div><strong>Sync / backup status</strong><p>{portalData.cloudSyncStatus}</p></div>
            <div><strong>Last successful sync</strong><p>{formatDate(portalData.lastSyncedAt)}</p></div>
            <div><strong>Offline backup</strong><p>बदलाव पहले इस डिवाइस के IndexedDB में सेव होते हैं; कनेक्टिविटी लौटने पर sync retry होता है।</p></div>
          </div>
          <div className="dev-services-backup-log">
            <h3>Recent Local Backup Files ({backupFiles.length})</h3>
            {backupFiles.length ? (
              <ul>
                {backupFiles.slice(0, 10).map((file) => (
                  <li key={file.id}>{file.name} <span>{formatDate(file.updatedAt)}</span></li>
                ))}
              </ul>
            ) : <p>इस डिवाइस पर अभी कोई ऑफ़लाइन Backup फ़ाइल उपलब्ध नहीं है।</p>}
          </div>
          <a className="dev-services-primary-button" href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open GitHub Repo ↗</a>
        </section>
      )}
    </section>
  );
}
