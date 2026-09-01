const {
  EmployeeShift,
  Category,
  AttendanceIncentive,
  AttendanceIncentiveCondition,
  Employee,
  Department,
  Designation,
  PackagingIncentive,
  ShiftType,
  Attendance,
} = require("../models");

const { Op } = require("sequelize");
const moment = require("moment");
const INCENTIVE_CONFIG = require("../config/AttendenceIncentiveConfig");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getExperienceYears = (dateOfJoining) => {
  if (!dateOfJoining) return 0;
  const joined = new Date(dateOfJoining);
  if (isNaN(joined.getTime())) return 0;
  return (new Date() - joined) / (1000 * 60 * 60 * 24 * 365.25);
};

/**
 * Map category name → INCENTIVE_CONFIG grade key.
 *
 * Actual employee categories in DB:
 *   "MIXING"    → MIXING
 *   "OTHERS 1"  → OTHERS
 *   "OTHERS 2"  → OTHERS
 *   "HOSTEL 1"  → HOSTEL
 *   "HOSTEL 2"  → HOSTEL
 *   "STAFF 1"   → STAFF_MONTHLY
 *   "STAFF 2"   → STAFF_MONTHLY
 */
const resolveGradeKey = (categoryName = "", designationName = "") => {
  const c = categoryName.toUpperCase().trim();
  const d = designationName.toUpperCase().trim();

  // 1. Check designation-based overrides first
  if (d.includes("MAISTRY")) return "MAISTRY";
  if (d.includes("FITTER")) return "FITTER";
  if (d.includes("ELECTRIC") || d.includes("WIREMAN")) return "ELECTRICAL";
  if (d.includes("PLANT")) return "PLANT";

  // 2. Fall back to category-based mapping
  if (c === "MIXING") return "MIXING";
  if (c === "OTHERS 1" || c === "OTHERS 2" || c.includes("OTHERS")) return "OTHERS";
  // Hostel category employees are calculated under Hostel Attendance Incentive
  if (c === "HOSTEL 1" || c === "HOSTEL 2" || c.includes("HOSTEL")) return null;
  // if (c === "STAFF 1" || c === "STAFF 2" || c.includes("STAFF")) return "STAFF_MONTHLY";
  if (c === "STAFF 1" || c === "STAFF 2" || c.includes("STAFF")) return null;

  // ── Unknown category — log and default to OTHERS ──────────────────────────
  console.warn(
    `[resolveGradeKey] UNMAPPED category: "${categoryName}" with designation: "${designationName}" → defaulting to OTHERS`,
  );
  return "OTHERS";
};
const resolveShiftKey = (shiftMap, gradeKey) => {
  // Support both shift name formats: "I"/"A"/"Staff", "II"/"B", "III"/"C" and all General / Supervisor variants
  const shiftI =
    (shiftMap["I"] || 0) +
    (shiftMap["A"] || 0) +
    (shiftMap["Staff"] || 0) +
    (shiftMap["SUP_A"] || 0);

  const shiftII =
    (shiftMap["II"] || 0) +
    (shiftMap["B"] || 0) +
    (shiftMap["SUP_B"] || 0);

  const shiftIII =
    (shiftMap["III"] || 0) +
    (shiftMap["C"] || 0) +
    (shiftMap["SUP_C"] || 0);

  const { MIN_COMBO_SHIFT_DAYS } = INCENTIVE_CONFIG;
  const gradeConfig = INCENTIVE_CONFIG.GRADES[gradeKey];
  if (!gradeConfig) return null;

  const available = Object.keys(gradeConfig.shifts);
  const totalDays = shiftI + shiftII + shiftIII;

  // ── FITTER / ELECTRICAL / PLANT ──────────────────────────────────────────
  if (gradeKey === "FITTER" || gradeKey === "ELECTRICAL" || gradeKey === "PLANT") {
    return "SHIFT_I";
  }

  // ── MAISTRY ───────────────────────────────────────────────────────────────
  if (gradeKey === "MAISTRY") {
    if (shiftII > 0 || shiftIII > 0) {
      return "SHIFT_I_II_III_AND_II_III";
    }
    return null; // Maistries working only Day shift are not eligible based on rotation
  }

  // ── MIXING ────────────────────────────────────────────────────────────────
  if (gradeKey === "MIXING") {
    // "Must work in II & III Shift for 12 Days In a month"
    const iiOrIiiDays = shiftII + shiftIII;
    if (iiOrIiiDays >= 12 && totalDays >= INCENTIVE_CONFIG.MIN_DAYS) {
      return "SHIFT_I_II_AND_I_II_III";
    }
    return "SHIFT_I";
  }

  // ── HOSTEL ────────────────────────────────────────────────────────────────
  if (gradeKey === "HOSTEL") {
    // Combo applies to any combination of shifts (no 12-day minimum specified)
    const activeShiftsCount = (shiftI > 0 ? 1 : 0) + (shiftII > 0 ? 1 : 0) + (shiftIII > 0 ? 1 : 0);
    if (activeShiftsCount > 1) {
      return "SHIFT_I_II_AND_I_II_III";
    }
    return "SHIFT_I";
  }

  // ── STAFF_MONTHLY ─────────────────────────────────────────────────────────
  if (gradeKey === "STAFF_MONTHLY") {
    const iOk = shiftI >= MIN_COMBO_SHIFT_DAYS;
    const iiOk = shiftII >= MIN_COMBO_SHIFT_DAYS;
    const iiiOk = shiftIII > 0;

    if (
      available.includes("SHIFT_I_II_III") &&
      iOk &&
      iiOk &&
      iiiOk &&
      totalDays >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_I_II_III";

    if (
      available.includes("SHIFT_I_II_AND_I_III") &&
      iOk &&
      (iiOk || shiftIII >= MIN_COMBO_SHIFT_DAYS) &&
      totalDays >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_I_II_AND_I_III";

    return "SHIFT_I";
  }

  // ── OTHERS ────────────────────────────────────────────────────────────────
  if (gradeKey === "OTHERS") {
    const iOk = shiftI >= MIN_COMBO_SHIFT_DAYS;
    const iiOk = shiftII >= MIN_COMBO_SHIFT_DAYS;
    const iiiOk = shiftIII >= MIN_COMBO_SHIFT_DAYS;
    const hasI = shiftI > 0;
    const hasII = shiftII > 0;
    const hasIII = shiftIII > 0;

    // Highest combo: II>=12 AND III>0
    if (
      available.includes("SHIFT_I_II_III_AND_II_III") &&
      iiOk &&
      hasIII &&
      totalDays >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_I_II_III_AND_II_III";

    // Pure II only
    if (
      available.includes("SHIFT_II") &&
      hasII &&
      !hasI &&
      !hasIII &&
      shiftII >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_II";

    // Pure III only
    if (
      available.includes("SHIFT_III") &&
      hasIII &&
      !hasI &&
      !hasII &&
      shiftIII >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_III";

    // I+II or I+III combo
    if (
      available.includes("SHIFT_I_II_AND_I_III") &&
      iOk &&
      (iiOk || hasIII) &&
      !(iiOk && hasIII) &&
      totalDays >= INCENTIVE_CONFIG.MIN_DAYS
    )
      return "SHIFT_I_II_AND_I_III";

    return "SHIFT_I";
  }

  return "SHIFT_I";
};

const DEFAULT_CONDITIONS = [
  // MIXING
  { gradeKey: "MIXING", gradeName: "Mixing", shiftRuleKey: "SHIFT_I", shiftLabel: "Day Shift Only", minDays: 22, lowTierDays: 23, lowTierRate: 15, highTierDays: 24, highTierRate: 20, minComboDays: 12, remarks: "Day Shift Only" },
  { gradeKey: "MIXING", gradeName: "Mixing", shiftRuleKey: "SHIFT_I_II_AND_I_II_III", shiftLabel: "3 Shifts", minDays: 22, lowTierDays: 23, lowTierRate: 20, highTierDays: 24, highTierRate: 30, minComboDays: 12, remarks: "Must work in II & III Shift for 12 Days in a month" },
  // OTHERS
  { gradeKey: "OTHERS", gradeName: "Others", shiftRuleKey: "SHIFT_I", shiftLabel: "Day Shift Only", minDays: 22, lowTierDays: 23, lowTierRate: 25, highTierDays: 24, highTierRate: 30, minComboDays: 12, maleExpOverride: true, maleExpThreshold: 3, remarks: "Day Shift Only (Male >=3yr exp uses this)" },
  { gradeKey: "OTHERS", gradeName: "Others", shiftRuleKey: "SHIFT_I_II_AND_I_III", shiftLabel: "I+II / I+III / II Shift", minDays: 22, lowTierDays: 23, lowTierRate: 55, highTierDays: 24, highTierRate: 60, minComboDays: 12, remarks: "Two-shift combinations or II Shift" },
  { gradeKey: "OTHERS", gradeName: "Others", shiftRuleKey: "SHIFT_II", shiftLabel: "II Shift", minDays: 22, lowTierDays: 23, lowTierRate: 55, highTierDays: 24, highTierRate: 60, minComboDays: 12, remarks: "Second Shift" },
  { gradeKey: "OTHERS", gradeName: "Others", shiftRuleKey: "SHIFT_I_II_III_AND_II_III", shiftLabel: "I+II+III / II+III / III Shift", minDays: 22, lowTierDays: 23, lowTierRate: 70, highTierDays: 24, highTierRate: 80, minComboDays: 12, remarks: "Three shifts / II+III / III Shift" },
  { gradeKey: "OTHERS", gradeName: "Others", shiftRuleKey: "SHIFT_III", shiftLabel: "III Shift", minDays: 22, lowTierDays: 23, lowTierRate: 70, highTierDays: 24, highTierRate: 80, minComboDays: 12, remarks: "Night Shift" },
  // HOSTEL
  { gradeKey: "HOSTEL", gradeName: "Hostel", shiftRuleKey: "SHIFT_I", shiftLabel: "I Shift only", minDays: 22, lowTierDays: 23, lowTierRate: 15, highTierDays: 24, highTierRate: 20, minComboDays: 12, remarks: "Single shift" },
  { gradeKey: "HOSTEL", gradeName: "Hostel", shiftRuleKey: "SHIFT_I_II_AND_I_II_III", shiftLabel: "Combo Shifts", minDays: 22, lowTierDays: 23, lowTierRate: 20, highTierDays: 24, highTierRate: 30, minComboDays: 12, remarks: "Combination of shifts" },
  // MAISTRY
  { gradeKey: "MAISTRY", gradeName: "Maistry", shiftRuleKey: "SHIFT_I_II_III_AND_II_III", shiftLabel: "I, II, III & II, III & III Shift", minDays: 22, lowTierDays: 23, lowTierRate: 45, highTierDays: 24, highTierRate: 50, minComboDays: 12, remarks: "Maistry rotation shifts" },
  // FITTER
  { gradeKey: "FITTER", gradeName: "Fitter", shiftRuleKey: "SHIFT_I", shiftLabel: "All Shifts", minDays: 24, lowTierDays: 24, lowTierRate: 30, highTierDays: 25, highTierRate: 35, minComboDays: 12, remarks: "Fitter Grade" },
  // ELECTRICAL
  { gradeKey: "ELECTRICAL", gradeName: "Electrical", shiftRuleKey: "SHIFT_I", shiftLabel: "All Shifts", minDays: 24, lowTierDays: 24, lowTierRate: 30, highTierDays: 25, highTierRate: 35, minComboDays: 12, remarks: "Electrical Grade" },
  // PLANT
  { gradeKey: "PLANT", gradeName: "Plant", shiftRuleKey: "SHIFT_I", shiftLabel: "All Shifts", minDays: 24, lowTierDays: 24, lowTierRate: 30, highTierDays: 25, highTierRate: 35, minComboDays: 12, remarks: "Plant Grade" },
];

const getEffectiveIncentiveConfig = async (companyId = null) => {
  const config = JSON.parse(JSON.stringify(INCENTIVE_CONFIG));

  try {
    if (AttendanceIncentiveCondition) {
      await AttendanceIncentiveCondition.sync();
      const where = { status: "Active" };
      if (companyId) {
        where[Op.or] = [{ companyId }, { companyId: null }];
      }
      const conditions = await AttendanceIncentiveCondition.findAll({ where });

      if (conditions && conditions.length > 0) {
        for (const cond of conditions) {
          const {
            gradeKey,
            shiftRuleKey,
            shiftLabel,
            minDays,
            lowTierDays,
            lowTierRate,
            highTierDays,
            highTierRate,
            maleExpOverride,
          } = cond;

          if (!config.GRADES[gradeKey]) {
            config.GRADES[gradeKey] = {
              gradeName: cond.gradeName || gradeKey,
              shifts: {},
            };
          }

          if (minDays !== undefined && minDays !== null) {
            config.GRADES[gradeKey].minDays = minDays;
          }
          if (maleExpOverride !== undefined && maleExpOverride !== null) {
            config.GRADES[gradeKey].maleExpOverride = maleExpOverride;
          }

          config.GRADES[gradeKey].shifts[shiftRuleKey] = {
            label: shiftLabel || shiftRuleKey,
            low: {
              days: lowTierDays,
              ratePerDay: parseFloat(lowTierRate) || 0,
            },
            high: {
              days: highTierDays,
              ratePerDay: parseFloat(highTierRate) || 0,
            },
          };
        }
      }
    }
  } catch (err) {
    console.error("Error loading dynamic incentive conditions:", err.message);
  }

  return config;
};

const isShiftEligible = (shiftMap, shiftRuleKey) => {
  const shiftI =
    (shiftMap["I"] || 0) +
    (shiftMap["A"] || 0) +
    (shiftMap["Staff"] || 0) +
    (shiftMap["SUP_A"] || 0) +
    (shiftMap["GENERAL_A"] || 0) +
    (shiftMap["GENERAL_B"] || 0) +
    (shiftMap["GENERAL_C"] || 0) +
    (shiftMap["GENERAL_D"] || 0) +
    (shiftMap["SHIFT_I"] || 0); // also support direct SHIFT_I for tests

  const shiftII =
    (shiftMap["II"] || 0) +
    (shiftMap["B"] || 0) +
    (shiftMap["SUP_B"] || 0) +
    (shiftMap["SHIFT_II"] || 0);

  const shiftIII =
    (shiftMap["III"] || 0) +
    (shiftMap["C"] || 0) +
    (shiftMap["SUP_C"] || 0) +
    (shiftMap["SHIFT_III"] || 0);

  // If the rule is a JSON array string representing multiple custom combinations:
  if (shiftRuleKey && (shiftRuleKey.startsWith("[") || shiftRuleKey.startsWith("{"))) {
    try {
      const combos = JSON.parse(shiftRuleKey);
      if (Array.isArray(combos)) {
        for (const combo of combos) {
          let comboSatisfied = true;
          let hasAtLeastOneRequiredShift = false;

          if (combo.hasOwnProperty("I")) {
            hasAtLeastOneRequiredShift = true;
            if (shiftI < Number(combo.I)) {
              comboSatisfied = false;
            }
          }
          if (combo.hasOwnProperty("II")) {
            hasAtLeastOneRequiredShift = true;
            if (shiftII < Number(combo.II)) {
              comboSatisfied = false;
            }
          }
          if (combo.hasOwnProperty("III")) {
            hasAtLeastOneRequiredShift = true;
            if (shiftIII < Number(combo.III)) {
              comboSatisfied = false;
            }
          }

          if (hasAtLeastOneRequiredShift && comboSatisfied) {
            return true; // Any one combo satisfied is sufficient!
          }
        }
        return false;
      }
    } catch (err) {
      console.error("Error parsing multi-combo JSON shiftRuleKey:", err);
    }
  }

  if (shiftRuleKey === "SHIFT_I") {
    return shiftI > 0;
  }
  if (shiftRuleKey === "SHIFT_II") {
    return shiftII > 0;
  }
  if (shiftRuleKey === "SHIFT_III") {
    return shiftIII > 0;
  }

  // Check wants custom combos
  const wantsI = shiftRuleKey.includes("_I") || shiftRuleKey === "SHIFT_I" || shiftRuleKey.includes("SHIFT_I_");
  const wantsII = shiftRuleKey.includes("_II") || shiftRuleKey === "SHIFT_II";
  const wantsIII = shiftRuleKey.includes("_III") || shiftRuleKey === "SHIFT_III";

  if (wantsI && wantsII && wantsIII) {
    return shiftI > 0 || shiftII > 0 || shiftIII > 0;
  }
  if (wantsI && wantsII) {
    return shiftI > 0 || shiftII > 0;
  }
  if (wantsII && wantsIII) {
    return shiftII > 0 || shiftIII > 0;
  }
  if (wantsI && wantsIII) {
    return shiftI > 0 || shiftIII > 0;
  }

  if (shiftRuleKey === "ALL_SHIFTS" || shiftRuleKey === "ANY") {
    return (shiftI + shiftII + shiftIII) > 0;
  }

  return (shiftI + shiftII + shiftIII) > 0;
};

const findMatchingCondition = (employee, categoryName, dbConditions, resolvedShiftKey) => {
  const empCatId = employee.categoryId || null;
  const empDeptId = employee.departmentId || null;
  const designationName = employee.designation?.name || "";
  const stdGradeKey = resolveGradeKey(categoryName, designationName);

  // 1. Match specific category AND specific department AND resolvedShiftKey
  let match = dbConditions.find(
    (c) => c.categoryId === empCatId && c.departmentId === empDeptId && c.shiftRuleKey === resolvedShiftKey
  );
  if (match) return match;

  // 2. Match specific category (any department) AND resolvedShiftKey
  match = dbConditions.find(
    (c) => c.categoryId === empCatId && !c.departmentId && c.shiftRuleKey === resolvedShiftKey
  );
  if (match) return match;

  // 3. Match specific department (any category) AND resolvedShiftKey
  match = dbConditions.find(
    (c) => !c.categoryId && c.departmentId === empDeptId && c.shiftRuleKey === resolvedShiftKey
  );
  if (match) return match;

  // 4. Match gradeKey AND resolvedShiftKey
  match = dbConditions.find(
    (c) => !c.categoryId && !c.departmentId && c.gradeKey === stdGradeKey && c.shiftRuleKey === resolvedShiftKey
  );
  if (match) return match;

  return null;
};


const calculateIncentive = (
  employee,
  shiftMap,
  categoryName,
  adjustedDays = null,
  activeConfig = null,
  slabDays = 0,
  explicitRawDays = null,
  dbConditions = [],
) => {
  const config = activeConfig || INCENTIVE_CONFIG;
  const { MIN_DAYS, HIGH_TIER_DAYS, MALE_EXP_THRESHOLD } = config;
  const designationName = employee.designation?.name || "";

  const rawFromShifts = Object.values(shiftMap).reduce((s, d) => s + d, 0);
  const rawTotal = explicitRawDays !== null && explicitRawDays !== undefined ? explicitRawDays : rawFromShifts;

  // Determine total eligibility days and payable worked days:
  let totalDays;
  let payableDays;
  const effectiveSlab = Number(slabDays) || 0;

  if (adjustedDays !== null && adjustedDays !== undefined) {
    totalDays = Number(adjustedDays);
    payableDays = totalDays - effectiveSlab;
  } else {
    totalDays = rawTotal + effectiveSlab;
    payableDays = rawTotal;
  }

  const catUpper = (categoryName || "").toUpperCase().trim();
  if (catUpper === "HOSTEL 1" || catUpper === "HOSTEL 2" || catUpper.includes("HOSTEL")) {
    return {
      incentive: 0,
      rawDays: rawTotal,
      totalDays,
      payableDays,
      slabDays: Math.max(0, totalDays - payableDays),
      gradeKey: "HOSTEL",
      tier: null,
      ratePerDay: 0,
      note: "Hostel category – calculated under Hostel Attendance Incentive",
    };
  }

  const stdGradeKey = resolveGradeKey(categoryName, designationName);
  const resolvedShiftKey = resolveShiftKey(shiftMap, stdGradeKey);
  const cond = findMatchingCondition(employee, categoryName, dbConditions, resolvedShiftKey);

  let minDays;
  let highTierDays;
  let lowTierRate;
  let highTierRate;
  let maleExpOverride = false;
  let maleExpThreshold = 3;
  let gradeKey;
  let shiftRuleKey;
  let shiftLabel;

  if (cond) {
    gradeKey = cond.gradeKey;
    shiftRuleKey = cond.shiftRuleKey;
    shiftLabel = cond.shiftLabel;
    minDays = cond.minDays !== null && cond.minDays !== undefined ? cond.minDays : MIN_DAYS;
    highTierDays = cond.highTierDays !== null && cond.highTierDays !== undefined ? cond.highTierDays : HIGH_TIER_DAYS;
    lowTierRate = parseFloat(cond.lowTierRate) || 0;
    highTierRate = parseFloat(cond.highTierRate) || 0;
    maleExpOverride = !!cond.maleExpOverride;
    maleExpThreshold = cond.maleExpThreshold !== null && cond.maleExpThreshold !== undefined ? cond.maleExpThreshold : MALE_EXP_THRESHOLD;
  } else {
    gradeKey = resolveGradeKey(categoryName, designationName);
    if (!gradeKey) return { incentive: 0, note: "Category/Designation not configured" };
    const gradeConfig = config.GRADES[gradeKey];
    if (!gradeConfig) return { incentive: 0, note: "Grade config not found" };

    minDays = gradeConfig.minDays !== undefined ? gradeConfig.minDays : MIN_DAYS;
    highTierDays = gradeConfig.highTierDays !== undefined ? gradeConfig.highTierDays : HIGH_TIER_DAYS;
    maleExpOverride = !!gradeConfig.maleExpOverride;
    maleExpThreshold = gradeConfig.maleExpThreshold !== undefined ? gradeConfig.maleExpThreshold : MALE_EXP_THRESHOLD;

    const stdShiftKey = resolveShiftKey(shiftMap, gradeKey);
    if (!stdShiftKey) {
      return {
        incentive: 0,
        rawDays: rawTotal,
        totalDays,
        payableDays,
        slabDays: Math.max(0, totalDays - payableDays),
        gradeKey,
        note: `Not eligible for incentive based on worked shifts`,
      };
    }
    shiftRuleKey = stdShiftKey;
    const stdShiftConfig = gradeConfig.shifts[stdShiftKey];
    shiftLabel = stdShiftConfig ? stdShiftConfig.label : stdShiftKey;
    lowTierRate = stdShiftConfig ? stdShiftConfig.low.ratePerDay : 0;
    highTierRate = stdShiftConfig ? stdShiftConfig.high.ratePerDay : 0;
  }

  if (totalDays < minDays) {
    return {
      incentive: 0,
      rawDays: rawTotal,
      totalDays,
      payableDays,
      slabDays: Math.max(0, totalDays - payableDays),
      gradeKey,
      note: `Below minimum ${minDays} days – no incentive`,
    };
  }

  const isEligible = isShiftEligible(shiftMap, shiftRuleKey);
  if (!isEligible) {
    return {
      incentive: 0,
      rawDays: rawTotal,
      totalDays,
      payableDays,
      slabDays: Math.max(0, totalDays - payableDays),
      gradeKey,
      note: `Not eligible based on worked shifts for rule ${shiftRuleKey}`,
    };
  }
  let maleOverrideApplied = false;

  // Male experience override (OTHERS only)
  if (maleExpOverride) {
    const isMale = String(employee.gender || "").toUpperCase() === "MALE";
    const expYears = getExperienceYears(employee.dateOfJoining);
    if (isMale && expYears >= maleExpThreshold) {
      // For standard others we might adjust shiftKey, but keep generic rate logic
      maleOverrideApplied = true;
    }
  }

  // Tier is determined by total eligibility days (worked days + slab days)
  const tier = totalDays >= highTierDays ? "high" : "low";
  const ratePerDay = tier === "high" ? highTierRate : lowTierRate;

  // Incentive is calculated ONLY on actual worked days (excluding slab days)
  const incentive = Math.round(payableDays * ratePerDay * 100) / 100;

  return {
    incentive,
    totalDays,
    rawDays: rawTotal,
    payableDays,
    slabDays: Math.max(0, totalDays - payableDays),
    shiftKey: shiftRuleKey,
    shiftLabel: shiftLabel,
    tier,
    ratePerDay,
    maleOverrideApplied,
    gradeKey,
    note: maleOverrideApplied
      ? `Male worker ≥${maleExpThreshold}yr experience – normal incentive only`
      : null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL
// Now accepts optional employeeIds[] for specific-employee filtering.
// Category is resolved from the employee's own categoryId (no category filter in UI).
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendanceIncentives = async (req, res) => {
  try {
    const { companyId, categoryId, month, year, employeeIds } = req.query;

    if (!companyId || !month || !year) {
      return res
        .status(400)
        .json({ message: "companyId, month, year are required" });
    }

    // ── Build employee where clause ──────────────────────────────────────────
    const empWhere = { companyId, status: "Active" };
    if (categoryId) empWhere.categoryId = categoryId;

    // employeeIds is a comma-separated string or array from query string
    if (employeeIds) {
      const ids = Array.isArray(employeeIds)
        ? employeeIds.map(Number)
        : String(employeeIds).split(",").map(Number).filter(Boolean);
      if (ids.length) empWhere.id = { [Op.in]: ids };
    }

    // ── Fetch employees with their category ──────────────────────────────────
    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
      ],
    });

    if (!employees.length) {
      return res.status(200).json({ records: [] });
    }

    const employeeIdList = employees.map((e) => e.id);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [savedRecords, dailyRecords, activeDbConditions, allShiftTypes, weekOffRecords] = await Promise.all([
      AttendanceIncentive.findAll({
        where: {
          employeeId: { [Op.in]: employeeIdList },
          companyId,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
        },
      }),
      AttendanceIncentive.findAll({
        where: {
          employeeId: { [Op.in]: employeeIdList },
          companyId,
          entryDate: { [Op.between]: [startDate, endDate] },
          month: null,
          year: null,
        },
        attributes: ["employeeId", "days", "slabDays", "otDays", "shiftTypeId", "entryDate", "slot"],
      }),
      AttendanceIncentiveCondition.findAll({
        where: { companyId, status: "Active" },
      }),
      ShiftType.findAll({
        where: { companyId },
      }),
      Attendance.findAll({
        where: {
          employeeId: { [Op.in]: employeeIdList },
          companyId,
          attendanceDate: { [Op.between]: [startDate, endDate] },
        },
        attributes: ["employeeId", "attendanceDate", "status", "shiftId", "shiftName"],
      }),
    ]);

    const shiftTypeMap = {};
    for (const st of allShiftTypes) {
      shiftTypeMap[st.id] = st.name;
    }

    const employeesMap = {};
    for (const emp of employees) {
      employeesMap[emp.id] = emp;
    }

    const manualMapByEmp = {};
    for (const dr of dailyRecords) {
      const empId = dr.employeeId;
      if (!manualMapByEmp[empId]) manualMapByEmp[empId] = {};
      const dateStr = moment(dr.entryDate).format("YYYY-MM-DD");
      manualMapByEmp[empId][dateStr] = dr;
    }

    const attendanceMapByEmp = {};
    for (const att of weekOffRecords) {
      const empId = att.employeeId;
      if (!attendanceMapByEmp[empId]) attendanceMapByEmp[empId] = {};
      const dateStr = moment(att.attendanceDate).format("YYYY-MM-DD");
      attendanceMapByEmp[empId][dateStr] = att;
    }

    const savedByEmp = {};
    for (const sr of savedRecords) savedByEmp[sr.employeeId] = sr;

    const effectiveConfig = await getEffectiveIncentiveConfig(companyId);

    const records = employees.map((emp) => {
      const categoryName = emp.category?.categoryName || "";
      const saved = savedByEmp[emp.id];

      const empManualMap = manualMapByEmp[emp.id] || {};
      const empAttendanceMap = attendanceMapByEmp[emp.id] || {};

      let rawDays = 0;
      let weekOffDays = 0;
      let slabDays = 0;
      let otDays = 0;
      let slotDays = 0;
      const shiftMap = {};

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const manual = empManualMap[dateStr];
        const att = empAttendanceMap[dateStr];

        const isWeekOffDay = emp.weeklyOff &&
          emp.weeklyOff !== "-" &&
          emp.weeklyOff !== "NO WEEKLY" &&
          moment(dateStr).format("dddd").toLowerCase() === emp.weeklyOff.toLowerCase();

        if (manual) {
          const daysWorked = parseFloat(manual.days) || 0;
          rawDays += daysWorked;
          slabDays += parseFloat(manual.slabDays) || 0;
          otDays += parseFloat(manual.otDays) || 0;
          slotDays += parseFloat(manual.slot) || 0;

          if (daysWorked > 0) {
            const shiftName = shiftTypeMap[manual.shiftTypeId] || "I";
            shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
            if (isWeekOffDay) {
              weekOffDays += 1;
            }
          }
        } else if (att) {
          let daysWorked = 0;
          if (att.status === "Present" || att.status === "Present with Permission") {
            daysWorked = 1;
          } else if (att.status === "Half Day") {
            daysWorked = 0.5;
          }

          if (daysWorked > 0) {
            rawDays += daysWorked;
            const shiftName = att.shiftName || shiftTypeMap[att.shiftId] || "I";
            shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
            if (isWeekOffDay) {
              weekOffDays += 1;
            }
          }
        }
      }

      const calculatedDays = rawDays - weekOffDays + slabDays + otDays + slotDays;
      const adjustedDays = saved ? saved.adjustedDays : calculatedDays;

      const calc = calculateIncentive(
        emp,
        shiftMap,
        categoryName,
        adjustedDays,
        effectiveConfig,
        slabDays,
        rawDays,
        activeDbConditions,
      );

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.firstName,
        gender: emp.gender,
        dateOfJoining: emp.dateOfJoining,
        departmentId: emp.departmentId,
        departmentName: emp.department?.departmentname || "",
        categoryId: emp.categoryId,
        categoryName,
        shiftTypeId: emp.shiftTypeId || null,
        gradeKey: calc.gradeKey || resolveGradeKey(categoryName),
        shiftBreakdown: shiftMap,
        rawDays: calc.rawDays ?? rawDays,
        payableDays: calc.payableDays ?? rawDays,
        weekOffDays,
        otDays,
        slotDays,
        slabDays: saved ? (saved.slabDays !== null && saved.slabDays !== undefined ? saved.slabDays : slabDays) : slabDays,
        adjustedDays: saved ? saved.adjustedDays : (calc.totalDays ?? calculatedDays),
        shiftKey: saved ? saved.shiftKey : calc.shiftKey || null,
        shiftLabel: saved ? saved.shiftLabel : calc.shiftLabel || null,
        tier: saved ? saved.tier : calc.tier || null,
        ratePerDay: saved ? parseFloat(saved.ratePerDay) : calc.ratePerDay || 0,
        incentive: saved ? parseFloat(saved.incentive) : calc.incentive || 0,
        maleOverrideApplied: saved
          ? saved.maleOverrideApplied
          : calc.maleOverrideApplied || false,
        note: calc.note || null,
        isSaved: !!saved,
      };
    });

    return res.status(200).json({ records });
  } catch (error) {
    console.error("Error fetching attendance incentives:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECALCULATE ONE
// ─────────────────────────────────────────────────────────────────────────────
exports.recalculateIncentive = async (req, res) => {
  try {
    const { employeeId, companyId, month, year, adjustedDays, slabDays, rawDays } = req.body;

    if (!employeeId || !companyId || !month || !year) {
      return res
        .status(400)
        .json({ message: "employeeId, companyId, month, year required" });
    }

    const employee = await Employee.findByPk(employeeId, {
      include: [
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
      ],
    });
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const categoryName = employee.category?.categoryName || "";

    const shiftRecords = await EmployeeShift.findAll({
      where: {
        employeeId,
        companyId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
    });

    const shiftMap = {};
    for (const sr of shiftRecords) {
      shiftMap[sr.shiftName] =
        (sr.presentDays || 0) + (sr.presentWithPermissionDays || 0);
    }

    const effectiveConfig = await getEffectiveIncentiveConfig(companyId);

    const activeDbConditions = await AttendanceIncentiveCondition.findAll({
      where: { companyId, status: "Active" },
    });

    const calc = calculateIncentive(
      employee,
      shiftMap,
      categoryName,
      adjustedDays !== undefined ? parseInt(adjustedDays, 10) : null,
      effectiveConfig,
      slabDays !== undefined ? parseInt(slabDays, 10) : 0,
      rawDays !== undefined ? parseInt(rawDays, 10) : null,
      activeDbConditions,
    );

    return res.status(200).json({
      employeeId,
      categoryName,
      shiftBreakdown: shiftMap,
      rawDays: calc.rawDays ?? 0,
      payableDays: calc.payableDays ?? calc.rawDays,
      slabDays: calc.slabDays ?? 0,
      adjustedDays: calc.totalDays ?? 0,
      shiftKey: calc.shiftKey,
      shiftLabel: calc.shiftLabel,
      tier: calc.tier,
      ratePerDay: calc.ratePerDay,
      incentive: calc.incentive,
      maleOverrideApplied: calc.maleOverrideApplied,
      gradeKey: calc.gradeKey,
      note: calc.note,
    });
  } catch (error) {
    console.error("Error recalculating incentive:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVE ONE
// ─────────────────────────────────────────────────────────────────────────────
exports.saveOneIncentive = async (req, res) => {
  try {
    const { companyId, month, year, record: r } = req.body;
    if (!companyId || !month || !year || !r?.employeeId) {
      return res
        .status(400)
        .json({ message: "companyId, month, year, record required" });
    }

    let shiftTypeId = r.shiftTypeId;
    let departmentId = r.departmentId;

    if (!shiftTypeId || !departmentId) {
      const emp = await Employee.findByPk(r.employeeId, {
        attributes: ["shiftTypeId", "departmentId"],
      });
      if (!shiftTypeId) shiftTypeId = emp?.shiftTypeId || null;
      if (!departmentId) departmentId = emp?.departmentId || null;
    }

    if (!shiftTypeId) {
      return res
        .status(400)
        .json({ message: "Cannot save: employee has no shiftTypeId assigned" });
    }
    if (!departmentId) {
      return res
        .status(400)
        .json({
          message: "Cannot save: employee has no departmentId assigned",
        });
    }

    await AttendanceIncentive.upsert({
      companyId,
      employeeId: r.employeeId,
      departmentId,
      categoryId: r.categoryId || null,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      adjustedDays: r.adjustedDays,
      slabDays: r.slabDays || 0,
      incentive: r.incentive,
      ratePerDay: r.ratePerDay,
      shiftKey: r.shiftKey,
      shiftLabel: r.shiftLabel || null,
      tier: r.tier || null,
      maleOverrideApplied: r.maleOverrideApplied || false,
      savedAt: new Date(),
      shiftTypeId,
      days: r.payableDays || r.rawDays || r.adjustedDays || 0,
      entryDate: new Date(),
      slot: 0,
    });

    return res.status(200).json({ message: "Saved successfully" });
  } catch (error) {
    console.error("Error saving single incentive:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK SAVE
// ─────────────────────────────────────────────────────────────────────────────
exports.bulkSaveIncentives = async (req, res) => {
  try {
    const { records, month, year, companyId } = req.body;
    if (!records?.length || !month || !year || !companyId) {
      return res
        .status(400)
        .json({ message: "records, month, year, companyId required" });
    }

    const missingIds = records
      .filter((r) => !r.shiftTypeId || !r.departmentId)
      .map((r) => r.employeeId);

    const empLookup = {};
    if (missingIds.length) {
      const emps = await Employee.findAll({
        where: { id: { [Op.in]: missingIds } },
        attributes: ["id", "shiftTypeId", "departmentId"],
      });
      for (const e of emps) empLookup[e.id] = e;
    }

    const ops = records.map((r) => {
      const empData = empLookup[r.employeeId] || {};
      const shiftTypeId = r.shiftTypeId || empData.shiftTypeId || null;
      const departmentId = r.departmentId || empData.departmentId || null;

      if (!shiftTypeId) {
        console.warn(
          `Skipping employeeId ${r.employeeId}: no shiftTypeId found`,
        );
        return Promise.resolve();
      }

      return AttendanceIncentive.upsert({
        companyId,
        employeeId: r.employeeId,
        departmentId,
        categoryId: r.categoryId || null,
        month,
        year,
        adjustedDays: r.adjustedDays,
        slabDays: r.slabDays || 0,
        incentive: r.incentive,
        ratePerDay: r.ratePerDay,
        shiftKey: r.shiftKey,
        shiftLabel: r.shiftLabel || null,
        tier: r.tier || null,
        maleOverrideApplied: r.maleOverrideApplied || false,
        savedAt: new Date(),
        shiftTypeId,
        days: r.payableDays || r.rawDays || r.adjustedDays || 0,
        entryDate: new Date(),
        slot: 0,
      });
    });

    await Promise.all(ops);
    return res
      .status(200)
      .json({
        message: "Incentives saved successfully",
        count: records.length,
      });
  } catch (error) {
    console.error("Error saving incentives:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / UPDATE / DELETE (legacy endpoints kept unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.createAttendanceIncentive = async (req, res) => {
  try {
    const {
      companyId,
      departmentId,
      employeeId,
      days,
      shiftTypeId,
      entryDate,
      slabDays,
      otDays,
      slot,
    } = req.body;
    if (
      !companyId ||
      !departmentId ||
      !employeeId ||
      !shiftTypeId ||
      !entryDate ||
      slot === undefined
    ) {
      return res
        .status(400)
        .json({
          message:
            "companyId, departmentId, employeeId, shiftTypeId, entryDate, slot are required",
        });
    }
    const record = await AttendanceIncentive.create({
      companyId,
      departmentId,
      employeeId,
      days: days || 0,
      shiftTypeId,
      entryDate,
      slabDays: slabDays || 0,
      otDays: otDays || 0,
      slot,
    });
    return res
      .status(201)
      .json({ message: "Attendance incentive created successfully", record });
  } catch (error) {
    console.error("Error creating attendance incentive:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.updateAttendanceIncentive = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await AttendanceIncentive.findByPk(id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    await record.update(req.body);
    return res
      .status(200)
      .json({ message: "Attendance incentive updated successfully", record });
  } catch (error) {
    console.error("Error updating attendance incentive:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.deleteAttendanceIncentive = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await AttendanceIncentive.findByPk(id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    await record.destroy();
    return res
      .status(200)
      .json({ message: "Attendance incentive deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

exports.getDailyEntries = async (req, res) => {
  try {
    const { companyId, categoryId, entryDate, shiftTypeId } = req.query;
    if (!companyId || !categoryId || !entryDate) {
      return res.status(400).json({
        success: false,
        message: "companyId, categoryId, and entryDate are required",
      });
    }

    // 1. Fetch active employees in this category
    const employees = await Employee.findAll({
      where: {
        companyId,
        categoryId,
        status: "Active",
      },
      attributes: ["id", "employeeCode", "firstName", "departmentId"],
      order: [["employeeCode", "ASC"]],
    });

    // 2. Fetch existing daily entries on this date
    const employeeIdList = employees.map((e) => e.id);
    if (!employeeIdList.length) {
      return res.status(200).json({ success: true, records: [] });
    }

    const savedRecords = await AttendanceIncentive.findAll({
      where: {
        companyId,
        employeeId: { [Op.in]: employeeIdList },
        entryDate,
        month: null, // distinguish from monthly records
        year: null,
      },
      attributes: ["id", "employeeId", "days", "slabDays", "otDays", "slot", "shiftTypeId"],
    });

    const savedByEmp = {};
    for (const record of savedRecords) {
      savedByEmp[record.employeeId] = record;
    }

    // 3. Map employees to rows
    const records = employees.map((emp) => {
      const saved = savedByEmp[emp.id];
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.firstName, // Only show first name
        departmentId: emp.departmentId,
        days: saved ? saved.days : 0, // default to 0
        slabDays: saved ? saved.slabDays : 0,
        otDays: saved ? saved.otDays : 0,
        slot: saved ? saved.slot : 0, // maps to 8to8
        shiftTypeId: saved ? saved.shiftTypeId : (shiftTypeId ? parseInt(shiftTypeId, 10) : null),
        incentiveId: saved ? saved.id : null,
        selected: !!saved,
      };
    });

    return res.status(200).json({ success: true, records });
  } catch (error) {
    console.error("Error fetching daily entries:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.saveDailyEntries = async (req, res) => {
  try {
    const { companyId, categoryId, entryDate, shiftTypeId, records } = req.body;
    if (!companyId || !categoryId || !entryDate || !records) {
      return res.status(400).json({
        success: false,
        message: "companyId, categoryId, entryDate, and records are required",
      });
    }

    const ops = records.map(async (r) => {
      const selected = !!r.selected;

      if (selected) {
        // Upsert record: find by employeeId and entryDate where month/year are null
        const [record, created] = await AttendanceIncentive.findOrCreate({
          where: {
            companyId,
            employeeId: r.employeeId,
            entryDate,
            month: null,
            year: null,
          },
          defaults: {
            departmentId: r.departmentId || null,
            shiftTypeId: r.shiftTypeId || shiftTypeId || null,
            days: r.days || 0,
            slabDays: r.slabDays || 0,
            otDays: r.otDays || 0,
            slot: r.slot || 0,
          }
        });

        if (!created) {
          await record.update({
            departmentId: r.departmentId || null,
            shiftTypeId: r.shiftTypeId || shiftTypeId || null,
            days: r.days || 0,
            slabDays: r.slabDays || 0,
            otDays: r.otDays || 0,
            slot: r.slot || 0,
          });
        }
      } else {
        // If not selected, delete any existing record
        await AttendanceIncentive.destroy({
          where: {
            companyId,
            employeeId: r.employeeId,
            entryDate,
            month: null,
            year: null,
          }
        });
      }
    });

    await Promise.all(ops);
    return res.status(200).json({ success: true, message: "Daily entries saved successfully" });
  } catch (error) {
    console.error("Error saving daily entries:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONS & RULES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

exports.getConditions = async (req, res) => {
  try {
    const { companyId } = req.query;
    await AttendanceIncentiveCondition.sync();

    const where = { status: "Active" };
    if (companyId) {
      where[Op.or] = [{ companyId }, { companyId: null }];
    }

    let conditions = await AttendanceIncentiveCondition.findAll({
      where,
      include: [
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Category, as: "category", attributes: ["id", "categoryName"] }
      ],
      order: [["gradeKey", "ASC"], ["id", "ASC"]],
    });

    // Auto-seed if empty
    if (!conditions || conditions.length === 0) {
      const toCreate = DEFAULT_CONDITIONS.map((c) => ({
        ...c,
        companyId: companyId ? parseInt(companyId, 10) : null,
      }));
      conditions = await AttendanceIncentiveCondition.bulkCreate(toCreate);
    }

    return res.status(200).json({
      success: true,
      conditions,
      globalDefaults: {
        minDays: INCENTIVE_CONFIG.MIN_DAYS,
        lowTierDays: INCENTIVE_CONFIG.LOW_TIER_DAYS,
        highTierDays: INCENTIVE_CONFIG.HIGH_TIER_DAYS,
        minComboShiftDays: INCENTIVE_CONFIG.MIN_COMBO_SHIFT_DAYS,
        maleExpThreshold: INCENTIVE_CONFIG.MALE_EXP_THRESHOLD,
      },
    });
  } catch (error) {
    console.error("Error fetching incentive conditions:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.createCondition = async (req, res) => {
  try {
    const {
      companyId,
      categoryId,
      departmentId,
      shiftTypeId,
      gender,
      gradeKey,
      gradeName,
      shiftRuleKey,
      shiftLabel,
      minDays,
      lowTierDays,
      lowTierRate,
      highTierDays,
      highTierRate,
      minComboDays,
      maleExpOverride,
      maleExpThreshold,
      remarks,
    } = req.body;

    const gKey = (gradeKey || gradeName || "CUSTOM").toUpperCase().trim().replace(/[^A-Z0-9_]/g, "_");
    const sKey = (shiftRuleKey || shiftLabel || "SHIFT_I").trim().replace(/[^A-Za-z0-9_]/g, "_");

    const newCond = await AttendanceIncentiveCondition.create({
      companyId: companyId ? parseInt(companyId, 10) : null,
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      departmentId: departmentId ? parseInt(departmentId, 10) : null,
      shiftTypeId: shiftTypeId ? parseInt(shiftTypeId, 10) : null,
      gender: gender || "ALL",
      gradeKey: gKey,
      gradeName: gradeName || gradeKey || "Custom Grade",
      shiftRuleKey: sKey,
      shiftLabel: shiftLabel || shiftRuleKey || "All Shifts",
      minDays: minDays !== undefined && minDays !== "" ? parseInt(minDays, 10) : 22,
      lowTierDays: lowTierDays !== undefined && lowTierDays !== "" ? parseInt(lowTierDays, 10) : 23,
      lowTierRate: parseFloat(lowTierRate) || 0,
      highTierDays: highTierDays !== undefined && highTierDays !== "" ? parseInt(highTierDays, 10) : 24,
      highTierRate: parseFloat(highTierRate) || 0,
      minComboDays: minComboDays !== undefined && minComboDays !== "" ? parseInt(minComboDays, 10) : 12,
      maleExpOverride: !!maleExpOverride,
      maleExpThreshold: maleExpThreshold !== undefined && maleExpThreshold !== "" ? parseInt(maleExpThreshold, 10) : 3,
      remarks: remarks || null,
      status: "Active",
    });

    return res.status(201).json({ success: true, condition: newCond, message: "Condition added successfully." });
  } catch (error) {
    console.error("Error creating incentive condition:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.updateCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const cond = await AttendanceIncentiveCondition.findByPk(id);
    if (!cond) {
      return res.status(404).json({ success: false, message: "Condition not found." });
    }

    const {
      companyId,
      categoryId,
      departmentId,
      shiftTypeId,
      gender,
      gradeKey,
      gradeName,
      shiftRuleKey,
      shiftLabel,
      minDays,
      lowTierDays,
      lowTierRate,
      highTierDays,
      highTierRate,
      minComboDays,
      maleExpOverride,
      maleExpThreshold,
      remarks,
      status,
    } = req.body;

    const gKey = gradeKey ? gradeKey.toUpperCase().trim().replace(/[^A-Z0-9_]/g, "_") : (gradeName ? gradeName.toUpperCase().trim().replace(/[^A-Z0-9_]/g, "_") : undefined);
    const sKey = shiftRuleKey ? shiftRuleKey.trim().replace(/[^A-Za-z0-9_]/g, "_") : undefined;

    await cond.update({
      ...(companyId !== undefined && { companyId: companyId ? parseInt(companyId, 10) : null }),
      ...(categoryId !== undefined && { categoryId: categoryId ? parseInt(categoryId, 10) : null }),
      ...(departmentId !== undefined && { departmentId: departmentId ? parseInt(departmentId, 10) : null }),
      ...(shiftTypeId !== undefined && { shiftTypeId: shiftTypeId ? parseInt(shiftTypeId, 10) : null }),
      ...(gender !== undefined && { gender }),
      ...(gKey && { gradeKey: gKey }),
      ...(gradeName && { gradeName }),
      ...(sKey && { shiftRuleKey: sKey }),
      ...(shiftLabel && { shiftLabel }),
      ...(minDays !== undefined && { minDays: parseInt(minDays, 10) }),
      ...(lowTierDays !== undefined && { lowTierDays: parseInt(lowTierDays, 10) }),
      ...(lowTierRate !== undefined && { lowTierRate: parseFloat(lowTierRate) }),
      ...(highTierDays !== undefined && { highTierDays: parseInt(highTierDays, 10) }),
      ...(highTierRate !== undefined && { highTierRate: parseFloat(highTierRate) }),
      ...(minComboDays !== undefined && { minComboDays: parseInt(minComboDays, 10) }),
      ...(maleExpOverride !== undefined && { maleExpOverride: !!maleExpOverride }),
      ...(maleExpThreshold !== undefined && { maleExpThreshold: parseInt(maleExpThreshold, 10) }),
      ...(remarks !== undefined && { remarks }),
      ...(status !== undefined && { status }),
    });

    return res.status(200).json({ success: true, condition: cond, message: "Condition updated successfully." });
  } catch (error) {
    console.error("Error updating incentive condition:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.deleteCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const cond = await AttendanceIncentiveCondition.findByPk(id);
    if (!cond) {
      return res.status(404).json({ success: false, message: "Condition not found." });
    }

    await cond.destroy();
    return res.status(200).json({ success: true, message: "Condition deleted successfully." });
  } catch (error) {
    console.error("Error deleting incentive condition:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.resetConditions = async (req, res) => {
  try {
    const { companyId } = req.body;
    const where = {};
    if (companyId) {
      where[Op.or] = [{ companyId }, { companyId: null }];
    }

    await AttendanceIncentiveCondition.destroy({ where });

    const toCreate = DEFAULT_CONDITIONS.map((c) => ({
      ...c,
      companyId: companyId ? parseInt(companyId, 10) : null,
    }));
    const conditions = await AttendanceIncentiveCondition.bulkCreate(toCreate);

    return res.status(200).json({
      success: true,
      conditions,
      message: "Incentive conditions successfully reset to system defaults.",
    });
  } catch (error) {
    console.error("Error resetting incentive conditions:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PACKAGING INCENTIVE (MANUAL ENTRY)
// Rule: ₹1/bag for packing workers who achieved workload 45 bags/day and above
// ─────────────────────────────────────────────────────────────────────────────

exports.getPackagingEntries = async (req, res) => {
  try {
    const { companyId, entryDate, departmentId, shiftTypeId } = req.query;
    if (!companyId || !entryDate) {
      return res.status(400).json({
        success: false,
        message: "companyId and entryDate are required",
      });
    }

    // 1. Build employee where condition for packing workers
    const empWhere = {
      companyId,
      status: "Active",
    };

    if (departmentId) {
      empWhere.departmentId = departmentId;
    }

    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
      ],
      order: [["employeeCode", "ASC"]],
    });

    // Filter to only Packing workers if no specific departmentId was selected
    const packingEmployees = departmentId
      ? employees
      : employees.filter((emp) => {
        const dept = (emp.department?.departmentname || "").toUpperCase();
        const desig = (emp.designation?.name || "").toUpperCase();
        return dept.includes("PACK") || desig.includes("PACK");
      });

    const employeeIdList = packingEmployees.map((e) => e.id);
    if (!employeeIdList.length) {
      return res.status(200).json({ success: true, records: [] });
    }

    // 2. Fetch existing daily packaging entries on this date
    const pkgWhere = {
      companyId,
      employeeId: { [Op.in]: employeeIdList },
      entryDate,
    };
    if (shiftTypeId) {
      pkgWhere.shiftTypeId = shiftTypeId;
    }

    const savedRecords = await PackagingIncentive.findAll({
      where: pkgWhere,
      attributes: [
        "id",
        "employeeId",
        "departmentId",
        "shiftTypeId",
        "bagsPacked",
        "ratePerBag",
        "minBagsThreshold",
        "incentiveAmount",
        "remarks",
      ],
    });

    const savedByEmp = {};
    for (const record of savedRecords) {
      savedByEmp[record.employeeId] = record;
    }

    // 3. Map employees to rows with auto calculation
    const records = packingEmployees.map((emp) => {
      const saved = savedByEmp[emp.id];
      const bagsPacked = saved ? saved.bagsPacked : 0;
      const ratePerBag = saved ? parseFloat(saved.ratePerBag) : 1.0;
      const minBagsThreshold = saved ? saved.minBagsThreshold : 45;
      const incentiveAmount =
        saved !== undefined
          ? parseFloat(saved.incentiveAmount)
          : (bagsPacked >= minBagsThreshold ? bagsPacked * ratePerBag : 0);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.firstName,
        departmentId: emp.departmentId,
        departmentName: emp.department?.departmentname || "",
        designationName: emp.designation?.name || "",
        shiftTypeId: saved ? saved.shiftTypeId : (shiftTypeId ? parseInt(shiftTypeId, 10) : null),
        bagsPacked,
        ratePerBag,
        minBagsThreshold,
        incentiveAmount,
        remarks: saved ? saved.remarks || "" : "",
        packagingId: saved ? saved.id : null,
        selected: !!saved,
      };
    });

    return res.status(200).json({ success: true, records });
  } catch (error) {
    console.error("Error fetching packaging entries:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.savePackagingEntries = async (req, res) => {
  try {
    const { companyId, entryDate, shiftTypeId, records } = req.body;
    if (!companyId || !entryDate || !records) {
      return res.status(400).json({
        success: false,
        message: "companyId, entryDate, and records are required",
      });
    }

    const dateObj = new Date(entryDate);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const ops = records.map(async (r) => {
      const selected = !!r.selected;
      const bags = parseInt(r.bagsPacked, 10) || 0;
      const rate = parseFloat(r.ratePerBag) || 1.0;
      const threshold = parseInt(r.minBagsThreshold, 10) || 45;
      const amount = bags >= threshold ? bags * rate : 0;
      const rowShiftTypeId = r.shiftTypeId || (shiftTypeId ? parseInt(shiftTypeId, 10) : null);

      if (selected) {
        const [record, created] = await PackagingIncentive.findOrCreate({
          where: {
            companyId,
            employeeId: r.employeeId,
            entryDate,
            shiftTypeId: rowShiftTypeId,
          },
          defaults: {
            departmentId: r.departmentId || null,
            bagsPacked: bags,
            ratePerBag: rate,
            minBagsThreshold: threshold,
            incentiveAmount: amount,
            month,
            year,
            remarks: r.remarks || null,
          },
        });

        if (!created) {
          await record.update({
            departmentId: r.departmentId || null,
            bagsPacked: bags,
            ratePerBag: rate,
            minBagsThreshold: threshold,
            incentiveAmount: amount,
            month,
            year,
            remarks: r.remarks || null,
          });
        }
      } else {
        await PackagingIncentive.destroy({
          where: {
            companyId,
            employeeId: r.employeeId,
            entryDate,
            shiftTypeId: rowShiftTypeId,
          },
        });
      }
    });

    await Promise.all(ops);
    return res.status(200).json({
      success: true,
      message: "Packaging incentives saved successfully",
    });
  } catch (error) {
    console.error("Error saving packaging entries:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.getPackagingSummary = async (req, res) => {
  try {
    const { companyId, month, year } = req.query;
    if (!companyId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "companyId, month, and year are required",
      });
    }

    const records = await PackagingIncentive.findAll({
      where: {
        companyId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName"],
          include: [{ model: Department, as: "department", attributes: ["id", "departmentname"] }],
        },
      ],
    });

    // Aggregate by employee
    const summaryMap = {};
    for (const r of records) {
      const empId = r.employeeId;
      if (!summaryMap[empId]) {
        summaryMap[empId] = {
          employeeId: empId,
          employeeCode: r.employee?.employeeCode,
          employeeName: r.employee?.firstName,
          departmentName: r.employee?.department?.departmentname || "",
          totalDaysWorked: 0,
          totalBagsPacked: 0,
          totalIncentiveAmount: 0,
        };
      }
      summaryMap[empId].totalDaysWorked += 1;
      summaryMap[empId].totalBagsPacked += r.bagsPacked || 0;
      summaryMap[empId].totalIncentiveAmount += parseFloat(r.incentiveAmount) || 0;
    }

    return res.status(200).json({
      success: true,
      summary: Object.values(summaryMap),
    });
  } catch (error) {
    console.error("Error fetching packaging summary:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.calculateIncentive = calculateIncentive;
