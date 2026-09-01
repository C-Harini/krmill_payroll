"use strict";
/**
 * PAYROLL CONFIGURATION  v2
 * Single source of truth — shared by backend controller and frontend UI
 */

const PF_RATE = 0.12;
const ESI_RATE = 0.0075;
const ESI_GROSS_LIMIT = 21000;
const PF_BASIC_CEILING = 15000;
const MONTHLY_PERMISSION_HRS = 6;

/**
 * Management grades — ONLY these get the 60/10/10/10/10 split
 * and their PF is calculated on FULL basic (no 15k ceiling),
 * EXCEPT "ELE (M)" which is capped at ₹1800.
 */
const STAFF_MANAGEMENT_GRADES = [
  "GM",
  "GM(T)",
  "SR.M",
  "SR.M (M)",
  "Sr.M (M)",
  "M (TRG)",
  "PM",
  "OM",
  "AM(Q)",
  "AM (Q)",
  "AM(Pers)",
  "AM (Pers)",
  "AM (Prod)",
  "AM(Prod)",
  "ELE (M)",
  "ELE(M)",
  "E E",
  "EE",
];

const isManagementGrade = (gradeName = "") => {
  if (!gradeName) return false;
  const n = gradeName.toUpperCase().trim();
  return STAFF_MANAGEMENT_GRADES.some(
    (kw) => n === kw.toUpperCase() || n.includes(kw.toUpperCase()),
  );
};

module.exports = {
  PF_RATE,
  ESI_RATE,
  ESI_GROSS_LIMIT,
  PF_BASIC_CEILING,
  MONTHLY_PERMISSION_HRS,
  STAFF_MANAGEMENT_GRADES,
  isManagementGrade,
};
