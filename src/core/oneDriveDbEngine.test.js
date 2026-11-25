import assert from "node:assert/strict";
import test from "node:test";
import {
  deserializeOneDriveVault,
  getDatedOneDriveStorageFileName,
  getDistrictDatabasePath,
  getDistrictStoragePath,
  serializeOneDriveVault
} from "./oneDriveDbEngine.js";

test("builds district-specific OneDrive database and Storage paths", () => {
  assert.equal(getDistrictDatabasePath("Chittorgarh"), "PoliceForcePortal/CHITTORGARH_master_db.json");
  assert.equal(getDistrictStoragePath("Udaipur"), "PoliceForcePortal/UDAIPUR/Storage");
  assert.throws(() => getDistrictDatabasePath("../district"), { code: "DISTRICT_INVALID" });
});

test("keeps training nominations in the OneDrive database payload", () => {
  const nominations = [{ NAME: "Officer", STATUS: "PENDING" }];
  const serialized = serializeOneDriveVault({
    records: [{ NAME: "Officer" }],
    allSheets: { Training_Nominations: nominations }
  });
  const restored = deserializeOneDriveVault(serialized);

  assert.deepEqual(serialized.trainingNominations, nominations);
  assert.deepEqual(restored.allSheets.Training_Nominations, nominations);
});

test("adds a date prefix and removes path characters from Storage file names", () => {
  assert.equal(
    getDatedOneDriveStorageFileName({ name: "report.xlsx", updatedAt: "2026-11-25T10:00:00.000Z" }),
    "2026-11-25_report.xlsx"
  );
  assert.equal(
    getDatedOneDriveStorageFileName({ name: "../report.pdf", updatedAt: "2026-11-25T10:00:00.000Z" }),
    "2026-11-25_.._report.pdf"
  );
});
