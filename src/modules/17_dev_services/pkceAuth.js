export const AZURE_CLIENT_ID = "ca7693ab-ea97-48d0-b764-99d29312b13d";
export const MS_AUTHORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
export const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
export const ONEDRIVE_PKCE_SCOPES = "offline_access Files.ReadWrite User.Read";
export const PKCE_VERIFIER_STORAGE_KEY = "onedrive_pkce_code_verifier";
export const PKCE_PENDING_STORAGE_KEY = "onedrive_pkce_pending";

const inFlightExchanges = new Map();

export function toBase64Url(bytes) {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < byteArray.length; index += 1) {
    binary += String.fromCharCode(byteArray[index]);
  }
  const base64 = typeof globalThis.btoa === "function"
    ? globalThis.btoa(binary)
    : Buffer.from(byteArray).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateCodeVerifier(byteLength = 64) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(String(verifier || ""));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

export function buildMicrosoftAuthorizeUrl({
  clientId = AZURE_CLIENT_ID,
  redirectUri,
  codeChallenge,
  scope = ONEDRIVE_PKCE_SCOPES
}) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_mode: "query",
    prompt: "consent"
  });
  return `${MS_AUTHORIZE_URL}?${params.toString()}`;
}

export function hasPendingPkceCallback(search, storage) {
  try {
    const params = new URLSearchParams(search || "");
    const hasCode = Boolean(params.get("code"));
    const hasError = Boolean(params.get("error"));
    if (!hasCode && !hasError) return false;
    if (!storage) return hasCode;
    return Boolean(storage.getItem(PKCE_VERIFIER_STORAGE_KEY) || storage.getItem(PKCE_PENDING_STORAGE_KEY));
  } catch {
    return false;
  }
}

async function requestDirectMicrosoftToken({
  code,
  codeVerifier,
  redirectUri,
  clientId,
  fetchImpl
}) {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    scope: ONEDRIVE_PKCE_SCOPES
  });
  const response = await fetchImpl(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.refresh_token) {
    const detail = data.error_description || data.error || `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function requestBackendExchange({
  code,
  codeVerifier,
  redirectUri,
  clientId,
  officeServerToken,
  fetchImpl
}) {
  const response = await fetchImpl("/api/onedrive-sync?action=exchange_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(officeServerToken ? { Authorization: `Bearer ${officeServerToken}` } : {})
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: clientId
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.refresh_token) {
    throw new Error(data.error || `Backend token exchange failed (${response.status}).`);
  }
  return data;
}

export async function exchangeAuthorizationCode({
  code,
  codeVerifier,
  redirectUri,
  clientId = AZURE_CLIENT_ID,
  officeServerToken = "",
  fetchImpl = globalThis.fetch
}) {
  const cacheKey = `${code}:${codeVerifier}`;
  if (inFlightExchanges.has(cacheKey)) {
    return inFlightExchanges.get(cacheKey);
  }

  const exchangePromise = (async () => {
    try {
      return await requestDirectMicrosoftToken({
        code,
        codeVerifier,
        redirectUri,
        clientId,
        fetchImpl
      });
    } catch (directError) {
      if (!officeServerToken) {
        throw directError;
      }
      return requestBackendExchange({
        code,
        codeVerifier,
        redirectUri,
        clientId,
        officeServerToken,
        fetchImpl
      });
    }
  })();

  inFlightExchanges.set(cacheKey, exchangePromise);
  try {
    return await exchangePromise;
  } finally {
    inFlightExchanges.delete(cacheKey);
  }
}
