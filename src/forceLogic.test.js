import assert from "node:assert/strict";
import test from "node:test";
import {
  filterEmployeesByGender,
  mapRankToCode,
  matchEmployeeToUnit
} from "./forceLogic.js";

test("rank mapping uses the supplied rank and belt independently", () => {
  assert.equal(mapRankToCode("HC", "1234"), "HC");
  assert.equal(mapRankToCode("SI", "FC-12"), "SI");
});

test("unit matching accepts legacy DevLys and English aliases", () => {
  assert.equal(
    matchEmployeeToUnit("Fkkuk dksrokyh fprkSMx<+", "थाना कोतवाली चित्तौड़गढ़"),
    true
  );
  assert.equal(matchEmployeeToUnit("iqfyl ykbZu", "पुलिस लाईन चित्तौड़गढ़ (RPL)"), true);
  assert.equal(
    matchEmployeeToUnit("PS Sadar Nimbahera", "थाना सदर निम्बाहेड़ा"),
    true
  );
});

test("gender filtering keeps unknown employees only in the all view", () => {
  const employees = [
    { GENDER: "Female" },
    { SEX: "M" },
    { CADER: "MHC" },
    {}
  ];
  assert.equal(filterEmployeesByGender(employees, "FEMALE").length, 2);
  assert.equal(filterEmployeesByGender(employees, "MALE").length, 1);
  assert.equal(filterEmployeesByGender(employees).length, 4);
});
