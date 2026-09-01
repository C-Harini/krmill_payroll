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
    const records = await AdditionalSalary.findAll({
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
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ CREATE Additional Salary
exports.createAdditionalSalary = async (req, res) => {
  try {
    const {
      companyId,
      departmentId,
      employeeId,
      salaryMonth,
      salaryComponentId,
      days,
      amount,
    } = req.body;

    if (
      !companyId ||
      !departmentId ||
      !employeeId ||
      !salaryMonth ||
      !salaryComponentId
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const ticketNo = generateTicketNo();

    const record = await AdditionalSalary.create({
      companyId,
      departmentId,
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
    return res.status(500).json({ message: "Server error" });
  }
};


exports.updateAdditionalSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AdditionalSalary.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Additional Salary not found" });
    }

    const {
      companyId,
      departmentId,
      employeeId,
      salaryMonth,
      salaryComponentId,
      days,
      amount,
    } = req.body;

    await record.update({
      companyId,
      departmentId,
      employeeId,
      salaryMonth,
      salaryComponentId,
      days: days || 0,
      amount: amount || 0,
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

