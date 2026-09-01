const express = require("express");
const router = express.Router();

const {
  createAdditionalSalary,
  getAdditionalSalaries,
  deleteAdditionalSalary,
  updateAdditionalSalary
} = require("../controllers/additionalSalaryController");

router.post("/", createAdditionalSalary);
router.get("/", getAdditionalSalaries);
router.delete("/:id", deleteAdditionalSalary);
router.put("/:id", updateAdditionalSalary);      // ✅ Edit


module.exports = router;
