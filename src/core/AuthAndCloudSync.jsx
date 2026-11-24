import { useState } from "react";
import { DISTRICT_OPTIONS } from "./districtAuth";

export default function AuthAndCloudSync({
  districtName,
  email,
  onLogout,
  onCloudSync,
  cloudConfigured,
  syncStatus,
  syncing,
  isOfflineDemo,
  onOfficeSignIn
}) {
  const [officeKey, setOfficeKey] = useState("");
  const [officeError, setOfficeError] = useState("");
  const [connectingOffice, setConnectingOffice] = useState(false);

  const connectOffice = async () => {
    setConnectingOffice(true);
    setOfficeError("");
    try {
      await onOfficeSignIn(officeKey);
      setOfficeKey("");
    } catch (error) {
      console.error("GR office connection failed:", error);
      setOfficeError(error.message || "GR Server से कनेक्शन असफल हुआ।");
    } finally {
      setConnectingOffice(false);
    }
  };

  return (
    <section style={{ padding: "12px 10px", borderTop: "1px solid #1E293B", display: "grid", gap: "8px" }}>
      <strong style={{ color: "#fff", whiteSpace: "normal" }}>👮‍♂️ District: {districtName}</strong>
      <small style={{ color: "#94A3B8", overflowWrap: "anywhere" }}>{email}</small>
      <button
        type="button"
        onClick={onCloudSync}
        disabled={!cloudConfigured || syncing}
        style={{ textAlign: "left", padding: "9px 10px", borderRadius: "8px", border: "none", cursor: cloudConfigured && !syncing ? "pointer" : "not-allowed", background: "#0F766E", color: "#fff", fontWeight: "bold", opacity: cloudConfigured ? 1 : 0.65 }}
      >
        {syncing ? "⏳ Cloud sync…" : "☁️ Cloud Sync / Backup"}
      </button>
      <small role="status" style={{ color: "#CBD5E1", whiteSpace: "normal" }}>{syncStatus}</small>
      {isOfflineDemo && (
        <>
          <label style={{ display: "grid", gap: "6px", color: "#CBD5E1", whiteSpace: "normal" }}>
            GR Server Access Key
            <input type="password" value={officeKey} onChange={(event) => setOfficeKey(event.target.value)} autoComplete="off" style={{ minWidth: 0, padding: "8px", borderRadius: "6px", border: "1px solid #475569", fontFamily: "'Times New Roman', Times, serif" }} />
          </label>
          <button type="button" onClick={connectOffice} disabled={connectingOffice || officeKey.trim().length < 32} style={{ textAlign: "left", padding: "9px 10px", borderRadius: "8px", border: "1px solid #475569", cursor: connectingOffice ? "wait" : "pointer", background: "#1E3A5F", color: "#fff", fontWeight: "bold", opacity: connectingOffice ? 0.7 : 1 }}>
            {connectingOffice ? "⏳ Connecting…" : "🔑 Connect to GR Server"}
          </button>
          {officeError && <small role="alert" style={{ color: "#FCA5A5", whiteSpace: "normal" }}>{officeError}</small>}
        </>
      )}
      <button
        type="button"
        onClick={onLogout}
        style={{ textAlign: "left", padding: "9px 10px", borderRadius: "8px", border: "1px solid #475569", cursor: "pointer", background: "transparent", color: "#FCA5A5", fontWeight: "bold" }}
      >
        Logout / Switch User
      </button>
    </section>
  );
}

export function DistrictPoliceLoginScreen({ loading, error, onSignIn }) {
  const [userId, setUserId] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSignIn(userId.trim(), password, "CHITTORGARH");
    } catch (signInError) {
      console.error("District login failed:", signInError);
      setSubmitError(signInError.message || "लॉगिन असफल हुआ।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#F4F7FB", fontFamily: "Segoe UI, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "min(100%, 440px)", padding: "28px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: "16px", boxShadow: "0 16px 40px rgba(15,23,42,0.12)", display: "grid", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "2rem" }}>🛡️</div>
          <h1 style={{ margin: "8px 0", color: "#0B1E3D" }}>District Police Login</h1>
          <p style={{ margin: 0, color: "#475569" }}>जिला पुलिस स्थापना एवं बल प्रबंधन पोर्टल</p>
        </div>
        <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
          जिला
          <select value="CHITTORGARH" disabled style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px" }}>
            {DISTRICT_OPTIONS.filter((option) => option.code === "CHITTORGARH").map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
          यूज़र ID
          <input type="text" autoComplete="username" value={userId} onChange={(event) => setUserId(event.target.value)} required style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        </label>
        <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
          पासवर्ड
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        </label>
        {(submitError || error) && <p role="alert" style={{ margin: 0, color: "#B91C1C" }}>{submitError || error}</p>}
        <button type="submit" disabled={loading || submitting} style={{ padding: "11px", border: "none", borderRadius: "8px", background: "#1D63DC", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          {loading || submitting ? "⏳ कृपया प्रतीक्षा करें…" : "🔒 Login"}
        </button>
      </form>
    </main>
  );
}
