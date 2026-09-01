/**
 * Attendance Incentive Configuration
 * Kayaar Exports Private Limited
 *
 * ─── ACTUAL EMPLOYEE CATEGORIES (from Employee Details sheet) ────────────────
 *
 *   MIXING        → MIXING grade
 *   OTHERS 1      → OTHERS grade  (male >=3yr exp → I shift rate only)
 *   OTHERS 2      → OTHERS grade  (same rules as OTHERS 1)
 *   HOSTEL 1      → HOSTEL grade
 *   HOSTEL 2      → HOSTEL grade
 *   STAFF 1       → STAFF_MONTHLY grade
 *   STAFF 2       → STAFF_MONTHLY grade
 *
 * ─── Grade Summary ────────────────────────────────────────────────────────────
 *
 * MIXING
 *   I Shift:              23d×₹7  | 24d×₹10
 *   I+II / I+II+III:      23d×₹13 | 24d×₹18   (needs I>=12 AND II>=12)
 *
 * OTHERS (covers OTHERS 1 and OTHERS 2)
 *   I Shift:              23d×₹10 | 24d×₹15
 *   I+II / I+III:         23d×₹25 | 24d×₹30
 *   I+II+III / II+III:    23d×₹45 | 24d×₹55
 *   II Shift:             23d×₹20 | 24d×₹25
 *   III Shift:            23d×₹30 | 24d×₹35
 *   Male >=3yr → I Shift rate only
 *
 * HOSTEL (covers HOSTEL 1 and HOSTEL 2)
 *   I Shift:              23d×₹7  | 24d×₹10
 *   I+II / I+II+III:      23d×₹10 | 24d×₹15   (needs I>=12 AND II>=12)
 *
 * STAFF - MONTHLY (covers STAFF 1 and STAFF 2)
 *   I Shift:              23d×₹10 | 24d×₹15
 *   I+II / I+III:         23d×₹15 | 24d×₹20
 *   I+II+III:             23d×₹20 | 24d×₹25
 *
 * ─── Combo Rule (12-day minimum) ─────────────────────────────────────────────
 *   For any combo shift to apply:
 *     - Shift I  must have >= 12 days
 *     - Shift II must have >= 12 days (Shift III is top-up, no minimum)
 *     - Total must reach MIN_DAYS (23 or 24)
 */

const INCENTIVE_CONFIG = {
  MIN_DAYS: 22, // Below this → no incentive at all
  LOW_TIER_DAYS: 23, // 23 days → low tier rate
  HIGH_TIER_DAYS: 24, // 24+ days → high tier rate
  MIN_COMBO_SHIFT_DAYS: 12, // Both Shift I AND Shift II must have >= 12 days for combo

  // Male experience override — applies to OTHERS grade only
  MALE_EXP_THRESHOLD: 3, // Years; male workers >= 3yr → I shift rate only

  GRADES: {
    // ── MIXING ──────────────────────────────────────────────────────────────
    // Employee category: "MIXING"
    MIXING: {
      gradeName: "Mixing",
      shifts: {
        SHIFT_I: {
          label: "Day Shift Only",
          low: { days: 23, ratePerDay: 15 },
          high: { days: 24, ratePerDay: 20 },
        },
        SHIFT_I_II_AND_I_II_III: {
          label: "3 Shifts",
          low: { days: 23, ratePerDay: 20 },
          high: { days: 24, ratePerDay: 30 },
        },
      },
    },

    // ── OTHERS ──────────────────────────────────────────────────────────────
    // Employee categories: "OTHERS 1", "OTHERS 2"
    // Male >=3yr experience → SHIFT_I rate only (no combo benefit)
    OTHERS: {
      gradeName: "Others",
      maleExpOverride: true,
      maleExpShift: "SHIFT_I",
      shifts: {
        SHIFT_I: {
          label: "Day Shift Only",
          low: { days: 23, ratePerDay: 25 },
          high: { days: 24, ratePerDay: 30 },
        },
        SHIFT_I_II_AND_I_III: {
          label: "I+II / I+III / II Shift",
          low: { days: 23, ratePerDay: 55 },
          high: { days: 24, ratePerDay: 60 },
        },
        SHIFT_II: {
          label: "II Shift",
          low: { days: 23, ratePerDay: 55 },
          high: { days: 24, ratePerDay: 60 },
        },
        SHIFT_I_II_III_AND_II_III: {
          label: "I+II+III / II+III / III Shift",
          low: { days: 23, ratePerDay: 70 },
          high: { days: 24, ratePerDay: 80 },
        },
        SHIFT_III: {
          label: "III Shift",
          low: { days: 23, ratePerDay: 70 },
          high: { days: 24, ratePerDay: 80 },
        },
      },
    },

    // ── HOSTEL ──────────────────────────────────────────────────────────────
    // Employee categories: "HOSTEL 1", "HOSTEL 2"
    HOSTEL: {
      gradeName: "Hostel",
      shifts: {
        SHIFT_I: {
          label: "I Shift only",
          low: { days: 23, ratePerDay: 15 },
          high: { days: 24, ratePerDay: 20 },
        },
        SHIFT_I_II_AND_I_II_III: {
          label: "Combo Shifts",
          low: { days: 23, ratePerDay: 20 },
          high: { days: 24, ratePerDay: 30 },
        },
      },
    },

    /*
    STAFF_MONTHLY: {
      gradeName: "Staff - Monthly",
      shifts: {
        SHIFT_I: {
          label: "I Shift",
          low: { days: 23, ratePerDay: 10 },
          high: { days: 24, ratePerDay: 15 },
        },
        SHIFT_I_II_AND_I_III: {
          label: "I+II / I+III Shift",
          low: { days: 23, ratePerDay: 15 },
          high: { days: 24, ratePerDay: 20 },
        },
        SHIFT_I_II_III: {
          label: "I+II+III Shift",
          low: { days: 23, ratePerDay: 20 },
          high: { days: 24, ratePerDay: 25 },
        },
      },
    },
    */

    // ── MAISTRY ─────────────────────────────────────────────────────────────
    MAISTRY: {
      gradeName: "Maistry",
      shifts: {
        SHIFT_I_II_III_AND_II_III: {
          label: "I, II, III & II, III & III Shift",
          low: { days: 23, ratePerDay: 45 },
          high: { days: 24, ratePerDay: 50 },
        }
      }
    },

    // ── FITTER ──────────────────────────────────────────────────────────────
    FITTER: {
      gradeName: "Fitter",
      minDays: 24,
      lowTierDays: 24,
      highTierDays: 25,
      shifts: {
        SHIFT_I: {
          label: "All Shifts",
          low: { days: 24, ratePerDay: 30 },
          high: { days: 25, ratePerDay: 35 },
        }
      }
    },

    // ── ELECTRICAL ──────────────────────────────────────────────────────────
    ELECTRICAL: {
      gradeName: "Electrical",
      minDays: 24,
      lowTierDays: 24,
      highTierDays: 25,
      shifts: {
        SHIFT_I: {
          label: "All Shifts",
          low: { days: 24, ratePerDay: 30 },
          high: { days: 25, ratePerDay: 35 },
        }
      }
    },

    // ── PLANT ───────────────────────────────────────────────────────────────
    PLANT: {
      gradeName: "Plant",
      minDays: 24,
      lowTierDays: 24,
      highTierDays: 25,
      shifts: {
        SHIFT_I: {
          label: "All Shifts",
          low: { days: 24, ratePerDay: 30 },
          high: { days: 25, ratePerDay: 35 },
        }
      }
    }
  },
};

module.exports = INCENTIVE_CONFIG;
