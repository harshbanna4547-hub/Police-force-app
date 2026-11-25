import assert from "node:assert/strict";
import test from "node:test";
import {
  filterEmployeesByGender,
  mapRankToCode,
  matchesEmployeeSearch,
  matchEmployeeToUnit
} from "./forceLogic.js";
import { resolveUnitAndChowki } from "./core/postingResolver.js";
import { isDevlysText, isEnglishEducationToken } from "./core/isDevlysText.js";
import { translateUnitName } from "./utils/i18n.js";

test("rank mapping uses the supplied rank and belt independently", () => {
  assert.equal(mapRankToCode("HC", "1234"), "HC");
  assert.equal(mapRankToCode("SI", "FC-12"), "SI");
});

test("unit matching accepts legacy DevLys, Unicode Hindi, and English aliases across SP, ASP, CO, PS, and RPL", () => {
  assert.equal(matchEmployeeToUnit("Fkkuk dksrokyh fprkSMx<+", "थाना कोतवाली चित्तौड़गढ़"), true);
  assert.equal(matchEmployeeToUnit("iqfyl ykbZu", "पुलिस लाईन चित्तौड़गढ़ (RPL)"), true);
  assert.equal(matchEmployeeToUnit("PS Sadar Nimbahera", "थाना सदर निम्बाहेड़ा"), true);
  assert.equal(matchEmployeeToUnit("dk;kZy; iqfyl v/kh{kd", "कार्यालय पुलिस अधीक्षक चित्तौड़गढ़ (SPO)"), true);
  assert.equal(matchEmployeeToUnit("LFkkiuk 'kk[kk", "स्थापना शाखा (Force Branch)"), true);
  assert.equal(matchEmployeeToUnit("CO Nimbahera", "वृत्त कार्यालय निम्बाहेड़ा"), true);
  assert.equal(matchEmployeeToUnit("Fkkuk pUnsfj;k", "थाना चन्देरिया"), true);
  assert.equal(matchEmployeeToUnit("थानाधिकारी कोतवाली चित्तौड़गढ़ 10-07-2026", "थाना कोतवाली चित्तौड़गढ़"), true);
  assert.equal(matchEmployeeToUnit("वृत्ताधिकारी निम्बाहेड़ा 20-06-2026", "वृत्त कार्यालय निम्बाहेड़ा"), true);
  assert.equal(matchEmployeeToUnit("थाना सदर चित्तौड़गढ़ चौकी सैंती", "थाना सदर चित्तौड़गढ़"), true);
  assert.equal(matchEmployeeToUnit("थानाधिकारी कोतवाली निम्बाहेड़ा 10.07.2026", "थाना कोतवाली निम्बाहेड़ा"), true);
  assert.equal(matchEmployeeToUnit("थानाधिकारी कोतवाली निम्बाहेड़ा 10.07.2026", "थाना कोतवाली चित्तौड़गढ़"), false);
});

test("resolveUnitAndChowki resolves DevLys chowkis and branches accurately", () => {
  assert.deepEqual(resolveUnitAndChowki("lSarh"), {
    unit: "थाना सदर चित्तौड़गढ़",
    chowki: "चौकी सैंती"
  });
  assert.deepEqual(resolveUnitAndChowki("Fkkuk dksrokyh"), {
    unit: "थाना कोतवाली चित्तौड़गढ़",
    chowki: "थाना मुख्यालय (कोतवाली)"
  });
  assert.deepEqual(resolveUnitAndChowki("iqfyl ykbZu"), {
    unit: "पुलिस लाईन चित्तौड़गढ़ (RPL)",
    chowki: ""
  });
  assert.deepEqual(resolveUnitAndChowki("थानाधिकारी कोतवाली चित्तौड़गढ़ 10-07-2026"), {
    unit: "थाना कोतवाली चित्तौड़गढ़",
    chowki: "थाना मुख्यालय (कोतवाली)"
  });
  assert.deepEqual(resolveUnitAndChowki("वृत्ताधिकारी निम्बाहेड़ा 20-06-2026"), {
    unit: "वृत्त कार्यालय निम्बाहेड़ा",
    chowki: ""
  });
  assert.deepEqual(resolveUnitAndChowki("थाना सदर चित्तौड़गढ़ चौकी सैंती"), {
    unit: "थाना सदर चित्तौड़गढ़",
    chowki: "चौकी सैंती"
  });
});

test("isDevlysText detects DevLys 010 words while keeping English codes in Times New Roman", () => {
  assert.equal(isDevlysText("Jh"), true);
  assert.equal(isDevlysText("fot;"), true);
  assert.equal(isDevlysText("dqekj"), true);
  assert.equal(isDevlysText("Fkkuk"), true);
  assert.equal(isDevlysText("dksrokyh"), true);
  assert.equal(isDevlysText(",d"), true);
  assert.equal(isDevlysText("FC"), false);
  assert.equal(isDevlysText("HC"), false);
  assert.equal(isDevlysText("DySP"), false);
  assert.equal(isDevlysText("1234"), false);
  assert.equal(isDevlysText("user@example.com"), false);
});

test("education smart font detection separates English degrees from DevLys Hindi degrees", () => {
  for (const deg of ["BA", "MA", "BSC", "MSC", "B.ED", "LLB", "BE", "10th", "12th", "Senior", "Higher", "Secondary"]) {
    assert.equal(isDevlysText(deg), false, `${deg} should stay in Times New Roman`);
    assert.equal(isEnglishEducationToken(deg), true, `${deg} should be recognized as education degree`);
  }
  assert.equal(isDevlysText("Lukrd"), true);
  assert.equal(isEnglishEducationToken("Lukrd"), false);
  assert.equal(isDevlysText("eSfVªd"), true);
  assert.equal(isEnglishEducationToken("eSfVªd"), false);
});

test("matchesEmployeeSearch matches both DevLys raw text and Unicode Hindi queries", () => {
  const emp = { NAME: "Jh fot; dqekj", POSTING: "Fkkuk dksrokyh", "BELT NO": "123" };
  assert.equal(matchesEmployeeSearch(emp, "कोतवाली"), true);
  assert.equal(matchesEmployeeSearch(emp, "Fkkuk"), true);
  assert.equal(matchesEmployeeSearch(emp, "123"), true);
  assert.equal(matchesEmployeeSearch(emp, "निम्बाहेड़ा"), false);
});

test("translateUnitName translates PS, CO, Chowki, and Branches to English", () => {
  assert.equal(translateUnitName("थाना कोतवाली चित्तौड़गढ़", "en"), "PS Kotwali Chittorgarh");
  assert.equal(translateUnitName("वृत्त कार्यालय निम्बाहेड़ा", "en"), "CO Office Nimbahera");
  assert.equal(translateUnitName("चौकी सैंती", "en"), "Chowki Senti");
  assert.equal(translateUnitName("अपराध शाखा (Crime Branch)", "en"), "Crime Branch");
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
