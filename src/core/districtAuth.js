import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  createOfflineDemoIdentity,
  isOfflineDemoCredentialsValid,
  OFFLINE_AUTH_STORAGE_KEY
} from "./offlineDemoAuth.js";
import {
  clearOfficeServerConfig,
  fetchOfficeDistrictData,
  getOfficeServerConfig,
  saveOfficeServerConfig
} from "./lanSyncClient.js";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const OFFICE_AUTH_STORAGE_KEY = "police_portal_office_lan_auth";

export const DISTRICT_OPTIONS = [
  { code: "CHITTORGARH", name: "Chittorgarh" },
  { code: "UDAIPUR", name: "Udaipur" },
  { code: "BHILWARA", name: "Bhilwara" },
  { code: "RAJSAMAND", name: "Rajsamand" },
  { code: "PRATAPGARH", name: "Pratapgarh" }
];

let supabaseClient;

export function getSupabaseClient() {
  if (!isCloudConfigured) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseClient;
}

export function normalizeDistrictId(value) {
  const districtId = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!districtId) throw new Error("जिला पहचान खाली नहीं हो सकती।");
  return districtId;
}

async function getDistrictProfile(client, userId) {
  const { data, error } = await client
    .from("district_profiles")
    .select("user_id,district_id,district_name,role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("इस लॉगिन के लिए जिला प्रोफ़ाइल उपलब्ध नहीं है। प्रशासक से संपर्क करें।");
  return {
    ...data,
    district_id: normalizeDistrictId(data.district_id),
    district_name: data.district_name || data.district_id
  };
}

function readOfflineAuthState() {
  if (typeof window === "undefined") {
    return { user: null, profile: null, error: "" };
  }
  try {
    if (
      window.localStorage.getItem(OFFICE_AUTH_STORAGE_KEY) === "true"
      && getOfficeServerConfig().token
    ) {
      return createOfficeLanIdentity();
    }
    if (window.localStorage.getItem(OFFLINE_AUTH_STORAGE_KEY) === "true") {
      return { ...createOfflineDemoIdentity(), error: "" };
    }
    return { user: null, profile: null, error: "" };
  } catch (storageError) {
    console.error("Offline demo session could not be restored:", storageError);
    return {
      user: null,
      profile: null,
      error: "ऑफ़लाइन डेमो सत्र बहाल नहीं हो सका।"
    };
  }
}

function createOfficeLanIdentity() {
  const user = { id: "office-lan-admin", email: "Office LAN User" };
  const profile = {
    user_id: user.id,
    district_id: "CHITTORGARH",
    district_name: "Chittorgarh",
    role: "admin",
    office_lan: true
  };
  return { user, profile, error: "" };
}

export function useDistrictAuth() {
  const [initialOfflineState] = useState(readOfflineAuthState);
  const [user, setUser] = useState(initialOfflineState.user);
  const [profile, setProfile] = useState(initialOfflineState.profile);
  const [loading, setLoading] = useState(isCloudConfigured && !initialOfflineState.profile);
  const [error, setError] = useState(initialOfflineState.error);

  useEffect(() => {
    if (initialOfflineState.profile?.office_lan || initialOfflineState.profile?.offline_demo) {
      return undefined;
    }
    const client = getSupabaseClient();
    if (!client) return undefined;

    let active = true;
    const resolveSession = async (session) => {
      if (!active) return;
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      setProfile(null);
      setLoading(true);
      try {
        const districtProfile = await getDistrictProfile(client, session.user.id);
        if (active) {
          setProfile(districtProfile);
          setError("");
        }
      } catch (profileError) {
        console.error("District profile could not be loaded:", profileError);
        if (active) {
          setProfile(null);
          setError(profileError.message || "जिला प्रोफ़ाइल लोड नहीं हो सकी।");
        }
        await client.auth.signOut();
      } finally {
        if (active) setLoading(false);
      }
    };

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      Promise.resolve().then(() => resolveSession(session));
    });
    client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        return resolveSession(data.session);
      })
      .catch((sessionError) => {
        console.error("Authentication session could not be restored:", sessionError);
        if (active) {
          setError(sessionError.message || "लॉगिन स्थिति बहाल नहीं हो सकी।");
          setLoading(false);
        }
      });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialOfflineState.profile]);

  const signIn = useCallback(async (email, password, selectedDistrictId) => {
    const client = getSupabaseClient();
    setLoading(true);
    setError("");
    try {
      if (isOfflineDemoCredentialsValid(email, password)) {
        const offlineIdentity = createOfflineDemoIdentity();
        localStorage.setItem(OFFLINE_AUTH_STORAGE_KEY, "true");
        localStorage.removeItem(OFFICE_AUTH_STORAGE_KEY);
        setUser(offlineIdentity.user);
        setProfile(offlineIdentity.profile);
        return offlineIdentity.profile;
      }
      if (!client) {
        throw new Error("Supabase उपलब्ध नहीं है। Offline Demo credentials या Direct Office Login इस्तेमाल करें।");
      }

      localStorage.removeItem(OFFLINE_AUTH_STORAGE_KEY);
      localStorage.removeItem(OFFICE_AUTH_STORAGE_KEY);
      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const districtProfile = await getDistrictProfile(client, data.user.id);
      if (selectedDistrictId && districtProfile.district_id !== normalizeDistrictId(selectedDistrictId)) {
        await client.auth.signOut();
        throw new Error("चयनित जिले का इस यूज़र को अधिकार नहीं है।");
      }
      setUser(data.user);
      setProfile(districtProfile);
      return districtProfile;
    } catch (signInError) {
      setError(signInError.message || "लॉगिन असफल हुआ।");
      throw signInError;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInOffice = useCallback(async (serverUrl, officeToken) => {
    setLoading(true);
    setError("");
    try {
      saveOfficeServerConfig(serverUrl, officeToken);
      await fetchOfficeDistrictData("CHITTORGARH");
      const officeIdentity = createOfficeLanIdentity();
      localStorage.setItem(OFFICE_AUTH_STORAGE_KEY, "true");
      localStorage.removeItem(OFFLINE_AUTH_STORAGE_KEY);
      setUser(officeIdentity.user);
      setProfile(officeIdentity.profile);
      return officeIdentity.profile;
    } catch (signInError) {
      setError(signInError.message || "Direct Office Login असफल हुआ।");
      throw signInError;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (client && !profile?.offline_demo && !profile?.office_lan) {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
    }
    localStorage.removeItem(OFFLINE_AUTH_STORAGE_KEY);
    localStorage.removeItem(OFFICE_AUTH_STORAGE_KEY);
    clearOfficeServerConfig();
    setUser(null);
    setProfile(null);
    setError("");
  }, [profile]);

  return {
    user,
    profile,
    loading,
    error,
    configured: isCloudConfigured,
    signIn,
    signInOffice,
    signOut
  };
}

export async function fetchDistrictCloudData(districtId) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("district_data")
    .select("payload,updated_at")
    .eq("district_id", normalizeDistrictId(districtId))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    payload: decodeStorageVaultItems(data.payload || {})
  };
}

function bytesToBase64(data) {
  let bytes = null;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (!bytes) return null;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function decodeStorageVaultItems(payload) {
  if (!Array.isArray(payload.storageVaultItems)) return payload;
  return {
    ...payload,
    storageVaultItems: payload.storageVaultItems.map((item) => {
      if (!item.data?.base64) return item;
      const binary = atob(item.data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return { ...item, data: bytes.buffer };
    })
  };
}

function encodeStorageVaultItems(payload) {
  if (!Array.isArray(payload.storageVaultItems)) {
    return { ...payload, originalWorkbook: null };
  }
  return {
    ...payload,
    originalWorkbook: null,
    storageVaultItems: payload.storageVaultItems.map((item) => {
      const base64 = bytesToBase64(item.data);
      return base64 ? { ...item, data: { base64 } } : item;
    })
  };
}

export async function saveDistrictCloudData(districtId, payload) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase सेटिंग उपलब्ध नहीं है।");
  const { error } = await client.from("district_data").upsert({
    district_id: normalizeDistrictId(districtId),
    payload: encodeStorageVaultItems(payload),
    updated_at: new Date().toISOString()
  }, { onConflict: "district_id" });
  if (error) throw error;
}
