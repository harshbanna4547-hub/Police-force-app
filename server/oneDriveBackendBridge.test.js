import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createOneDriveBackendBridge } from "./oneDriveBackendBridge.js";

test("refreshes the Microsoft token and reads/writes district JSON through Graph", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "police-onedrive-"));
  const refreshTokenFile = path.join(directory, "refresh.token");
  const env = {
    ONEDRIVE_CLIENT_ID: "test-client",
    ONEDRIVE_CLIENT_SECRET: "test-secret",
    ONEDRIVE_REFRESH_TOKEN: "initial-refresh-token"
  };
  let tokenRequests = 0;
  let database = null;
  const graphCalls = [];
  const fetchImpl = async (url, options = {}) => {
    const requestUrl = String(url);
    graphCalls.push({ url: requestUrl, method: options.method || "GET" });
    if (requestUrl.includes("/oauth2/v2.0/token")) {
      tokenRequests += 1;
      assert.match(String(options.body), /grant_type=refresh_token/);
      return Response.json({
        access_token: "mock-access-token",
        refresh_token: "rotated-refresh-token",
        expires_in: 3600
      });
    }
    if (requestUrl.includes("/root:/PoliceForcePortal/CHITTORGARH/CHITTORGARH_db.json:/content")) {
      if (options.method === "PUT") {
        database = JSON.parse(options.body);
        return Response.json({ id: "database-file" });
      }
      return database ? Response.json(database) : new Response(null, { status: 404 });
    }
    if (requestUrl.endsWith("/me/drive/root/children?$select=id,name,folder")) {
      return Response.json({ value: [] });
    }
    if (requestUrl.endsWith("/me/drive/items/folder-root/children?$select=id,name,folder")) {
      return Response.json({ value: [] });
    }
    if (requestUrl.endsWith("/me/drive/root/children") && options.method === "POST") {
      return Response.json({ id: "folder-root", name: "PoliceForcePortal", folder: {} });
    }
    if (requestUrl.endsWith("/me/drive/items/folder-root/children") && options.method === "POST") {
      return Response.json({ id: "folder-district", name: "CHITTORGARH", folder: {} });
    }
    throw new Error(`Unexpected Graph request: ${options.method || "GET"} ${requestUrl}`);
  };

  try {
    const bridge = createOneDriveBackendBridge({ env, fetchImpl, refreshTokenFile });
    assert.equal(await bridge.readDistrictDatabase("CHITTORGARH"), null);
    const saved = await bridge.writeDistrictDatabase("CHITTORGARH", {
      records: [{ NAME: "Test" }],
      updatedAt: "2026-11-25T10:00:00.000Z"
    });

    assert.equal(saved.district, "CHITTORGARH");
    assert.equal((await bridge.readDistrictDatabase("chittorgarh")).payload.records[0].NAME, "Test");
    assert.equal(tokenRequests, 1);
    assert.equal(env.ONEDRIVE_REFRESH_TOKEN, "rotated-refresh-token");
    assert.equal(await readFile(refreshTokenFile, "utf8"), "rotated-refresh-token\n");
    assert.ok(graphCalls.some((call) => call.method === "PUT" && call.url.includes("_db.json:/content")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("creates a one-time authorization URL and persists the resulting refresh token", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "police-onedrive-auth-"));
  const refreshTokenFile = path.join(directory, "refresh.token");
  let tokenBody;
  const bridge = createOneDriveBackendBridge({
    env: {
      ONEDRIVE_CLIENT_ID: "test-client",
      ONEDRIVE_CLIENT_SECRET: "test-secret",
      ONEDRIVE_REDIRECT_URI: "https://portal.example.test/api/onedrive/auth-callback"
    },
    refreshTokenFile,
    fetchImpl: async (url, options) => {
      assert.match(String(url), /oauth2\/v2\.0\/token/);
      tokenBody = new URLSearchParams(options.body);
      return Response.json({
        access_token: "mock-access-token",
        refresh_token: "one-drive-refresh-token",
        expires_in: 3600
      });
    }
  });

  try {
    const { authorizationUrl } = await bridge.createAuthUrl();
    const authorization = new URL(authorizationUrl);
    assert.equal(authorization.searchParams.get("redirect_uri"), "https://portal.example.test/api/onedrive/auth-callback");
    const state = authorization.searchParams.get("state");
    await assert.rejects(bridge.completeAuth({ code: "authorization-code", state: "wrong-state" }), {
      status: 400
    });
    assert.deepEqual(await bridge.completeAuth({ code: "authorization-code", state }), { connected: true });
    assert.equal(tokenBody.get("grant_type"), "authorization_code");
    assert.equal(tokenBody.get("code"), "authorization-code");
    assert.equal(await readFile(refreshTokenFile, "utf8"), "one-drive-refresh-token\n");
    await assert.rejects(bridge.createAuthUrl(), { status: 409 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("uploads supported files into the district Storage folder", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "police-onedrive-storage-"));
  let uploadedBytes;
  const bridge = createOneDriveBackendBridge({
    env: {
      ONEDRIVE_CLIENT_ID: "test-client",
      ONEDRIVE_CLIENT_SECRET: "test-secret",
      ONEDRIVE_REFRESH_TOKEN: "refresh-token"
    },
    refreshTokenFile: path.join(directory, "refresh.token"),
    fetchImpl: async (url, options = {}) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/oauth2/v2.0/token")) {
        return Response.json({ access_token: "mock-access-token", expires_in: 3600 });
      }
      if (requestUrl.endsWith("/me/drive/root/children?$select=id,name,folder")) {
        return Response.json({ value: [{ id: "folder-root", name: "PoliceForcePortal", folder: {} }] });
      }
      if (requestUrl.endsWith("/me/drive/items/folder-root/children?$select=id,name,folder")) {
        return Response.json({ value: [{ id: "folder-district", name: "UDAIPUR", folder: {} }] });
      }
      if (requestUrl.endsWith("/me/drive/items/folder-district/children?$select=id,name,folder")) {
        return Response.json({ value: [{ id: "folder-storage", name: "Storage", folder: {} }] });
      }
      if (requestUrl.includes("/me/drive/items/folder-storage:/order.pdf:/content")) {
        uploadedBytes = Buffer.from(options.body);
        return Response.json({ id: "stored-pdf", name: "order.pdf", size: uploadedBytes.byteLength });
      }
      throw new Error(`Unexpected Graph request: ${options.method || "GET"} ${requestUrl}`);
    }
  });

  try {
    const saved = await bridge.uploadStorageFile("UDAIPUR", {
      fileName: "order.pdf",
      contentType: "application/pdf",
      data: Buffer.from("%PDF")
    });
    assert.equal(saved.id, "stored-pdf");
    assert.equal(uploadedBytes.toString(), "%PDF");
    await assert.rejects(bridge.uploadStorageFile("UDAIPUR", {
      fileName: "../private.pdf",
      contentType: "application/pdf",
      data: Buffer.from("data")
    }), { status: 400 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
