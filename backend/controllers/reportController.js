const { Op, Sequelize } = require("sequelize");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const REPORT_FIELDS = [
  {
    key: "employeeCode",
    label: "Employee Code",
    type: "string",
    category: "Basic Information",
    dbField: "employeeCode",
  },
  {
    key: "firstName",
    label: "First Name",
    type: "string",
    category: "Basic Information",
    dbField: "firstName",
  },
  {
    key: "middleName",
    label: "Middle Name",
    type: "string",
    category: "Basic Information",
    dbField: "middleName",
  },
  {
    key: "lastName",
    label: "Last Name",
    type: "string",
    category: "Basic Information",
    dbField: "lastName",
  },
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    type: "date",
    category: "Basic Information",
    dbField: "dateOfBirth",
  },
  {
    key: "gender",
    label: "Gender",
    type: "enum",
    category: "Basic Information",
    dbField: "gender",
    values: ["Male", "Female", "Other"],
  },
  {
    key: "bloodGroup",
    label: "Blood Group",
    type: "enum",
    category: "Basic Information",
    dbField: "bloodGroup",
    values: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
  },
  {
    key: "maritalStatus",
    label: "Marital Status",
    type: "enum",
    category: "Basic Information",
    dbField: "maritalStatus",
    values: ["Single", "Married", "Divorced", "Widowed"],
  },
  // Social Information
  {
    key: "categoryId",
    label: "Category",
    type: "relation",
    category: "Social Information",
    dbField: "categoryId",
    include: "category",
    displayField: "categoryName",
  },
  {
    key: "casteId",
    label: "Caste",
    type: "relation",
    category: "Social Information",
    dbField: "casteId",
    include: "caste",
    displayField: "casteName",
  },
  {
    key: "religionId",
    label: "Religion",
    type: "relation",
    category: "Social Information",
    dbField: "religionId",
    include: "religion",
    displayField: "religionName",
  },
  {
    key: "experience",
    label: "Experience (Years)",
    type: "number",
    category: "Social Information",
    dbField: "experience",
  },
  // Contact Information
  {
    key: "personalEmail",
    label: "Personal Email",
    type: "string",
    category: "Contact Information",
    dbField: "personalEmail",
  },
  {
    key: "officialEmail",
    label: "Official Email",
    type: "string",
    category: "Contact Information",
    dbField: "officialEmail",
  },
  {
    key: "mobileNumber",
    label: "Mobile Number",
    type: "string",
    category: "Contact Information",
    dbField: "mobileNumber",
  },
  {
    key: "alternateMobile",
    label: "Alternate Mobile",
    type: "string",
    category: "Contact Information",
    dbField: "alternateMobile",
  },
  {
    key: "emergencyContactName",
    label: "Emergency Contact Name",
    type: "string",
    category: "Contact Information",
    dbField: "emergencyContactName",
  },
  {
    key: "emergencyContactNumber",
    label: "Emergency Contact No",
    type: "string",
    category: "Contact Information",
    dbField: "emergencyContactNumber",
  },
  {
    key: "emergencyContactRelationship",
    label: "Emergency Relationship",
    type: "string",
    category: "Contact Information",
    dbField: "emergencyContactRelationship",
  },
  // Current Address
  {
    key: "currentAddressLine1",
    label: "Address Line 1",
    type: "string",
    category: "Current Address",
    dbField: "currentAddressLine1",
  },
  {
    key: "currentAddressLine2",
    label: "Address Line 2",
    type: "string",
    category: "Current Address",
    dbField: "currentAddressLine2",
  },
  {
    key: "currentCity",
    label: "City",
    type: "string",
    category: "Current Address",
    dbField: "currentCity",
  },
  {
    key: "currentState",
    label: "State",
    type: "string",
    category: "Current Address",
    dbField: "currentState",
  },
  {
    key: "currentPincode",
    label: "Pincode",
    type: "string",
    category: "Current Address",
    dbField: "currentPincode",
  },
  {
    key: "currentCountry",
    label: "Country",
    type: "string",
    category: "Current Address",
    dbField: "currentCountry",
  },
  // Permanent Address
  {
    key: "permanentAddressLine1",
    label: "Perm Address Line 1",
    type: "string",
    category: "Permanent Address",
    dbField: "permanentAddressLine1",
  },
  {
    key: "permanentCity",
    label: "Perm City",
    type: "string",
    category: "Permanent Address",
    dbField: "permanentCity",
  },
  {
    key: "permanentState",
    label: "Perm State",
    type: "string",
    category: "Permanent Address",
    dbField: "permanentState",
  },
  {
    key: "permanentPincode",
    label: "Perm Pincode",
    type: "string",
    category: "Permanent Address",
    dbField: "permanentPincode",
  },
  {
    key: "permanentCountry",
    label: "Perm Country",
    type: "string",
    category: "Permanent Address",
    dbField: "permanentCountry",
  },
  // Employment Details
  {
    key: "designationId",
    label: "Designation",
    type: "relation",
    category: "Employment Details",
    dbField: "designationId",
    include: "designation",
    displayField: "name",
  },
  {
    key: "departmentId",
    label: "Department",
    type: "relation",
    category: "Employment Details",
    dbField: "departmentId",
    include: "department",
    displayField: "departmentname",
  },
  {
    key: "gradeId",
    label: "Grade",
    type: "relation",
    category: "Employment Details",
    dbField: "gradeId",
    include: "grade",
    displayField: "name",
  },
  {
    key: "employmentTypeId",
    label: "Employment Type",
    type: "relation",
    category: "Employment Details",
    dbField: "employmentTypeId",
    include: "employmentType",
    displayField: "name",
  },
  {
    key: "employeeType",
    label: "Employee Type",
    type: "enum",
    category: "Employment Details",
    dbField: "employeeType",
    values: ["Permanent", "Contract", "Temporary", "Intern", "Staff", "Worker"],
  },
  {
    key: "dateOfJoining",
    label: "Date of Joining",
    type: "date",
    category: "Employment Details",
    dbField: "dateOfJoining",
  },
  {
    key: "dateOfRejoining",
    label: "Date of Rejoining",
    type: "date",
    category: "Employment Details",
    dbField: "dateOfRejoining",
  },
  {
    key: "confirmationDate",
    label: "Confirmation Date",
    type: "date",
    category: "Employment Details",
    dbField: "confirmationDate",
  },
  {
    key: "probationPeriod",
    label: "Probation (Months)",
    type: "number",
    category: "Employment Details",
    dbField: "probationPeriod",
  },
  {
    key: "relievingDate",
    label: "Relieving Date",
    type: "date",
    category: "Employment Details",
    dbField: "relievingDate",
  },
  {
    key: "leavingReason",
    label: "Leaving Reason",
    type: "string",
    category: "Employment Details",
    dbField: "leavingReason",
  },
  {
    key: "reportingManagerId",
    label: "Reporting Manager",
    type: "relation",
    category: "Employment Details",
    dbField: "reportingManagerId",
    include: "reportingManager",
    displayField: "firstName",
  },
  {
    key: "workLocation",
    label: "Work Location",
    type: "string",
    category: "Employment Details",
    dbField: "workLocation",
  },
  {
    key: "employmentStatus",
    label: "Employment Status",
    type: "enum",
    category: "Employment Details",
    dbField: "employmentStatus",
    values: ["Active", "Resigned", "Terminated", "On Leave", "Retired"],
  },
  {
    key: "referencePersonName",
    label: "Reference Person",
    type: "string",
    category: "Employment Details",
    dbField: "referencePersonName",
  },
  {
    key: "referencePersonContact",
    label: "Reference Contact",
    type: "string",
    category: "Employment Details",
    dbField: "referencePersonContact",
  },
  // Shift & Attendance
  {
    key: "shiftTypeId",
    label: "Shift Type",
    type: "relation",
    category: "Shift & Attendance",
    dbField: "shiftTypeId",
    include: "shiftType",
    displayField: "name",
  },
  {
    key: "weeklyOff",
    label: "Weekly Off",
    type: "enum",
    category: "Shift & Attendance",
    dbField: "weeklyOff",
    values: [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday",
    ],
  },
  {
    key: "isOvertimeApplicable",
    label: "Overtime Applicable",
    type: "boolean",
    category: "Shift & Attendance",
    dbField: "isOvertimeApplicable",
  },
  {
    key: "isLeaveApplicable",
    label: "Leave Applicable",
    type: "boolean",
    category: "Shift & Attendance",
    dbField: "isLeaveApplicable",
  },
  // Salary & Bank
  {
    key: "basicSalary",
    label: "Basic Salary",
    type: "number",
    category: "Salary & Bank",
    dbField: "basicSalary",
  },
  {
    key: "providentFundNumber",
    label: "PF Number",
    type: "string",
    category: "Salary & Bank",
    dbField: "providentFundNumber",
  },
  {
    key: "bankName",
    label: "Bank Name",
    type: "string",
    category: "Salary & Bank",
    dbField: "bankName",
  },
  {
    key: "bankAccountNumber",
    label: "Bank Account No",
    type: "string",
    category: "Salary & Bank",
    dbField: "bankAccountNumber",
  },
  {
    key: "ifscCode",
    label: "IFSC Code",
    type: "string",
    category: "Salary & Bank",
    dbField: "ifscCode",
  },
  {
    key: "bankBranch",
    label: "Bank Branch",
    type: "string",
    category: "Salary & Bank",
    dbField: "bankBranch",
  },
  {
    key: "paymentMode",
    label: "Payment Mode",
    type: "enum",
    category: "Salary & Bank",
    dbField: "paymentMode",
    values: ["Bank Transfer", "Cash", "Cheque"],
  },
  {
    key: "uanNumber",
    label: "UAN Number",
    type: "string",
    category: "Salary & Bank",
    dbField: "uanNumber",
  },
  {
    key: "esiNumber",
    label: "ESI Number",
    type: "string",
    category: "Salary & Bank",
    dbField: "esiNumber",
  },
  // Transport & Hostel
  {
    key: "isTransportRequired",
    label: "Transport Required",
    type: "boolean",
    category: "Transport & Hostel",
    dbField: "isTransportRequired",
  },
  {
    key: "pickupPoint",
    label: "Pickup Point",
    type: "string",
    category: "Transport & Hostel",
    dbField: "pickupPoint",
  },
  {
    key: "isHostel",
    label: "Hostel",
    type: "boolean",
    category: "Transport & Hostel",
    dbField: "isHostel",
  },
  {
    key: "isTrainee",
    label: "Trainee",
    type: "boolean",
    category: "Transport & Hostel",
    dbField: "isTrainee",
  },
  // Documents — from EmployeeDocument table (alias: 'documents')
  {
    key: "aadhaarNumber",
    label: "Aadhaar Number",
    type: "document",
    category: "Documents",
    dbField: "aadhaarNumber",
    include: "documents",
    displayField: "aadhaarNumber",
  },
  {
    key: "panNumber",
    label: "PAN Number",
    type: "document",
    category: "Documents",
    dbField: "panNumber",
    include: "documents",
    displayField: "panNumber",
  },
  {
    key: "passportNumber",
    label: "Passport Number",
    type: "document",
    category: "Documents",
    dbField: "passportNumber",
    include: "documents",
    displayField: "passportNumber",
  },
  {
    key: "drivingLicenseNumber",
    label: "Driving License No",
    type: "document",
    category: "Documents",
    dbField: "drivingLicenseNumber",
    include: "documents",
    displayField: "drivingLicenseNumber",
  },
  {
    key: "voterIdNumber",
    label: "Voter ID No",
    type: "document",
    category: "Documents",
    dbField: "voterIdNumber",
    include: "documents",
    displayField: "voterIdNumber",
  },
];

// ─────────────────────────────────────────────
// Helper: Build Sequelize WHERE from conditions
// ─────────────────────────────────────────────
function buildSingleConditionExpr(fieldMeta, operator, values) {
  const dbField = fieldMeta.dbField;
  switch (operator) {
    case "==":
      if (fieldMeta.type === "boolean") {
        return { [dbField]: values[0] === "Yes" };
      } else if (values.length === 1) {
        return { [dbField]: values[0] };
      } else {
        return { [dbField]: { [Op.in]: values } };
      }
    case "!=":
      return {
        [dbField]: values.length === 1
          ? { [Op.ne]: values[0] }
          : { [Op.notIn]: values }
      };
    case "contains":
      if (values.length === 1) {
        return { [dbField]: { [Op.like]: `%${values[0]}%` } };
      } else {
        return {
          [dbField]: {
            [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })),
          }
        };
      }
    case "<":
      return { [dbField]: { [Op.lt]: values[0] } };
    case ">":
      return { [dbField]: { [Op.gt]: values[0] } };
    case "<=":
      return { [dbField]: { [Op.lte]: values[0] } };
    case ">=":
      return { [dbField]: { [Op.gte]: values[0] } };
    default:
      return null;
  }
}

function buildWhereClause(conditions) {
  const validItems = [];
  (conditions || []).forEach((c) => {
    if (!c.field || !c.operator || !c.values || c.values.length === 0) return;
    const fieldMeta = REPORT_FIELDS.find((f) => f.key === c.field);
    if (!fieldMeta || fieldMeta.type === "document") return;

    const expr = buildSingleConditionExpr(fieldMeta, c.operator, c.values);
    if (expr) {
      validItems.push({
        expr,
        connector: c.connector || "AND",
      });
    }
  });

  if (validItems.length === 0) return {};
  if (validItems.length === 1) return validItems[0].expr;

  let current = validItems[0].expr;
  for (let i = 1; i < validItems.length; i++) {
    const item = validItems[i];
    if (item.connector === "OR") {
      current = { [Op.or]: [current, item.expr] };
    } else {
      current = { [Op.and]: [current, item.expr] };
    }
  }
  return current;
}

// ─────────────────────────────────────────────
// Helper: Build association includes
// ─────────────────────────────────────────────
function buildIncludes(columns, models) {
  const includes = [];
  const seen = {};

  const map = {
    category: {
      model: models.Category,
      as: "category",
      attributes: ["id", "categoryName"],
      required: false,
    },
    caste: {
      model: models.Caste,
      as: "caste",
      attributes: ["id", "casteName"],
      required: false,
    },
    religion: {
      model: models.Religion,
      as: "religion",
      attributes: ["id", "religionName"],
      required: false,
    },
    designation: {
      model: models.Designation,
      as: "designation",
      attributes: ["id", "name"],
      required: false,
    },
    department: {
      model: models.Department,
      as: "department",
      // Use actual DB column — no alias syntax to avoid _conformInclude errors
      attributes: ["id", "departmentname"],
      required: false,
    },
    grade: {
      model: models.EmployerGrade,
      as: "grade",
      attributes: ["id", "name"],
      required: false,
    },
    employmentType: {
      model: models.EmploymentType,
      as: "employmentType",
      attributes: ["id", "name"],
      required: false,
    },
    shiftType: {
      model: models.ShiftType,
      as: "shiftType",
      attributes: ["id", "name"],
      required: false,
    },
    reportingManager: {
      model: models.Employee,
      as: "reportingManager",
      attributes: ["id", "firstName", "lastName", "employeeCode"],
      required: false,
    },
  };

  // If any document column selected, add EmployeeDocument include once
  // Association alias is 'documents' per: Employee.hasOne(EmployeeDocument, { as: 'documents' })
  const needsDocuments = columns.some((colKey) => {
    const fm = REPORT_FIELDS.find((f) => f.key === colKey);
    return fm && fm.type === "document";
  });

  if (needsDocuments && !seen["documents"]) {
    seen["documents"] = true;
    includes.push({
      model: models.EmployeeDocument,
      as: "documents",
      attributes: [
        "aadhaarNumber",
        "panNumber",
        "passportNumber",
        "drivingLicenseNumber",
        "voterIdNumber",
      ],
      required: false,
    });
  }

  // Add relation includes for non-document fields
  columns.forEach((colKey) => {
    const fm = REPORT_FIELDS.find((f) => f.key === colKey);
    if (fm && fm.type === "relation" && fm.include && !seen[fm.include]) {
      seen[fm.include] = true;
      if (map[fm.include]) includes.push(map[fm.include]);
    }
  });

  return includes;
}

// ─────────────────────────────────────────────
// Helper: Format one employee record for output
// ─────────────────────────────────────────────
function formatRowData(employee, columns) {
  const row = {};
  columns.forEach((colKey) => {
    const fm = REPORT_FIELDS.find((f) => f.key === colKey);
    if (!fm) return;

    // Document fields — read from EmployeeDocument (alias: 'documents')
    if (fm.type === "document") {
      const docRecord = employee.documents;
      row[colKey] = docRecord ? docRecord[fm.displayField] || "" : "";
      return;
    }

    // Relation fields
    if (fm.type === "relation" && fm.include) {
      const rel = employee[fm.include];
      if (!rel) {
        row[colKey] = "";
        return;
      }
      if (fm.include === "reportingManager") {
        row[colKey] = `${rel.firstName} (${rel.employeeCode})`;
      } else if (fm.include === "category") {
        row[colKey] = rel.categoryName || "";
      } else if (fm.include === "caste") {
        row[colKey] = rel.casteName || "";
      } else if (fm.include === "religion") {
        row[colKey] = rel.religionName || "";
      } else if (fm.include === "department") {
        // Use actual column name — no alias
        row[colKey] = rel.departmentname || "";
      } else {
        row[colKey] = rel[fm.displayField] || "";
      }
      return;
    }

    // Boolean fields
    if (fm.type === "boolean") {
      row[colKey] = employee[fm.dbField] ? "Yes" : "No";
      return;
    }

    // Date fields
    if (fm.type === "date") {
      const val = employee[fm.dbField];
      row[colKey] = val ? new Date(val).toLocaleDateString("en-IN") : "";
      return;
    }

    // Number fields
    if (fm.type === "number") {
      row[colKey] =
        employee[fm.dbField] != null ? Number(employee[fm.dbField]) : "";
      return;
    }

    // Default string
    row[colKey] =
      employee[fm.dbField] != null ? String(employee[fm.dbField]) : "";
  });
  return row;
}

// ─────────────────────────────────────────────
// Shared query executor
// ─────────────────────────────────────────────
async function executeReportQuery(columns, conditions, companyId) {
  const db = require("../models");

  const where = buildWhereClause(conditions || []);
  where.companyId = companyId;

  const includes = buildIncludes(columns, db);

  // Build Employee attributes — exclude document fields (they're on joined table)
  const attributes = ["id"];
  columns.forEach((colKey) => {
    const fm = REPORT_FIELDS.find((f) => f.key === colKey);
    if (!fm || fm.type === "document") return;
    if (!attributes.includes(fm.dbField)) {
      attributes.push(fm.dbField);
    }
  });

  const employees = await db.Employee.findAll({
    attributes,
    where,
    include: includes,
    order: [["employeeCode", "ASC"]],
    raw: false,
  });

  return employees.map((emp) => formatRowData(emp, columns));
}

// ─────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────
module.exports = {
  // GET /api/reports/fields
  getReportFields: async (req, res) => {
    try {
      const fields = REPORT_FIELDS.map(({ key, label, type, category, values }) => ({
        key,
        label,
        // Expose 'document' as 'string' to frontend — no special UI needed
        type: type === "document" ? "string" : type,
        category,
        ...(values && { values }),
      }));
      res.json(fields);
    } catch (error) {
      console.error("Error fetching report fields:", error);
      res.status(500).json({ error: "Failed to fetch report fields" });
    }
  },

  // GET /api/reports/distinct-values/:fieldName?companyId=X
  getDistinctValues: async (req, res) => {
    try {
      const { fieldName } = req.params;
      const { companyId } = req.query;
      const db = require("../models");

      const fm = REPORT_FIELDS.find((f) => f.key === fieldName);
      if (!fm) return res.status(400).json({ error: "Invalid field name" });

      // Static enum values
      if (fm.values) return res.json(fm.values);
      if (fm.type === "boolean") return res.json(["Yes", "No"]);

      // Document fields — query EmployeeDocument directly
      if (fm.type === "document") {
        const w = {};
        if (companyId) w.companyId = companyId;
        const vals = await db.EmployeeDocument.findAll({
          attributes: [
            [Sequelize.fn("DISTINCT", Sequelize.col(fm.displayField)), "value"],
          ],
          where: w,
          raw: true,
        });
        return res.json(
          vals
            .map((v) => v.value)
            .filter((v) => v != null && v !== "")
            .sort()
        );
      }

      // Relation fields — query the related model
      if (fm.type === "relation") {
        const relMap = {
          category: { model: db.Category, field: "categoryName" },
          caste: { model: db.Caste, field: "casteName" },
          religion: { model: db.Religion, field: "religionName" },
          designation: { model: db.Designation, field: "name" },
          department: { model: db.Department, field: "departmentname" },
          grade: { model: db.EmployerGrade, field: "name" },
          employmentType: { model: db.EmploymentType, field: "name" },
          shiftType: { model: db.ShiftType, field: "name" },
          reportingManager: { model: db.Employee, field: "firstName" },
        };
        const rel = relMap[fm.include];
        if (rel) {
          const w = {};
          if (
            companyId &&
            rel.model.rawAttributes &&
            rel.model.rawAttributes.companyId
          ) {
            w.companyId = companyId;
          }
          const vals = await rel.model.findAll({
            attributes: [
              [Sequelize.fn("DISTINCT", Sequelize.col(rel.field)), "value"],
            ],
            where: w,
            raw: true,
          });
          return res.json(
            vals.map((v) => v.value).filter(Boolean).sort()
          );
        }
      }

      // Plain Employee column
      const w = {};
      if (companyId) w.companyId = companyId;
      const vals = await db.Employee.findAll({
        attributes: [
          [Sequelize.fn("DISTINCT", Sequelize.col(fm.dbField)), "value"],
        ],
        where: w,
        raw: true,
      });
      res.json(
        vals
          .map((v) => v.value)
          .filter((v) => v != null && v !== "")
          .sort()
      );
    } catch (error) {
      console.error("Error fetching distinct values:", error);
      res.status(500).json({ error: "Failed to fetch distinct values" });
    }
  },

  // POST /api/reports/generate
  generateReport: async (req, res) => {
    try {
      const { columns, conditions, companyId } = req.body;
      if (!columns || !columns.length)
        return res.status(400).json({ error: "Select at least one column" });
      if (!companyId)
        return res.status(400).json({ error: "Company ID is required" });

      const data = await executeReportQuery(columns, conditions, companyId);
      const columnLabels = columns.map((k) => {
        const fm = REPORT_FIELDS.find((f) => f.key === k);
        return { key: k, label: fm ? fm.label : k };
      });
      res.json({ columns: columnLabels, data, totalCount: data.length });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  },

  // POST /api/reports/download/excel
  downloadExcel: async (req, res) => {
    try {
      const { columns, conditions, companyId } = req.body;
      if (!columns || !columns.length)
        return res.status(400).json({ error: "Select at least one column" });

      const data = await executeReportQuery(columns, conditions, companyId);
      const columnLabels = columns.map((k) => {
        const fm = REPORT_FIELDS.find((f) => f.key === k);
        return fm ? fm.label : k;
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Payroll System";
      const ws = workbook.addWorksheet("Employee Report");

      // Title row
      const titleRow = ws.addRow(["Employee Report"]);
      titleRow.font = { bold: true, size: 16, color: { argb: "FF1E293B" } };
      ws.mergeCells(1, 1, 1, columns.length);
      titleRow.alignment = { horizontal: "center" };

      // Subtitle row
      const dateRow = ws.addRow([
        `Generated: ${new Date().toLocaleDateString("en-IN")} | Records: ${data.length}`,
      ]);
      dateRow.font = { size: 10, color: { argb: "FF64748B" } };
      ws.mergeCells(2, 1, 2, columns.length);
      dateRow.alignment = { horizontal: "center" };
      ws.addRow([]);

      // Header row
      const headerRow = ws.addRow(columnLabels);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4338CA" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      headerRow.height = 28;

      // Data rows
      data.forEach((row, idx) => {
        const vals = columns.map((k) => row[k] ?? "");
        const dr = ws.addRow(vals);
        dr.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          cell.alignment = { vertical: "middle" };
          if (idx % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        });
      });

      // Auto column widths
      ws.columns.forEach((col, i) => {
        let max = columnLabels[i] ? columnLabels[i].length : 10;
        data.forEach((row) => {
          const v = String(row[columns[i]] ?? "");
          if (v.length > max) max = v.length;
        });
        col.width = Math.min(Math.max(max + 4, 12), 40);
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Employee_Report_${Date.now()}.xlsx`
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error downloading Excel:", error);
      res.status(500).json({ error: "Failed to generate Excel" });
    }
  },

  // POST /api/reports/download/pdf
  downloadPdf: async (req, res) => {
    try {
      const { columns, conditions, companyId } = req.body;
      if (!columns || !columns.length)
        return res.status(400).json({ error: "Select at least one column" });

      const data = await executeReportQuery(columns, conditions, companyId);
      const columnLabels = columns.map((k) => {
        const fm = REPORT_FIELDS.find((f) => f.key === k);
        return fm ? fm.label : k;
      });

      const doc = new PDFDocument({
        size: columns.length > 6 ? "A3" : "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 40, left: 30, right: 30 },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Employee_Report_${Date.now()}.pdf`
      );
      doc.pipe(res);

      // Title
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#1e293b")
        .text("Employee Report", { align: "center" });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(
          `Generated: ${new Date().toLocaleDateString("en-IN")} | Records: ${data.length}`,
          { align: "center" }
        );
      doc.moveDown(1);

      // Table layout
      const pw =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const cw = Math.floor(pw / columns.length);
      const rh = 22;
      const sx = doc.page.margins.left;
      let y = doc.y;

      const drawHeader = () => {
        doc.fillColor("#4338ca").rect(sx, y, pw, rh + 4).fill();
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
        columns.forEach((_, i) => {
          doc.text(columnLabels[i], sx + i * cw + 4, y + 6, {
            width: cw - 8,
            height: rh,
            ellipsis: true,
          });
        });
        y += rh + 4;
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
      };

      drawHeader();

      data.forEach((row, ri) => {
        if (y + rh > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHeader();
        }
        if (ri % 2 === 0) {
          doc.fillColor("#f8fafc").rect(sx, y, pw, rh).fill();
        }
        doc
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .moveTo(sx, y + rh)
          .lineTo(sx + pw, y + rh)
          .stroke();
        doc.fillColor("#334155");
        columns.forEach((k, i) => {
          doc.text(String(row[k] ?? ""), sx + i * cw + 4, y + 5, {
            width: cw - 8,
            height: rh,
            ellipsis: true,
          });
        });
        y += rh;
      });

      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text("Report generated by Payroll Management System", {
          align: "center",
        });
      doc.end();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  },

  generateDepartmentAttendanceReport: async (req, res) => {
    const { reportType, fromDate, toDate, departments, shift, companyId } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "fromDate and toDate are required" });
    }

    try {
      const { Attendance, Employee, Department, ShiftType, DepartmentAttendance, BiometricPunch } = require("../models");
      const moment = require("moment");

      // Fetch shift name mappings in memory
      const allShifts = await ShiftType.findAll({ raw: true });
      const shiftMap = {};
      allShifts.forEach(s => {
        shiftMap[s.id] = s.name;
      });

      // Fetch department mappings in memory
      const allDepts = await Department.findAll({ raw: true });
      const deptMap = {};
      allDepts.forEach(d => {
        deptMap[d.id] = d.departmentname;
      });

      // 1. Fetch manual department attendance records
      const manualWhere = {
        attendanceDate: {
          [Op.between]: [fromDate, toDate]
        }
      };
      if (companyId) {
        manualWhere.companyId = companyId;
      }
      if (Array.isArray(departments) && departments.length > 0) {
        manualWhere[Op.or] = [
          { workedDeptId: { [Op.in]: departments } },
          { departmentId: { [Op.in]: departments } }
        ];
      }
      if (shift) {
        manualWhere.shiftId = parseInt(shift);
      }

      const manualRecords = await DepartmentAttendance.findAll({
        where: manualWhere,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "employeeCode", "firstName", "middleName", "lastName", "departmentId", "shiftTypeId"],
            required: false
          },
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname"],
            required: false
          },
          {
            model: Department,
            as: "workedDepartment",
            attributes: ["id", "departmentname"],
            required: false
          },
          {
            model: ShiftType,
            as: "shiftType",
            attributes: ["id", "name"],
            required: false
          }
        ]
      });

      const manualEmpIds = manualRecords.map(mr => mr.employeeId).filter(Boolean);

      // Index manual records by employeeId_attendanceDate
      const manualMap = {};
      manualRecords.forEach(mr => {
        manualMap[`${mr.employeeId}_${mr.attendanceDate}`] = mr;
      });

      // 2. Fetch general/biometric Attendance records
      const whereClause = {
        attendanceDate: {
          [Op.between]: [fromDate, toDate]
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      if (Array.isArray(departments) && departments.length > 0) {
        const deptConditions = [
          { workedDeptId: { [Op.in]: departments } },
          { departmentId: { [Op.in]: departments } },
          { "$employee.departmentId$": { [Op.in]: departments } }
        ];
        if (manualEmpIds.length > 0) {
          deptConditions.push({ employeeId: { [Op.in]: manualEmpIds } });
        }
        whereClause[Op.or] = deptConditions;
      }

      if (shift) {
        const targetShift = allShifts.find(s => String(s.id) === String(shift));
        const shiftConditions = [
          { shiftId: parseInt(shift) },
          { shiftTypeId: parseInt(shift) },
          { "$employee.shiftTypeId$": parseInt(shift) }
        ];
        if (targetShift && targetShift.name) {
          shiftConditions.push({ shiftName: { [Op.like]: `%${targetShift.name}%` } });
        }
        whereClause[Op.and] = [{ [Op.or]: shiftConditions }];
      }

      const attendanceRecords = await Attendance.findAll({
        where: whereClause,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "employeeCode", "firstName", "middleName", "lastName", "departmentId", "shiftTypeId"],
            required: false
          },
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname"],
            required: false
          },
          {
            model: ShiftType,
            as: "shiftType",
            attributes: ["id", "name"],
            required: false
          }
        ],
        order: [["attendanceDate", "DESC"], ["id", "ASC"]]
      });

      // 3. Merge both sources (Attendance + DepartmentAttendance)
      const recordMap = new Map();

      // Process Attendance records first
      attendanceRecords.forEach(r => {
        const emp = r.employee;
        const key = `${r.employeeId}_${r.attendanceDate}`;
        const manualRecord = manualMap[key];

        // Reconcile department: manual workedDeptId > manual departmentId > master workedDeptId > master departmentId > employee default
        const deptId = (manualRecord ? manualRecord.workedDeptId || manualRecord.departmentId : null)
          || r.workedDeptId
          || r.departmentId
          || (emp ? emp.departmentId : null);
        const deptName = deptMap[deptId] || (emp && emp.department ? emp.department.departmentname : "General");

        // Reconcile shift: manual shiftName > manual shiftId > r.shiftName > r.shiftId > r.shiftTypeId > employee default
        const shId = (manualRecord ? manualRecord.shiftId : null)
          || r.shiftId
          || r.shiftTypeId
          || (emp ? emp.shiftTypeId : null);
        let shiftName = (manualRecord ? manualRecord.shiftName : null)
          || (r.shiftName && r.shiftName !== "Unknown" ? r.shiftName : null)
          || shiftMap[shId]
          || "General";

        // Reconcile status and punch times
        const hasManual = !!manualRecord;
        const isBiometricPresent = r.status === "Present" || (r.firstCheckIn && r.firstCheckIn !== null);

        let entryType = "ABSENT";
        let resolvedStatus = "Absent";

        if (hasManual) {
          resolvedStatus = manualRecord.status || "Present";
          entryType = "HR_VERIFIED";
        } else if (isBiometricPresent) {
          // Biometric punch exists, but NO manual HR entry made
          resolvedStatus = "Absent";
          entryType = "BIOMETRIC_WITHOUT_HR";
        } else {
          resolvedStatus = r.status || "Absent";
          entryType = "ABSENT";
        }

        let inTime = r.firstCheckIn ? moment(r.firstCheckIn).format("hh:mm A") : "—";
        let outTime = r.lastCheckOut ? moment(r.lastCheckOut).format("hh:mm A") : "—";

        const empName = emp
          ? [emp.firstName, (emp.middleName && emp.middleName !== '-') ? emp.middleName : '', emp.lastName].filter(Boolean).join(' ') || emp.employeeCode
          : (manualRecord ? manualRecord.empName : "");

        recordMap.set(key, {
          ticketNo: emp ? emp.employeeCode : (manualRecord ? manualRecord.ticketNo : ""),
          employeeName: empName,
          department: deptName,
          deptId: deptId ? parseInt(deptId) : null,
          date: r.attendanceDate,
          shift: shiftName,
          status: resolvedStatus,
          entryType: entryType, // 'HR_VERIFIED' | 'BIOMETRIC_WITHOUT_HR' | 'ABSENT'
          isHrVerified: hasManual,
          inTime: inTime,
          outTime: outTime
        });
      });

      // Overlay/Add all DepartmentAttendance records (especially when no Attendance row exists for that day!)
      manualRecords.forEach(mr => {
        const key = `${mr.employeeId}_${mr.attendanceDate}`;
        if (!recordMap.has(key)) {
          const emp = mr.employee;
          const deptId = mr.workedDeptId || mr.departmentId || (emp ? emp.departmentId : null);
          const deptName = (mr.workedDepartment ? mr.workedDepartment.departmentname : null)
            || (mr.department ? mr.department.departmentname : null)
            || deptMap[deptId]
            || "General";
          const shiftName = mr.shiftName || shiftMap[mr.shiftId] || "General";
          const empName = emp
            ? [emp.firstName, (emp.middleName && emp.middleName !== '-') ? emp.middleName : '', emp.lastName].filter(Boolean).join(' ') || emp.employeeCode
            : (mr.empName || "");

          recordMap.set(key, {
            ticketNo: mr.ticketNo || (emp ? emp.employeeCode : ""),
            employeeName: empName,
            department: deptName,
            deptId: deptId ? parseInt(deptId) : null,
            date: mr.attendanceDate,
            shift: shiftName,
            status: mr.status || "Present",
            entryType: "HR_VERIFIED",
            isHrVerified: true,
            inTime: "—",
            outTime: "—"
          });
        }
      });

      // Filter by reconciled department (if specific departments were passed)
      let mergedList = Array.from(recordMap.values());
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        mergedList = mergedList.filter(r => r.deptId && deptIdSet.has(r.deptId));
      }

      // Sort by date DESC, then ticketNo ASC
      mergedList.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return String(a.ticketNo).localeCompare(String(b.ticketNo), undefined, { numeric: true });
      });

      // If Abstract report is requested, aggregate by shift
      if (reportType === "Attendance Shift Wise Abstract") {
        const pivotMap = {};
        mergedList.forEach(r => {
          let shiftName = r.shift || "General";
          if (!pivotMap[shiftName]) {
            pivotMap[shiftName] = { shift: shiftName, present: 0, absent: 0, leave: 0 };
          }
          const status = String(r.status || "").toLowerCase();
          if (r.entryType === "HR_VERIFIED" && (status === "present" || status === "pr" || status === "present with permission" || status === "half day" || status === "p")) {
            pivotMap[shiftName].present += 1;
          } else if (status === "leave" || status === "lv" || status === "l" || status === "holiday" || status === "week off") {
            pivotMap[shiftName].leave += 1;
          } else {
            pivotMap[shiftName].absent += 1;
          }
        });

        return res.status(200).json({
          success: true,
          data: Object.values(pivotMap)
        });
      }

      // Remove temporary deptId field before sending
      const finalData = mergedList.map(({ deptId, ...rest }) => rest);

      return res.status(200).json({
        success: true,
        data: finalData
      });
    } catch (err) {
      console.error("Error generating department attendance report:", err);
      return res.status(500).json({ error: "Failed to generate report", message: err.message });
    }
  },

  generateDepartmentOvertimeReport: async (req, res) => {
    const { fromDate, toDate, departments, shift, companyId } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "fromDate and toDate are required" });
    }

    try {
      const { OTHours, Employee, Department, ShiftType } = require("../models");
      const moment = require("moment");

      const whereClause = {
        date: {
          [Op.between]: [moment(fromDate).startOf("day").toDate(), moment(toDate).endOf("day").toDate()]
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      if (Array.isArray(departments) && departments.length > 0) {
        whereClause[Op.or] = [
          { workedDeptId: { [Op.in]: departments } },
          { workedDeptId: null, departmentId: { [Op.in]: departments } }
        ];
      }

      if (shift) {
        whereClause.shiftId = parseInt(shift);
      }

      const records = await OTHours.findAll({
        where: whereClause,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "employeeCode", "firstName", "middleName", "lastName"]
          },
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname"]
          },
          {
            model: Department,
            as: "workedDepartment",
            attributes: ["id", "departmentname"],
            required: false
          },
          {
            model: ShiftType,
            as: "shift",
            attributes: ["id", "name"]
          }
        ],
        order: [["date", "DESC"], ["id", "ASC"]]
      });

      const formatted = records.map(r => {
        const emp = r.employee;
        const sh = r.shift;
        const resolvedDeptId = r.workedDeptId || r.departmentId;
        const deptName = (r.workedDepartment ? r.workedDepartment.departmentname : null)
          || (r.department ? r.department.departmentname : "General");

        const empName = emp
          ? [emp.firstName, (emp.middleName && emp.middleName !== '-') ? emp.middleName : '', emp.lastName].filter(Boolean).join(' ') || emp.employeeCode
          : (r.empName || "");

        return {
          ticketNo: emp ? emp.employeeCode : (r.ticketNo || ""),
          employeeName: empName,
          department: deptName,
          deptId: resolvedDeptId ? parseInt(resolvedDeptId) : null,
          date: moment(r.date).format("YYYY-MM-DD"),
          shift: sh ? sh.name : "General",
          otHours: r.otHours,
          remarks: r.remarks || "—"
        };
      });

      // Filter post-reconciliation to only include records whose resolved department matches the filters (if filtered)
      let filteredData = formatted;
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        filteredData = formatted.filter(r => r.deptId && deptIdSet.has(r.deptId));
      }

      const finalData = filteredData.map(({ deptId, ...rest }) => rest);

      return res.status(200).json({
        success: true,
        data: finalData
      });
    } catch (err) {
      console.error("Error generating department overtime report:", err);
      return res.status(500).json({ error: "Failed to generate overtime report", message: err.message });
    }
  },

  generateDepartmentOvertimeHoursWiseReport: async (req, res) => {
    const { fromDate, toDate, departments, shift, companyId } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "fromDate and toDate are required" });
    }

    try {
      const { OTHours } = require("../models");
      const moment = require("moment");

      const whereClause = {
        date: {
          [Op.between]: [moment(fromDate).startOf("day").toDate(), moment(toDate).endOf("day").toDate()]
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      if (Array.isArray(departments) && departments.length > 0) {
        whereClause[Op.or] = [
          { workedDeptId: { [Op.in]: departments } },
          { workedDeptId: null, departmentId: { [Op.in]: departments } }
        ];
      }

      if (shift) {
        whereClause.shiftId = parseInt(shift);
      }

      const records = await OTHours.findAll({
        where: whereClause,
        attributes: [
          "otHours",
          [Sequelize.fn("COUNT", Sequelize.fn("DISTINCT", Sequelize.col("employeeId"))), "numEmployees"]
        ],
        group: ["otHours"],
        order: [["otHours", "ASC"]],
        raw: true
      });

      const formatted = records.map(r => {
        const hours = parseFloat(r.otHours);
        return {
          otHours: hours === 1 ? "1 Hour" : `${hours} Hours`,
          numEmployees: parseInt(r.numEmployees)
        };
      });

      return res.status(200).json({
        success: true,
        data: formatted
      });
    } catch (err) {
      console.error("Error generating hours wise overtime report:", err);
      return res.status(500).json({ error: "Failed to generate hours wise overtime report", message: err.message });
    }
  },

  generateDepartmentOvertimeDayWiseReport: async (req, res) => {
    const { fromDate, toDate, departments, shift, companyId } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "fromDate and toDate are required" });
    }

    try {
      const { OTHours, Employee, Department } = require("../models");
      const moment = require("moment");

      const whereClause = {
        date: {
          [Op.between]: [moment(fromDate).startOf("day").toDate(), moment(toDate).endOf("day").toDate()]
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      if (Array.isArray(departments) && departments.length > 0) {
        whereClause[Op.or] = [
          { workedDeptId: { [Op.in]: departments } },
          { workedDeptId: null, departmentId: { [Op.in]: departments } }
        ];
      }

      if (shift) {
        whereClause.shiftId = parseInt(shift);
      }

      const records = await OTHours.findAll({
        where: whereClause,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "employeeCode", "firstName", "middleName", "lastName"]
          },
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname"]
          },
          {
            model: Department,
            as: "workedDepartment",
            attributes: ["id", "departmentname"],
            required: false
          }
        ],
        order: [["date", "ASC"], ["id", "ASC"]]
      });

      const formatted = records.map(r => {
        const emp = r.employee;
        const resolvedDeptId = r.workedDeptId || r.departmentId;
        const deptName = (r.workedDepartment ? r.workedDepartment.departmentname : null)
          || (r.department ? r.department.departmentname : "General");

        const empName = emp
          ? [emp.firstName, (emp.middleName && emp.middleName !== '-') ? emp.middleName : '', emp.lastName].filter(Boolean).join(' ') || emp.employeeCode
          : (r.empName || "");

        return {
          date: moment(r.date).format("DD-MMM-YYYY"),
          employeeName: empName,
          department: deptName,
          deptId: resolvedDeptId ? parseInt(resolvedDeptId) : null,
          otHours: r.otHours
        };
      });

      // Filter post-reconciliation to only include records whose resolved department matches the filters (if filtered)
      let filteredData = formatted;
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        filteredData = formatted.filter(r => r.deptId && deptIdSet.has(r.deptId));
      }

      const finalData = filteredData.map(({ deptId, ...rest }) => rest);

      return res.status(200).json({
        success: true,
        data: finalData
      });
    } catch (err) {
      console.error("Error generating day wise overtime report:", err);
      return res.status(500).json({ error: "Failed to generate day wise overtime report", message: err.message });
    }
  },

  generateDepartmentOvertimeAbstractReport: async (req, res) => {
    const { fromDate, toDate, departments, shift, companyId } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "fromDate and toDate are required" });
    }

    try {
      const { OTHours, Department } = require("../models");
      const moment = require("moment");

      const whereClause = {
        date: {
          [Op.between]: [moment(fromDate).startOf("day").toDate(), moment(toDate).endOf("day").toDate()]
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      if (Array.isArray(departments) && departments.length > 0) {
        whereClause[Op.or] = [
          { workedDeptId: { [Op.in]: departments } },
          { workedDeptId: null, departmentId: { [Op.in]: departments } }
        ];
      }

      if (shift) {
        whereClause.shiftId = parseInt(shift);
      }

      const records = await OTHours.findAll({
        where: whereClause,
        attributes: [
          "departmentId",
          "workedDeptId",
          [Sequelize.fn("COUNT", Sequelize.fn("DISTINCT", Sequelize.col("employeeId"))), "employees"],
          [Sequelize.fn("SUM", Sequelize.col("otHours")), "totalOtHours"]
        ],
        group: ["workedDeptId", "departmentId"],
        raw: true
      });

      // Map department names in memory to bypass ONLY_FULL_GROUP_BY issues
      const allDepts = await Department.findAll({ raw: true });
      const deptMap = {};
      allDepts.forEach(d => {
        deptMap[d.id] = d.departmentname;
      });

      const abstractMap = {};
      records.forEach(r => {
        const resolvedDeptId = r.workedDeptId || r.departmentId;
        const deptName = deptMap[resolvedDeptId] || "General";

        if (!abstractMap[deptName]) {
          abstractMap[deptName] = {
            department: deptName,
            deptId: resolvedDeptId,
            employees: 0,
            totalOtHours: 0
          };
        }
        abstractMap[deptName].employees += parseInt(r.employees || 0);
        abstractMap[deptName].totalOtHours += parseFloat(r.totalOtHours || 0);
      });

      // Filter post-reconciliation to only include records whose resolved department matches the filters (if filtered)
      let formatted = Object.values(abstractMap);
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        formatted = formatted.filter(r => r.deptId && deptIdSet.has(r.deptId));
      }

      const finalData = formatted.map(({ deptId, ...rest }) => rest);

      return res.status(200).json({
        success: true,
        data: finalData
      });
    } catch (err) {
      console.error("Error generating abstract overtime report:", err);
      return res.status(500).json({ error: "Failed to generate abstract overtime report", message: err.message });
    }
  },
};