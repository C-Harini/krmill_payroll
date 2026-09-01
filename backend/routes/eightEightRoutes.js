const express = require("express");
const router = express.Router();

const {
  getEightEightMultipleEntry,
  saveEightEightMultipleEntry,
  deleteEightEight,
  saveEightEightBulkCounts,
  getEightEightBulkHistory,
  deleteEightEightBulkCounts,
} = require("../controllers/eightEightController");

// ✅ Multiple Entry Endpoints
router.get("/multiple-entry", getEightEightMultipleEntry);
router.post("/multiple-entry", saveEightEightMultipleEntry);
router.post("/bulk-save", saveEightEightBulkCounts);
router.get("/bulk-history", getEightEightBulkHistory);
router.post("/bulk-delete", deleteEightEightBulkCounts);

// ✅ DELETE - Delete 8-8 Entry by ID
router.delete("/:id", deleteEightEight);

module.exports = router;
