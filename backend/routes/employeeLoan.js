const express = require("express");
const router = express.Router();
const employeeLoanController = require("../controllers/employeeLoan");
// const authMiddleware = require('../middleware/auth'); // Optional auth

// Apply authentication middleware if needed
// router.use(authMiddleware);

// ==========================================
// GET /api/employee-loans
// Get all employee loans
// ==========================================
router.get("/", employeeLoanController.getEmployeeLoans);

// ==========================================
// GET /api/employee-loans/:id
// Get single loan by ID
// ==========================================
router.get("/:id", employeeLoanController.getEmployeeLoanById);

// ==========================================
// POST /api/employee-loans
// Create new loan
// ==========================================
router.post("/", employeeLoanController.createEmployeeLoan);

// ==========================================
// PUT /api/employee-loans/:id
// Update loan
// ==========================================
router.put("/:id", employeeLoanController.updateEmployeeLoan);

// ==========================================
// PUT /api/employee-loans/:id/approve
// Approve loan
// ==========================================
router.put("/:id/approve", employeeLoanController.approveLoan);

// ==========================================
// DELETE /api/employee-loans/:id
// Delete loan
// ==========================================
router.delete("/:id", employeeLoanController.deleteEmployeeLoan);

module.exports = router;
