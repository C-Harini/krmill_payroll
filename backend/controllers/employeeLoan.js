const { EmployeeLoan, Employee, Sequelize } = require("../models");
const { Op } = require("sequelize");

// ========================================
// CREATE EMPLOYEE LOAN
// ========================================
exports.createEmployeeLoan = async (req, res) => {
  try {
    const {
      companyId,
      employeeId,
      loanType,
      loanAmount,
      interestRate,
      sanctionDate,
      startDate,
      numberOfInstallments,
      reason,
      remarks,
    } = req.body;

    if (
      !employeeId ||
      !loanAmount ||
      !sanctionDate ||
      !startDate ||
      !numberOfInstallments
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let finalCompanyId = companyId;
    if (!finalCompanyId && employeeId) {
      const emp = await Employee.findByPk(employeeId);
      if (emp) finalCompanyId = emp.companyId;
    }

    // Simple EMI calculation (without interest calculation logic)
    const installmentAmount = Number(loanAmount) / Number(numberOfInstallments);

    const loan = await EmployeeLoan.create({
      companyId: finalCompanyId || null,
      employeeId,
      loanType,
      loanAmount,
      interestRate: interestRate || 0,
      sanctionDate,
      startDate,
      numberOfInstallments,
      installmentAmount,
      status: "pending",
      reason,
      remarks,
    });

    res.status(201).json({
      message: "Loan created successfully ✅",
      loan,
    });
  } catch (error) {
    console.error("Create Loan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// APPROVE LOAN
// ========================================
exports.approveLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId } = req.body;

    const loan = await EmployeeLoan.findByPk(id);

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    await loan.update({
      status: "active",
      approvedBy: approverId,
      approvedDate: new Date(),
    });

    res.json({ message: "Loan approved successfully ✅", loan });
  } catch (error) {
    console.error("Approve Loan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// GET ALL LOANS
// ========================================
exports.getEmployeeLoans = async (req, res) => {
  try {
    const loans = await EmployeeLoan.findAll({
      include: [
        { model: Employee, as: "employee" },
        { model: Employee, as: "approver" },
      ],
      order: [["id", "DESC"]],
    });

    res.json({ loans });
  } catch (error) {
    console.error("Fetch Loans Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// GET SINGLE LOAN
// ========================================
exports.getEmployeeLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await EmployeeLoan.findByPk(id, {
      include: [
        { model: Employee, as: "employee" },
        { model: Employee, as: "approver" },
      ],
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.json({ loan });
  } catch (error) {
    console.error("Fetch Loan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// UPDATE LOAN
// ========================================
exports.updateEmployeeLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await EmployeeLoan.findByPk(id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    await loan.update(req.body);

    res.json({ message: "Loan updated successfully ✅", loan });
  } catch (error) {
    console.error("Update Loan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// DELETE LOAN
// ========================================
exports.deleteEmployeeLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await EmployeeLoan.findByPk(id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    await loan.destroy();

    res.json({ message: "Loan deleted successfully ✅" });
  } catch (error) {
    console.error("Delete Loan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// PROCESS MONTHLY EMI DEDUCTION
// (Call inside Salary Generation)
// ========================================
exports.processLoanDeduction = async (employeeId) => {
  try {
    const activeLoans = await EmployeeLoan.findAll({
      where: {
        employeeId,
        status: "active",
        paidInstallments: {
          [Op.lt]: Sequelize.col("numberOfInstallments"),
        },
      },
    });

    let totalDeduction = 0;

    for (let loan of activeLoans) {
      totalDeduction += Number(loan.installmentAmount);

      const newPaidInstallments = loan.paidInstallments + 1;
      const newPaidAmount =
        Number(loan.paidAmount) + Number(loan.installmentAmount);

      await loan.update({
        paidInstallments: newPaidInstallments,
        paidAmount: newPaidAmount,
        status:
          newPaidInstallments >= loan.numberOfInstallments
            ? "completed"
            : "active",
      });
    }

    return totalDeduction;
  } catch (error) {
    console.error("Loan Deduction Error:", error);
    throw error;
  }
};
