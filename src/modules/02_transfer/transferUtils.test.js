import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTransferPostingOptions,
  createTransferOrderUpdates,
  getCompletedTenureYears,
  getTransferRank,
  groupTransferOrders,
  normalizeTransferDateInput,
  parsePostingDate
} from "./transferUtils.js";

test("validates DD-MM-YYYY dates and parses dates inside order references", () => {
  assert.equal(normalizeTransferDateInput("7-2-2025"), "07-02-2025");
  assert.equal(normalizeTransferDateInput("31-02-2025"), "");
  assert.equal(parsePostingDate("Order 44 / 01-07-2020")?.getFullYear(), 2020);
});

test("calculates completed tenure years at the anniversary boundary", () => {
  assert.equal(getCompletedTenureYears("01-07-2020", new Date(2024, 5, 30)), 3);
  assert.equal(getCompletedTenureYears("01-07-2020", new Date(2024, 6, 1)), 4);
  assert.equal(getCompletedTenureYears("01-07-2025", new Date(2024, 6, 1)), 0);
});

test("maps supported employee ranks, including Hindi cadre names", () => {
  assert.equal(getTransferRank({ CADER: "ASI" }), "ASI");
  assert.equal(
    getTransferRank({ CADER: "\u092a\u0941\u0932\u093f\u0938 \u0909\u092a \u0928\u093f\u0930\u0940\u0915\u094d\u0937\u0915" }),
    "SI"
  );
  assert.equal(getTransferRank({ CADER: "HC" }), "HC");
  assert.equal(getTransferRank({ CADER: "CT" }), "FC");
});

test("deduplicates station and chowki choices case-insensitively", () => {
  assert.deepEqual(
    buildTransferPostingOptions(["Unit X", "unit x"], { office: ["Post Y"] }),
    ["Post Y", "Unit X"]
  );
});

test("updates selected postings and creates durable order-history rows", () => {
  const records = [
    { _uid: "one", "BELT NO": "HC-1", NAME: "Officer", CADER: "HC", POSTING: "Old station" },
    { _uid: "two", "BELT NO": "FC-2", NAME: "Other", CADER: "CT", POSTING: "Unchanged" }
  ];
  const { updatedRecords, historyEntries } = createTransferOrderUpdates(
    records,
    { one: { destination: "New station", remark: "प्रशासनिक" } },
    new Set(["one"]),
    {
      orderId: "TRANSFER-test",
      orderNo: "875",
      orderDate: "10-07-2026",
      issuedAt: "2026-07-10T00:00:00.000Z"
    }
  );

  assert.equal(updatedRecords[0].POSTING, "New station");
  assert.equal(updatedRecords[0]["POSTING DOB NO"], "875 / 10-07-2026");
  assert.strictEqual(updatedRecords[1], records[1]);
  assert.equal(historyEntries.length, 1);
  assert.equal(historyEntries[0].OLD_POSTING, "Old station");
  assert.equal(historyEntries[0].NEW_POSTING, "New station");
  assert.equal(historyEntries[0].POSTING_PLACE, "New station");
  assert.equal(historyEntries[0].ORDER_ID, "TRANSFER-test");
  assert.equal(historyEntries[0].REMARK, "प्रशासनिक");
});

test("groups history rows by reusable transfer order ID", () => {
  const orders = groupTransferOrders([
    { ORDER_ID: "order-a", ORDER_NO: "5", ORDER_DATE: "01-01-2025" },
    { ORDER_ID: "order-a", ORDER_NO: "5", ORDER_DATE: "01-01-2025" },
    { ORDER_ID: "order-b", ORDER_NO: "6", ORDER_DATE: "02-01-2025" }
  ]);
  assert.equal(orders.length, 2);
  assert.equal(orders.find((order) => order.id === "order-a").rows.length, 2);
});
