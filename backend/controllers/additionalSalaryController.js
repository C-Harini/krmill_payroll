const {
  AdditionalSalary,
  Company,
  Department,
  Employee,
  SalaryComponent,
} = require("../models");

// ✅ Ticket Generator
const generateTicketNo = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${Date.now()}-${random}`;
};

// ✅ GET All Additional Salaries
exports.getAdditionalSalaries = async (req, res) => {
  try {
    const { employeeId, companyId } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (companyId) where.companyId = companyId;

    const records = await AdditionalSalary.findAll({
      where,
      include: [
        { model: Company, as: "company" },
        { model: Department, as: "department" },
        { model: Employee, as: "employee" },
        { model: SalaryComponent, as: "salaryComponent" },
      ],
      order: [["id", "DESC"]],
    });

    return res.json({ records });
  } catch (error) {
    console.error("Error fetching additional salaries:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ CREATE Additional Salary
exports.createAdditionalSalary = async (req, res) => {
  try {
    let {
      companyId,
      departmentId,
      employeeId,
      salaryMonth,
      salaryComponentId,
      days,
      amount,
    } = req.body;

    if (!employeeId || !salaryMonth || !salaryComponentId) {
      return res.status(400).json({ message: "Employee, Salary Month, and Component are required" });
    }

    // Auto-fetch company and department from employee if not provided
    if (!companyId || !departmentId) {
      const emp = await Employee.findByPk(employeeId);
      if (emp) {
        if (!companyId) companyId = emp.companyId;
        if (!departmentId) departmentId = emp.departmentId || null;
      }
    }

    if (!companyId) {
      return res.status(400).json({ message: "Employee does not have an assigned company. Please select a company." });
    }

    const ticketNo = generateTicketNo();

    const record = await AdditionalSalary.create({
      companyId,
      departmentId: departmentId || null,
      employeeId,
      salaryMonth,
      salaryComponentId,
      ticketNo,
      days: days ? Number(days) : 0,
      amount: amount ? Number(amount) : 0,
    });

    return res.status(201).json({
      message: "Additional salary created successfully ✅",
      record,
    });
  } catch (error) {
    console.error("Error creating additional salary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.updateAdditionalSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AdditionalSalary.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Additional Salary not found" });
    }

    let {
      companyId,
      departmentId,
      employeeId,
      salaryMonth,
      salaryComponentId,
      days,
      amount,
    } = req.body;

    const empIdToUse = employeeId || record.employeeId;
    if (!companyId || !departmentId) {
      const emp = await Employee.findByPk(empIdToUse);
      if (emp) {
        if (!companyId) companyId = emp.companyId;
        if (!departmentId) departmentId = emp.departmentId || record.departmentId;
      }
    }

    await record.update({
      companyId: companyId || record.companyId,
      departmentId: departmentId || record.departmentId,
      employeeId: empIdToUse,
      salaryMonth: salaryMonth || record.salaryMonth,
      salaryComponentId: salaryComponentId || record.salaryComponentId,
      days: days !== undefined && days !== "" ? Number(days) : record.days,
      amount: amount !== undefined && amount !== "" ? Number(amount) : record.amount,
    });

    res.json({ message: "Updated successfully", record });
  } catch (err) {
    console.error("Error updating additional salary:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ DELETE
exports.deleteAdditionalSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AdditionalSalary.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Additional Salary not found" });
    }

    await record.destroy();

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting additional salary:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

