import assert from "node:assert/strict";
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
    try {
      saveOfficeServerConfig(baseUrl, "test-office-key-123456789012345678901234");
      const pushed = await synchronizeOfficeVault("CHITTORGARH", {
        records: [{ NAME: "Synced from client" }],
        updatedAt: "2026-11-24T11:00:00.000Z"
      });
      assert.equal(pushed.direction, "push");
      assert.equal(pushed.updatedAt, "2026-11-24T11:00:00.000Z");
    } finally {
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
