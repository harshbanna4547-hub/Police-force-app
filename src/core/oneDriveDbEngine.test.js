import assert from "node:assert/strict";
import test from "node:test";
import {
  synchronizeOneDriveStorage,
  synchronizeOneDriveVault
} from "./oneDriveDbEngine.js";

const ACCESS_KEY = "test-office-key-123456789012345678901234";

async function withBrowserApi(fetchImpl, callback) {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.window = {
    localStorage: { getItem: () => ACCESS_KEY },
    location: { hostname: "127.0.0.1", origin: "http://127.0.0.1:5050", port: "5050" },
    setTimeout,
    clearTimeout
  };
  globalThis.fetch = fetchImpl;
  try {
    return await callback();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("pulls a newer district database without replacing it with stale local data", async () => {
  await withBrowserApi(async () => Response.json({
    district: "UDAIPUR",
    updatedAt: "2026-11-25T12:00:00.000Z",
    payload: { records: [{ NAME: "Cloud copy" }] }
  }), async () => {
    const result = await synchronizeOneDriveVault("udaipur", {
      updatedAt: "2026-11-25T11:00:00.000Z",
      records: [{ NAME: "Old local copy" }]
    });
    assert.equal(result.direction, "pull");
    assert.equal(result.vault.records[0].NAME, "Cloud copy");
  });
});

test("keeps local Storage files and downloads newer OneDrive Excel/PDF files", async () => {
  const calls = [];
  await withBrowserApi(async (url, options = {}) => {
    const requestUrl = String(url);
    calls.push({ url: requestUrl, method: options.method || "GET" });
    if (requestUrl.endsWith("/api/onedrive/storage/UDAIPUR") && options.method !== "POST") {
      return Response.json({
        files: [
          { id: "graph-xlsx", name: "field.xlsx", size: 3, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", updatedAt: "2026-11-25T11:00:00.000Z" },
          { id: "graph-pdf", name: "remote.pdf", size: 4, mime: "application/pdf", updatedAt: "2026-11-25T12:00:00.000Z" }
        ]
      });
    }
    if (requestUrl.endsWith("/graph-pdf/content")) {
      return new Response(new Uint8Array([37, 80, 68, 70]));
    }
    if (requestUrl.endsWith("/api/onedrive/storage/UDAIPUR") && options.method === "POST") {
      return Response.json({ id: "uploaded-xlsx", updatedAt: "2026-11-25T13:00:00.000Z" });
    }
    throw new Error(`Unexpected client request: ${options.method || "GET"} ${requestUrl}`);
  }, async () => {
    const localItems = [{
      id: "local-xlsx",
      district: "Udaipur",
      kind: "FILE",
      name: "field.xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      updatedAt: "2026-11-25T12:30:00.000Z",
      data: new Uint8Array([1, 2, 3]).buffer
    }];
    const result = await synchronizeOneDriveStorage("UDAIPUR", localItems);
    assert.equal(result.length, 2);
    assert.equal(result[0].oneDriveFileId, "uploaded-xlsx");
    assert.equal(result[1].name, "remote.pdf");
    assert.deepEqual(Array.from(new Uint8Array(result[1].data)), [37, 80, 68, 70]);
    assert.ok(calls.some((call) => call.method === "POST"));
    assert.ok(calls.some((call) => call.url.endsWith("/graph-pdf/content")));
  });
});
