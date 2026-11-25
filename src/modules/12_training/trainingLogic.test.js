import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCourseWiseTrainingSummary,
  buildInstituteWiseTrainingSummary,
  buildPostWiseTrainingSummary,
  buildYearWiseTrainingSummary,
  getMissingTrainingCourses,
  isBeltRank
} from "./trainingLogic.js";

test("training summary returns one row per employee and only checks PCC for FC and HC", () => {
  const employees = [
    { _uid: "fc-1", NAME: "Constable One", CADER: "FC", "BELT NO": "101", POSTING: "PS A" },
    { _uid: "hc-1", NAME: "Head Constable", CADER: "HC", "BELT NO": "201", POSTING: "PS B" },
    { _uid: "si-1", NAME: "Sub Inspector", CADER: "SI", "BELT NO": "301", POSTING: "PS C" },
    { _uid: "fc-1-copy", NAME: "Constable One", CADER: "FC", "BELT NO": "101", POSTING: "PS A" }
  ];
  const history = [
    { NAME: "Constable One", CADER: "FC", "BELT NO": "101", COURSE_NAME: "PCC" },
    { NAME: "Constable One", CADER: "FC", "BELT NO": "101", COURSE_NAME: "Cyber" },
    { NAME: "Sub Inspector", CADER: "SI", "BELT NO": "301", COURSE_NAME: "Basic Training" }
  ];

  const rows = getMissingTrainingCourses(employees, history);
  assert.equal(rows.length, 3);
  const fc = rows.find((row) => row["BELT NO"] === "101");
  const hc = rows.find((row) => row["BELT NO"] === "201");
  const si = rows.find((row) => row["BELT NO"] === "301");
  assert.equal(fc["पूर्ण प्रशिक्षण संख्या"], 2);
  assert.deepEqual(fc["अपूर्ण कोर्स"], ["बुनियादी प्रशिक्षण", "विशेष कोर्स"]);
  assert.ok(hc["अपूर्ण कोर्स"].includes("PCC"));
  assert.ok(!si["अपूर्ण कोर्स"].includes("PCC"));
});

test("belt number is displayed only for HC and FC ranks", () => {
  assert.equal(isBeltRank({ CADER: "HC" }), true);
  assert.equal(isBeltRank({ CADER: "FC" }), true);
  assert.equal(isBeltRank({ CADER: "FC(DR)" }), false);
  assert.equal(isBeltRank({ CADER: "SI" }), false);
});

test("post-wise, course-wise, institute-wise, and year-wise summaries aggregate cleanly", () => {
  const employees = [
    { _uid: "1", NAME: "Emp 1", CADER: "FC", "BELT NO": "10", POSTING: "PS A" },
    { _uid: "2", NAME: "Emp 2", CADER: "SI", POSTING: "PS B" }
  ];
  const history = [
    { NAME: "Emp 1", CADER: "FC", "BELT NO": "10", COURSE_NAME: "PCC", INSTITUTE: "PTS किशनगढ़", FROM_DATE: "2024-05-01", TO_DATE: "2024-05-15" },
    { NAME: "Emp 2", CADER: "SI", COURSE_NAME: "Cyber Crime", INSTITUTE: "CDTI जयपुर", FROM_DATE: "2025-02-01", TO_DATE: "2025-02-10" }
  ];

  const postRows = buildPostWiseTrainingSummary(employees, history);
  assert.equal(postRows.find((r) => r.rank === "FC").trainedCount, 1);
  assert.equal(postRows.find((r) => r.rank === "SI").trainedCount, 1);

  const courseRows = buildCourseWiseTrainingSummary(employees, history);
  const pcc = courseRows.find((r) => r.course === "PCC");
  assert.equal(pcc.applicableTotal, 1);
  assert.equal(pcc.completedCount, 1);

  const instRows = buildInstituteWiseTrainingSummary(history);
  assert.equal(instRows.find((r) => r.institute === "PTS किशनगढ़").completedCount, 1);
  assert.equal(instRows.find((r) => r.institute === "CDTI जयपुर").completedCount, 1);

  const yearRows = buildYearWiseTrainingSummary(history, "CALENDAR", 2020);
  assert.equal(yearRows.find((r) => r.period === "2024").completedCount, 1);
  assert.equal(yearRows.find((r) => r.period === "2025").completedCount, 1);
});
