import assert from "node:assert/strict";
import test from "node:test";
import {
  AZURE_CLIENT_ID,
  ONEDRIVE_PKCE_SCOPES,
  PKCE_PENDING_STORAGE_KEY,
  PKCE_VERIFIER_STORAGE_KEY,
  buildMicrosoftAuthorizeUrl,
  exchangeAuthorizationCode,
  generateCodeChallenge,
  generateCodeVerifier,
  hasPendingPkceCallback
} from "./pkceAuth.js";

test("generates PKCE verifier and S256 challenge without padding", async () => {
  const verifier = generateCodeVerifier();
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.doesNotMatch(verifier, /[+/=]/);

  const challenge = await generateCodeChallenge(verifier);
  assert.ok(challenge.length > 0);
  assert.doesNotMatch(challenge, /[+/=]/);
});

test("builds Microsoft authorize URL with required PKCE SPA parameters", () => {
  const url = new URL(buildMicrosoftAuthorizeUrl({
    redirectUri: "https://police-force-app.vercel.app",
    codeChallenge: "test-challenge-123"
  }));
  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(url.pathname, "/common/oauth2/v2.0/authorize");
  assert.equal(url.searchParams.get("client_id"), AZURE_CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), "https://police-force-app.vercel.app");
  assert.equal(url.searchParams.get("scope"), ONEDRIVE_PKCE_SCOPES);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge"), "test-challenge-123");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("detects pending PKCE callback when code and verifier exist", () => {
  const map = new Map([[PKCE_VERIFIER_STORAGE_KEY, "verifier-xyz"]]);
  const storage = { getItem: (key) => map.get(key) || null };

  assert.equal(hasPendingPkceCallback("?code=M.C501_ABC", storage), true);
  assert.equal(hasPendingPkceCallback("?other=1", storage), false);

  map.clear();
  map.set(PKCE_PENDING_STORAGE_KEY, "1");
  assert.equal(hasPendingPkceCallback("?error=access_denied", storage), true);
  assert.equal(hasPendingPkceCallback("?error=access_denied", { getItem: () => null }), false);
});

test("exchanges authorization code + code_verifier for refresh_token", async () => {
  let capturedUrl = "";
  let capturedBody = "";
  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = options.body;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "access-123",
        refresh_token: "refresh-token-xyz"
      })
    };
  };

  const result = await exchangeAuthorizationCode({
    code: "auth-code-999",
    codeVerifier: "verifier-999",
    redirectUri: "https://police-force-app.vercel.app",
    fetchImpl: mockFetch
  });

  assert.equal(capturedUrl, "https://login.microsoftonline.com/common/oauth2/v2.0/token");
  const params = new URLSearchParams(capturedBody);
  assert.equal(params.get("client_id"), AZURE_CLIENT_ID);
  assert.equal(params.get("grant_type"), "authorization_code");
  assert.equal(params.get("code"), "auth-code-999");
  assert.equal(params.get("code_verifier"), "verifier-999");
  assert.equal(params.get("redirect_uri"), "https://police-force-app.vercel.app");
  assert.equal(result.refresh_token, "refresh-token-xyz");
});
