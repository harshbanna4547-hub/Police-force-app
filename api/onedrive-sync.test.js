import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import express from "express";
import test from "node:test";
import { createOneDriveSyncHandler } from "./onedrive-sync.js";

const officeToken = "office-access-token-123456789012345";

async function withApi(bridge, env, run) {
  const app = express();
  app.use(express.raw({ type: () => true, limit: "5mb" }));
  app.all("/api/onedrive-sync", createOneDriveSyncHandler({ bridge, env }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}/api/onedrive-sync`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("requires the configured Office Access Key before reading OneDrive data", async () => {
  let readCount = 0;
  const bridge = {
    readDistrictDatabase: async () => {
      readCount += 1;
      return null;
    }
  };

  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const response = await fetch(`${url}?district=UDAIPUR`);
    assert.equal(response.status, 401);
    assert.equal(readCount, 0);
  });
});

test("serves district database reads and writes through the protected API", async () => {
  let savedPayload;
  const bridge = {
    readDistrictDatabase: async (district) => ({
      district,
      payload: { records: [{ NAME: "Existing" }] },
      updatedAt: "2026-11-25T10:00:00.000Z"
    }),
    writeDistrictDatabase: async (district, payload) => {
      savedPayload = { district, payload };
      return { district, updatedAt: payload.updatedAt };
    }
  };

  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const headers = { Authorization: `Bearer ${officeToken}` };
    const readResponse = await fetch(`${url}?district=udaipur`, { headers });
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json()).database.district, "UDAIPUR");

    const payload = { records: [{ NAME: "Updated" }], updatedAt: "2026-11-26T10:00:00.000Z" };
    const writeResponse = await fetch(`${url}?district=udaipur`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ payload })
    });
    assert.equal(writeResponse.status, 200);
    assert.deepEqual(savedPayload, { district: "UDAIPUR", payload });
  });
});

test("uploads and downloads Storage files through the protected API", async () => {
  let uploaded;
  const bridge = {
    uploadStorageFile: async (district, file) => {
      uploaded = { district, ...file };
      return { id: "stored-pdf", name: file.fileName };
    },
    downloadStorageFile: async (_district, fileId) => {
      assert.equal(fileId, "stored-pdf");
      return Buffer.from("%PDF");
    }
  };

  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const headers = {
      Authorization: `Bearer ${officeToken}`,
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent("2026-11-26_order.pdf"),
      "X-File-Type": "application/pdf"
    };
    const uploadResponse = await fetch(`${url}?district=UDAIPUR&resource=storage`, {
      method: "POST",
      headers,
      body: "%PDF"
    });
    assert.equal(uploadResponse.status, 200);
    assert.equal(uploaded.fileName, "2026-11-26_order.pdf");
    assert.equal(uploaded.data.toString(), "%PDF");

    const downloadResponse = await fetch(
      `${url}?district=UDAIPUR&resource=storage-file&fileId=stored-pdf`,
      { headers: { Authorization: `Bearer ${officeToken}` } }
    );
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), "%PDF");
  });
});

test("routes offline JSON backups to the protected Storage Backup folder", async () => {
  let uploaded;
  const bridge = {
    uploadStorageFile: async (district, file) => {
      uploaded = { district, ...file };
      return { id: "stored-backup", name: file.fileName };
    }
  };
  const fileName = "Backup_UDAIPUR_26-11-2026_10-35.json";

  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const response = await fetch(`${url}?district=UDAIPUR&resource=storage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${officeToken}`,
        "Content-Type": "application/json",
        "X-File-Name": encodeURIComponent(fileName),
        "X-File-Type": "application/json",
        "X-Storage-Folder": "Backup"
      },
      body: JSON.stringify({ records: [] })
    });
    assert.equal(response.status, 200);
    assert.equal(uploaded.folder, "Backup");
    assert.equal(uploaded.fileName, fileName);
    assert.deepEqual(JSON.parse(uploaded.data.toString()), { records: [] });
  });
});

test("serves protected configuration and active-device resources", async () => {
  const activeDevices = [{
    deviceId: "device_123456",
    name: "Office PC",
    district: "UDAIPUR",
    screenType: "Desktop"
  }];
  const bridge = {
    getConfigurationStatus: async () => ({
      clientIdConfigured: true,
      clientSecretConfigured: true,
      refreshTokenConfigured: true,
      redirectUriConfigured: false
    }),
    readActiveDevices: async () => activeDevices,
    upsertActiveDevice: async (district, device) => {
      activeDevices.push({ ...device, district });
      return activeDevices;
    }
  };

  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const headers = { Authorization: `Bearer ${officeToken}` };
    const configResponse = await fetch(`${url}?district=UDAIPUR&resource=config-status`, { headers });
    assert.deepEqual((await configResponse.json()).configuration, {
      clientIdConfigured: true,
      clientSecretConfigured: true,
      refreshTokenConfigured: true,
      redirectUriConfigured: false
    });

    const devicesResponse = await fetch(`${url}?district=UDAIPUR&resource=active-devices`, { headers });
    assert.equal((await devicesResponse.json()).devices[0].name, "Office PC");

    const device = {
      deviceId: "device_654321",
      name: "Home Laptop",
      screenType: "Desktop",
      lastActiveAt: new Date().toISOString()
    };
    const writeResponse = await fetch(`${url}?district=UDAIPUR&resource=active-devices`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ device })
    });
    assert.equal(writeResponse.status, 200);
    const result = await writeResponse.json();
    assert.equal(result.devices.at(-1).district, "UDAIPUR");
    assert.equal(result.devices.at(-1).name, "Home Laptop");
  });
});

test("fails explicitly when the server key is not configured", async () => {
  await withApi({}, {}, async (url) => {
    const response = await fetch(`${url}?district=UDAIPUR`, {
      headers: { Authorization: `Bearer ${officeToken}` }
    });
    assert.equal(response.status, 503);
  });
});

test("rejects district database responses larger than the serverless transfer limit", async () => {
  const bridge = {
    readDistrictDatabase: async (district) => ({
      district,
      payload: { oversized: "x".repeat(4_000_001) }
    })
  };
  await withApi(bridge, { OFFICE_SERVER_TOKEN: officeToken }, async (url) => {
    const response = await fetch(`${url}?district=UDAIPUR`, {
      headers: { Authorization: `Bearer ${officeToken}` }
    });
    assert.equal(response.status, 413);
  });
});
