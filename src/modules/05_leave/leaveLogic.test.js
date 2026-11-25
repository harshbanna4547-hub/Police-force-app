import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmployeePlPassbook,
  buildOverstayTracker,
  calculateRetirementEncashment,
  getLeaveBalance,
  getRsrLeaveBalances
} from "./leaveLogic.js";

test("300 PL account computes semi-annual +15/+15 credits, 300 cap, FY 15-day encashment, and passbook", () => {
  const employee = {
    _uid: "emp-1",
    NAME: "Constable Ram",
    CADER: "FC",
    "BELT NO": "501",
    "DATE OF JOINING": "01-01-2010"
  };
  const leaveRows = [
    { "BELT NO": "501", LEAVE_TYPE: "PL", FROM_DATE: "10-05-2026", TO_DATE: "19-05-2026", DAYS_TAKEN: 10, ORDER_NO_DATE: "DOB-12" },
    { "BELT NO": "501", LEAVE_TYPE: "PL_ENCASHMENT", FROM_DATE: "15-06-2026", DAYS_TAKEN: 15, FINANCIAL_YEAR: "2026-27", ORDER_NO_DATE: "DOB-45" }
  ];
  const asOf = new Date(2026, 7, 1); // Aug 2026 -> 34 half-years -> 510 earned -> capped 300
  const pl = getLeaveBalance(employee, leaveRows, asOf);
  assert.equal(pl.balance, 275);
  assert.equal(pl.fyEncashedDays, 15);
  assert.equal(pl.fyEncashmentRemaining, 0);

  const passbook = buildEmployeePlPassbook(employee, leaveRows, new Date(2026, 5, 25));
  assert.ok(passbook.length >= 33);
  assert.equal(passbook.at(-1).rawRunning, 290);
  assert.equal(passbook.at(-1).balance, 290);

  const seniorPassbook = buildEmployeePlPassbook(employee, [], asOf);
  assert.equal(seniorPassbook.at(-1).rawRunning, 315);
  assert.equal(seniorPassbook.at(-1).balance, 300);
  assert.equal(seniorPassbook.at(-1).capWarning, true);

  const ret = calculateRetirementEncashment(315, 30000, 50);
  assert.equal(ret.encashableDays, 300);
  assert.equal(ret.estimatedAmount, 450000);
});

test("RSR leave balances track CL(15), HPL, ML(180), PL-Pat(15), and CCL(730)", () => {
  const employee = {
    _uid: "emp-2",
    NAME: "Sita Devi",
    CADER: "MFC",
    "BELT NO": "777",
    "DATE OF JOINING": "01-01-2022"
  };
  const leaveRows = [
    { "BELT NO": "777", LEAVE_TYPE: "CL", LEAVE_YEAR: "2026", DAYS_TAKEN: 4 },
    { "BELT NO": "777", LEAVE_TYPE: "CCL", DAYS_TAKEN: 30 }
  ];
  const rsr = getRsrLeaveBalances(employee, leaveRows, new Date(2026, 5, 1));
  assert.equal(rsr.CL.remaining, 11);
  assert.equal(rsr.CCL.remaining, 700);
});

test("overstay tracker detects on-leave, returning-today, and overstay employees", () => {
  const today = new Date(2026, 6, 15);
  const rows = [
    { "BELT NO": "1", NAME: "A", LEAVE_TYPE: "PL", FROM_DATE: "10-07-2026", TO_DATE: "20-07-2026" },
    { "BELT NO": "2", NAME: "B", LEAVE_TYPE: "CL", FROM_DATE: "12-07-2026", TO_DATE: "15-07-2026" },
    { "BELT NO": "3", NAME: "C", LEAVE_TYPE: "PL", FROM_DATE: "01-07-2026", TO_DATE: "10-07-2026" },
    { "BELT NO": "4", NAME: "D", LEAVE_TYPE: "PL", FROM_DATE: "01-07-2026", TO_DATE: "05-07-2026", RETURN_STATUS: "RETURNED" }
  ];
  const tracker = buildOverstayTracker(rows, today);
  assert.equal(tracker.onLeaveToday.length, 1);
  assert.equal(tracker.returningToday.length, 1);
  assert.equal(tracker.overstayAbsent.length, 1);
  assert.equal(tracker.overstayAbsent[0].overdueDays, 5);
});
