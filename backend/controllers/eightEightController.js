const db = require("../models");
const { EightEightEntry, Employee, Category, ShiftType } = db;
const { Op } = require("sequelize");
const moment = require("moment");
const { isDateLocked } = require("../utils/attendanceLockUtil");

// ============================================================
// EIGHT-EIGHT MULTIPLE ENTRY CONTROLLER
// ============================================================

exports.getEightEightMultipleEntry = async (req, res) => {
  const { companyId, departmentId, workedDeptId, date, shiftId } = req.query;

  if (!companyId || !departmentId || !date) {
    return res.status(400).json({
      success: false,
      message: "companyId, departmentId, and date are required",
    });
  }

  try {
    const targetDate = moment(date).format("YYYY-MM-DD");

    // 1. Fetch active employees in this department
    const employees = await Employee.findAll({
      where: {
        companyId,
        departmentId,
        status: "Active",
      },
      attributes: ["id", "employeeCode", "firstName", "middleName", "lastName"],
      order: [["employeeCode", "ASC"]],
    });

    // 2. Fetch already saved 8-8 records matching the query config
    const whereClause = {
      companyId,
      departmentId,
      date: {
        [Op.gte]: moment(targetDate).startOf("day").toDate(),
        [Op.lte]: moment(targetDate).endOf("day").toDate(),
      },
    };
    if (workedDeptId) whereClause.workedDeptId = workedDeptId;
    if (shiftId) whereClause.shiftId = shiftId;

    const savedRecords = await EightEightEntry.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "middleName", "lastName"],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["categoryName"],
            },
          ],
        },
        {
          model: ShiftType,
          as: "shift",
          attributes: ["name"],
        },
      ],
      order: [["id", "ASC"]],
    });

    // Enriched saved list
    const savedData = savedRecords.map((r, index) => {
      const emp = r.employee;
      return {
        id: r.id,
        slNo: index + 1,
        ticketNo: emp ? emp.employeeCode : "",
        employeeName: emp ? emp.firstName : "",
        shiftName: r.shift ? r.shift.name : "",
        category: emp && emp.category ? emp.category.categoryName : "",
        entryType: r.entryType,
        hours: r.hours,
        remarks: r.remarks,
      };
    });

    const bulkEntries = await EightEightEntry.findAll({
      where: {
        companyId,
        departmentId,
        employeeId: null,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
      }
    });

    const bulkCounts = {
      "PREP 8-8": 0,
      "SPG 8-8": 0,
      "Auto 8-8": 0
    };
    bulkEntries.forEach(r => {
      bulkCounts[r.entryType] = parseFloat(r.hours) || 0;
    });

    return res.status(200).json({
      success: true,
      employees,
      savedRecords: savedData,
      bulkCounts
    });

  } catch (err) {
    console.error("[getEightEightMultipleEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveEightEightMultipleEntry = async (req, res) => {
  const {
    companyId,
    departmentId,
    workedDeptId,
    date,
    shiftId,
    entryType,
    hours,
    employeeIds,
    userId,
  } = req.body;

  if (
    !companyId ||
    !departmentId ||
    !workedDeptId ||
    !date ||
    !shiftId ||
    !entryType ||
    hours === undefined ||
    !Array.isArray(employeeIds)
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters or employeeIds list",
    });
  }

  if (await isDateLocked(companyId, date)) {
    return res.status(403).json({
      success: false,
      message: `8-8 entry is LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
      isLocked: true,
    });
  }

  const { sequelize } = db;
  const transaction = await sequelize.transaction();

  try {
    const targetDate = moment(date).format("YYYY-MM-DD");

    for (const empId of employeeIds) {
      const existing = await EightEightEntry.findOne({
        where: {
          employeeId: empId,
          entryType,
          date: {
            [Op.gte]: moment(targetDate).startOf("day").toDate(),
            [Op.lte]: moment(targetDate).endOf("day").toDate(),
          },
        },
        transaction,
      });

      if (existing) {
        await existing.update(
          {
            companyId,
            departmentId,
            workedDeptId,
            shiftId,
            hours: parseFloat(hours),
            updatedBy: userId || 1,
          },
          { transaction }
        );
      } else {
        await EightEightEntry.create(
          {
            companyId,
            departmentId,
            employeeId: empId,
            date: moment(targetDate).toDate(),
            workedDeptId,
            shiftId,
            entryType,
            hours: parseFloat(hours),
            createdBy: userId || 1,
            status: "Active",
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: "8-8 records saved successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[saveEightEightMultipleEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEightEight = async (req, res) => {
  const { id } = req.params;
  console.log(`[deleteEightEight] Attempting to delete 8-8 entry with ID: ${id}`);

  try {
    const record = await EightEightEntry.findByPk(id);
    if (!record) {
      console.log(`[deleteEightEight] Record with ID: ${id} not found in database`);
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    if (await isDateLocked(record.companyId, record.date)) {
      return res.status(403).json({
        success: false,
        message: `8-8 entry is LOCKED for ${moment(record.date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    await record.destroy();
    console.log(`[deleteEightEight] Successfully deleted 8-8 record with ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (err) {
    console.error("[deleteEightEight] Error occurred:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveEightEightBulkCounts = async (req, res) => {
  const {
    companyId,
    departmentId,
    workedDeptId,
    date,
    shiftId,
    bulkCounts, // e.g. { "PREP 8-8": 0, "SPG 8-8": 6, "Auto 8-8": 0 }
    userId
  } = req.body;

  if (!companyId || !departmentId || !date || !bulkCounts) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters"
    });
  }

  if (await isDateLocked(companyId, date)) {
    return res.status(403).json({
      success: false,
      message: `Bulk 8-8 counts are LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
      isLocked: true,
    });
  }

  const { sequelize } = db;
  const transaction = await sequelize.transaction();

  try {
    const targetDate = moment(date).format("YYYY-MM-DD");

    for (const [entryType, count] of Object.entries(bulkCounts)) {
      const val = parseFloat(count) || 0;

      const existing = await EightEightEntry.findOne({
        where: {
          employeeId: null,
          entryType,
          date: {
            [Op.gte]: moment(targetDate).startOf("day").toDate(),
            [Op.lte]: moment(targetDate).endOf("day").toDate(),
          },
        },
        transaction,
      });

      if (val > 0) {
        if (existing) {
          await existing.update(
            {
              companyId,
              departmentId,
              workedDeptId: workedDeptId || departmentId,
              shiftId,
              hours: val,
              updatedBy: userId || 1,
            },
            { transaction }
          );
        } else {
          await EightEightEntry.create(
            {
              companyId,
              departmentId,
              employeeId: null,
              date: moment(targetDate).toDate(),
              workedDeptId: workedDeptId || departmentId,
              shiftId,
              entryType,
              hours: val,
              createdBy: userId || 1,
              status: "Active",
            },
            { transaction }
          );
        }
      } else {
        // If count is 0, delete any existing record
        if (existing) {
          await existing.destroy({ transaction });
        }
      }
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: "Bulk 8-8 counts saved successfully"
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[saveEightEightBulkCounts]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEightEightBulkHistory = async (req, res) => {
  const { companyId } = req.query;
  try {
    const entries = await EightEightEntry.findAll({
      where: {
        employeeId: null,
        companyId: companyId || 1
      },
      order: [["date", "DESC"]]
    });

    const grouped = {};
    entries.forEach(e => {
      const dStr = moment(e.date).format("YYYY-MM-DD");
      if (!grouped[dStr]) {
        grouped[dStr] = {
          date: dStr,
          "PREP 8-8": 0,
          "SPG 8-8": 0,
          "Auto 8-8": 0
        };
      }
      grouped[dStr][e.entryType] = parseFloat(e.hours) || 0;
    });

    const history = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error("[getEightEightBulkHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEightEightBulkCounts = async (req, res) => {
  const { companyId, date } = req.body;
  if (!date) {
    return res.status(400).json({ success: false, message: "Date is required" });
  }

  const effectiveCompanyId = companyId || 1;
  if (await isDateLocked(effectiveCompanyId, date)) {
    return res.status(403).json({
      success: false,
      message: `Bulk 8-8 counts are LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
      isLocked: true,
    });
  }

  const { sequelize } = db;
  const transaction = await sequelize.transaction();
  try {
    await EightEightEntry.destroy({
      where: {
        employeeId: null,
        companyId: companyId || 1,
        date: {
          [Op.gte]: moment(date).startOf("day").toDate(),
          [Op.lte]: moment(date).endOf("day").toDate(),
        }
      },
      transaction
    });
    await transaction.commit();
    return res.status(200).json({ success: true, message: "Bulk counts deleted successfully" });
  } catch (err) {
    await transaction.rollback();
    console.error("[deleteEightEightBulkCounts]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


