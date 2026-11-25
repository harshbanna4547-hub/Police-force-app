import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createApp } from "./server.js";
import {
  saveOfficeServerConfig,
  synchronizeOfficeVault
} from "../src/core/lanSyncClient.js";

test("protects the LAN data API and keeps district writes versioned", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "police-office-server-"));
  const frontendDirectory = path.join(directory, "dist");
  await mkdir(frontendDirectory);
  await writeFile(path.join(frontendDirectory, "index.html"), "<!doctype html><title>Office LAN</title>");
  const server = createApp({
    token: "test-office-key-123456789012345678901234",
    databaseFile: path.join(directory, "office.json"),
    frontendDirectory
  }).listen(0, "127.0.0.1");

  try {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
    }
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).district, "CHITTORGARH");
    const appPage = await fetch(`${baseUrl}/`);
    assert.match(await appPage.text(), /Office LAN/);
    const clientRoute = await fetch(`${baseUrl}/modules/strength`);
    assert.match(await clientRoute.text(), /Office LAN/);

    const unauthorized = await fetch(`${baseUrl}/api/data/CHITTORGARH`);
    assert.equal(unauthorized.status, 401);

    const headers = {
      Authorization: "Bearer test-office-key-123456789012345678901234",
      "Content-Type": "application/json"
    };
    const saved = await fetch(`${baseUrl}/api/data/CHITTORGARH`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payload: { records: [{ NAME: "Test Employee" }], updatedAt: "2026-11-24T10:00:00.000Z" }
      })
    });
    assert.equal(saved.status, 200);

    const loaded = await fetch(`${baseUrl}/api/data/CHITTORGARH`, { headers });
    assert.deepEqual((await loaded.json()).payload.records, [{ NAME: "Test Employee" }]);

    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;
    const localStorageValues = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (key) => localStorageValues.get(key) || null,
        setItem: (key, value) => localStorageValues.set(key, value),
        removeItem: (key) => localStorageValues.delete(key)
      },
      setTimeout,
      clearTimeout,
      location: { hostname: "127.0.0.1" }
    };
    globalThis.fetch = (url, options) => previousFetch(
      String(url).replace("http://127.0.0.1:5050", baseUrl),
      options
    );
    try {
      saveOfficeServerConfig("test-office-key-123456789012345678901234");
      const pushed = await synchronizeOfficeVault("CHITTORGARH", {
        records: [{ NAME: "Synced from client" }],
        updatedAt: "2026-11-24T11:00:00.000Z"
      });
      assert.equal(pushed.direction, "push");
      assert.equal(pushed.updatedAt, "2026-11-24T11:00:00.000Z");
    } finally {
      globalThis.fetch = previousFetch;
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }

    const staleWrite = await fetch(`${baseUrl}/api/data/CHITTORGARH`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payload: { records: [], updatedAt: "2026-11-23T10:00:00.000Z" }
      })
    });
    assert.equal(staleWrite.status, 409);

    const otherDistrict = await fetch(`${baseUrl}/api/data/UDAIPUR`, { headers });
    assert.equal(otherDistrict.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(directory, { recursive: true, force: true });
  }
});

test("protects OneDrive routes and exposes database, setup, and Storage operations", async () => {
  const accessToken = "test-office-key-123456789012345678901234";
  const storedPayloads = [];
  const bridgeCalls = [];
  const oneDriveBridge = {
    readDistrictDatabase: async (district) => {
      bridgeCalls.push(["read", district]);
      return { district, payload: { records: [{ NAME: "Cloud Employee" }] }, updatedAt: "2026-11-25T10:00:00.000Z" };
    },
    writeDistrictDatabase: async (district, payload) => {
      storedPayloads.push({ district, payload });
      return { district, updatedAt: payload.updatedAt };
    },
    createAuthUrl: async () => ({ authorizationUrl: "https://login.microsoftonline.com/mock" }),
    completeAuth: async (query) => {
      bridgeCalls.push(["callback", query.state]);
      return { connected: true };
    },
    listStorageFiles: async () => [{ id: "graph-file-id", name: "order.pdf", size: 12, mime: "application/pdf", updatedAt: null }],
    downloadStorageFile: async (district, fileId) => Buffer.from(`${district}:${fileId}`),
    uploadStorageFile: async (district, file) => {
      assert.equal(file.fileName, "order.pdf");
      assert.deepEqual(file.data, Buffer.from("pdf"));
      return { id: "new-graph-file", name: file.fileName };
    }
  };
  const server = createApp({
    token: accessToken,
    databaseFile: path.join(os.tmpdir(), `unused-office-db-${Date.now()}.json`),
    frontendDirectory: path.join(os.tmpdir(), "missing-office-dist"),
    oneDriveBridge
  }).listen(0, "127.0.0.1");

  try {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
    }
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${baseUrl}/api/cloud-db/UDAIPUR`)).status, 401);

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    };
    const loaded = await fetch(`${baseUrl}/api/cloud-db/udaipur`, { headers });
    assert.equal((await loaded.json()).district, "UDAIPUR");
    const unauthorizedSetup = await fetch(`${baseUrl}/api/onedrive/auth-init`, { method: "POST" });
    assert.equal(unauthorizedSetup.status, 401);
    const saved = await fetch(`${baseUrl}/api/cloud-db/UDAIPUR`, {
      method: "POST",
      headers,
      body: JSON.stringify({ payload: { updatedAt: "2026-11-25T11:00:00.000Z", records: [] } })
    });
    assert.equal(saved.status, 200);
    assert.equal(storedPayloads[0].district, "UDAIPUR");

    const authInit = await fetch(`${baseUrl}/api/onedrive/auth-init`, { method: "POST", headers });
    assert.match((await authInit.json()).authorizationUrl, /login\.microsoftonline\.com/);
    const callback = await fetch(`${baseUrl}/api/onedrive/auth-callback?code=one-time-code&state=state-value`);
    assert.equal(callback.status, 200);
    assert.ok(bridgeCalls.some(([name]) => name === "callback"));

    const storage = await fetch(`${baseUrl}/api/onedrive/storage/UDAIPUR`, { headers });
    assert.equal((await storage.json()).files[0].name, "order.pdf");
    const downloaded = await fetch(`${baseUrl}/api/onedrive/storage/UDAIPUR/graph-file-id/content`, { headers });
    assert.equal(await downloaded.text(), "UDAIPUR:graph-file-id");
    const uploaded = await fetch(`${baseUrl}/api/onedrive/storage/UDAIPUR`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "X-File-Name": "order.pdf",
        "X-File-Type": "application/pdf"
      },
      body: Buffer.from("pdf")
    });
    assert.equal((await uploaded.json()).id, "new-graph-file");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
