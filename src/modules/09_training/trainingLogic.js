export const REQUIRED_COURSES = [
  { label: "PCC", aliases: ["pcc"] },
  { label: "बुनियादी प्रशिक्षण", aliases: ["बुनियादी", "basic training", "basic course"] },
  { label: "साइबर", aliases: ["साइबर", "cyber"] },
  { label: "विशेष कोर्स", aliases: ["विशेष", "special course", "special training"] }
];

export function getMissingTrainingCourses(records, trainingRows) {
  const rows = Array.isArray(trainingRows) ? trainingRows : [];
  return (records || []).flatMap((record) => REQUIRED_COURSES
    .filter((course) => !rows.some((row) => {
      const sameBelt = String(row["BELT NO"] || "").trim().toUpperCase() ===
        String(record["BELT NO"] || "").trim().toUpperCase();
      const courseName = String(row.COURSE_NAME || "").toLowerCase();
      return sameBelt && course.aliases.some((alias) => courseName.includes(alias.toLowerCase()));
    }))
    .map((course) => ({
      "BELT NO": record["BELT NO"],
      CADER: record.CADER,
      NAME: record.NAME,
      "अपूर्ण कोर्स": course.label
    })));
}
