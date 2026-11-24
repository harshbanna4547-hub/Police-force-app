import { useState } from "react";
import { DISTRICT_OPTIONS, normalizeDistrictId } from "./districtAuth";
import {
  OFFLINE_DEMO_EMAIL,
  OFFLINE_DEMO_PASSWORD
} from "./offlineDemoAuth.js";

export default function AuthAndCloudSync({
  districtName,
  email,
  onLogout,
  onCloudSync,
  cloudConfigured,
  syncStatus,
  syncing
}) {
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

export function DistrictPoliceLoginScreen({ loading, configured, error, onSignIn }) {
  const [email, setEmail] = useState(OFFLINE_DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [district, setDistrict] = useState("CHITTORGARH");
  const [otherDistrict, setOtherDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const attemptSignIn = async (loginEmail, loginPassword, districtId) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSignIn(loginEmail.trim(), loginPassword, districtId);
    } catch (signInError) {
      console.error("District login failed:", signInError);
      setSubmitError(signInError.message || "लॉगिन असफल हुआ।");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const districtId = district === "OTHER" ? normalizeDistrictId(otherDistrict) : district;
    await attemptSignIn(email, password, districtId);
  };

  const loginDemo = () => attemptSignIn(
    OFFLINE_DEMO_EMAIL,
    OFFLINE_DEMO_PASSWORD,
    "CHITTORGARH"
  );

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
          <select value={district} onChange={(event) => setDistrict(event.target.value)} disabled={!configured} style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px" }}>
            {DISTRICT_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
            <option value="OTHER">अन्य जिला (प्रशासक द्वारा जोड़ा गया)</option>
          </select>
        </label>
        {district === "OTHER" && (
          <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
            जिला कोड / नाम
            <input value={otherDistrict} onChange={(event) => setOtherDistrict(event.target.value)} required style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px" }} />
          </label>
        )}
        <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
          ईमेल / यूज़रनेम
          <input type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        </label>
        <label style={{ display: "grid", gap: "6px", color: "#334155" }}>
          पासवर्ड
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ padding: "10px", border: "1px solid #CBD5E1", borderRadius: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        </label>
        {!configured && (
          <p role="status" style={{ margin: 0, padding: "10px", borderRadius: "8px", background: "#FEF3C7", color: "#92400E" }}>
            Supabase credentials नहीं हैं। Offline Demo केवल अलग स्थानीय डेमो डेटा खोलता है; यह cloud या वास्तविक Chittorgarh डेटा नहीं खोलता।
          </p>
        )}
        {(submitError || error) && <p role="alert" style={{ margin: 0, color: "#B91C1C" }}>{submitError || error}</p>}
        <button type="submit" disabled={loading || submitting} style={{ padding: "11px", border: "none", borderRadius: "8px", background: "#1D63DC", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          {loading || submitting ? "⏳ कृपया प्रतीक्षा करें…" : "🔐 Login"}
        </button>
        {!configured && (
          <button type="button" onClick={loginDemo} disabled={loading || submitting} style={{ padding: "11px", border: "1px solid #0F766E", borderRadius: "8px", background: "#ECFDF5", color: "#065F46", fontWeight: "bold", cursor: "pointer" }}>
            ⚡ Quick Demo / Offline Login
          </button>
        )}
        <small style={{ color: "#64748B" }}>नया जिला यूज़र केवल प्रशासक Supabase में provision कर सकता है।</small>
      </form>
    </main>
  );
}
