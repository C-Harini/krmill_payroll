const { Op, Sequelize } = require("sequelize");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const REPORT_FIELDS = [
  {
    key: "curEmployeeCode",
    label: "Current Employee Code",
    type: "string",
    category: "Basic Information",
    dbField: "curEmployeeCode",
  },
  {
    key: "newEmployeeCode",
    label: "New Employee Code",
    type: "string",
    category: "Basic Information",
    dbField: "newEmployeeCode",
  },
  {
    key: "employeeCode",
    label: "Employee Code",
    type: "string",
    category: "Basic Information",
    dbField: "curEmployeeCode",
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
    key: "curBiometricEnrollmentId",
    label: "Current Biometric ID",
    type: "string",
    category: "Shift & Attendance",
    dbField: "curBiometricEnrollmentId",
  },
  {
    key: "newBiometricEnrollmentId",
    label: "New Biometric ID",
    type: "string",
    category: "Shift & Attendance",
    dbField: "newBiometricEnrollmentId",
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
      attributes: ["id", "firstName", "lastName", "curEmployeeCode"],
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
    order: [["curEmployeeCode", "ASC"]],
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
      const { Attendance, Employee, Department, ShiftType, DepartmentAttendance, BiometricPunch, Category, Company } = require("../models");
      const moment = require("moment");

      // Fetch company name
      let companyName = "Test Company";
      if (companyId) {
        const comp = await Company.findByPk(companyId);
        if (comp && (comp.name || comp.companyname)) companyName = comp.name || comp.companyname;
      }

      // Fetch shift name mappings in memory
      const allShifts = await ShiftType.findAll({ raw: true });
      const shiftMap = {};
      allShifts.forEach(s => {
        shiftMap[s.id] = s.name;
      });

      // Fetch department mappings in memory
      const allDepts = await Department.findAll({ raw: true });
      const deptMap = {};
      const deptAcronymMap = {};
      allDepts.forEach(d => {
        deptMap[d.id] = d.departmentname;
        deptAcronymMap[d.id] = d.acronym || d.departmentname;
      });

      // Helper: resolve category code (e.g. O, H, MIX, S-PF, S)
      const resolveCategoryCode = (emp) => {
        if (!emp) return "O";
        const catName = String(emp.category?.categoryName || "").toUpperCase();
        const catCode = String(emp.category?.categoryCode || "").toUpperCase();
        if (catName.includes("HOSTEL") || catCode.includes("HOSTEL") || emp.isHostel) return "H";
        if (catName.includes("MIX") || catCode.includes("MIX")) return "MIX";
        if (catName.includes("OTHER") || catCode.includes("OTHER")) return "O";
        if (catName.includes("STAFF") || emp.employeeType === "Staff") {
          return emp.epfNumber || emp.providentFundNumber ? "S-PF" : "S";
        }
        if (emp.category?.categoryCode) return emp.category.categoryCode;
        if (emp.category?.categoryName) return emp.category.categoryName.charAt(0);
        return "O";
      };

      const calculateDays = (status) => {
        const s = String(status || "").toLowerCase().trim();
        if (s.includes("half") || s === "p/l" || s.includes("0.5")) return 0.5;
        if (s.includes("present") || s === "p" || s === "pr") return 1.0;
        return 0.0;
      };

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
      if (shift && reportType !== "Attendance Shift Wise Abstract") {
        manualWhere.shiftId = parseInt(shift);
      }

      const manualRecords = await DepartmentAttendance.findAll({
        where: manualWhere,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: [
              "id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName",
              "departmentId", "shiftTypeId", "categoryId", "workingType", "employeeType",
              "epfNumber", "providentFundNumber", "isHostel", "dateOfJoining"
            ],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "categoryName", "categoryCode"],
                required: false
              }
            ],
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

      if (shift && reportType !== "Attendance Shift Wise Abstract") {
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
            attributes: [
              "id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName",
              "departmentId", "shiftTypeId", "categoryId", "workingType", "employeeType",
              "epfNumber", "providentFundNumber", "isHostel", "dateOfJoining"
            ],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "categoryName", "categoryCode"],
                required: false
              }
            ],
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
          resolvedStatus = "Absent";
          entryType = "BIOMETRIC_WITHOUT_HR";
        } else {
          resolvedStatus = r.status || "Absent";
          entryType = "ABSENT";
        }

        let inTime = r.firstCheckIn ? moment(r.firstCheckIn).format("hh:mm A") : "—";
        let outTime = r.lastCheckOut ? moment(r.lastCheckOut).format("hh:mm A") : "—";

        const rawName = (emp ? (emp.firstName || "") : (manualRecord ? manualRecord.empName : "")).trim();
        const cleanName = rawName.toUpperCase();

        const empCodeStr = (emp ? (emp.curEmployeeCode || emp.newEmployeeCode) : "") || (manualRecord ? manualRecord.ticketNo : "") || r.ticketNo || "";
        const catCode = resolveCategoryCode(emp);
        const days = calculateDays(resolvedStatus);

        const rawDoj = emp?.dateOfJoining ? moment(emp.dateOfJoining).format("DD-MM-YYYY") : "";
        recordMap.set(key, {
          employeeId: r.employeeId,
          ticketNo: empCodeStr,
          curEmployeeCode: emp?.curEmployeeCode || "",
          newEmployeeCode: emp?.newEmployeeCode || "",
          employeeName: cleanName,
          department: deptName,
          deptId: deptId ? parseInt(deptId) : null,
          deptAcronym: deptAcronymMap[deptId] || deptName,
          doj: rawDoj,
          date: r.attendanceDate,
          shift: shiftName,
          category: catCode,
          days: days,
          status: resolvedStatus,
          entryType: entryType,
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
          const rawName = (emp ? (emp.firstName || "") : (mr.empName || "")).trim();
          const cleanName = rawName.toUpperCase();

          const empCodeStr = (emp ? (emp.curEmployeeCode || emp.newEmployeeCode) : "") || mr.ticketNo || "";
          const catCode = resolveCategoryCode(emp);
          const days = calculateDays(mr.status || "Present");
          const rawDoj = emp?.dateOfJoining ? moment(emp.dateOfJoining).format("DD-MM-YYYY") : "";

          recordMap.set(key, {
            employeeId: mr.employeeId,
            ticketNo: mr.ticketNo || empCodeStr || "",
            curEmployeeCode: emp?.curEmployeeCode || "",
            newEmployeeCode: emp?.newEmployeeCode || "",
            employeeName: cleanName,
            department: deptName,
            deptId: deptId ? parseInt(deptId) : null,
            deptAcronym: deptAcronymMap[deptId] || deptName,
            doj: rawDoj,
            date: mr.attendanceDate,
            shift: shiftName,
            category: catCode,
            days: days,
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

      // If Abstract report is requested, replicate the 11-column Shift wise Abstract format
      if (reportType === "Attendance Shift Wise Abstract") {
        let targetShiftName = "ALL";
        if (shift) {
          const found = allShifts.find(s => String(s.id) === String(shift));
          if (found && found.name) targetShiftName = found.name;
        }

        const empMap = new Map();
        mergedList.forEach(r => {
          const isAbsent = String(r.status || "").toLowerCase().includes("absent") || r.entryType === "ABSENT";
          if (r.days <= 0 && !isAbsent) return;

          const empIdKey = r.employeeId || r.ticketNo || r.employeeName;
          if (!empMap.has(empIdKey)) {
            empMap.set(empIdKey, {
              employeeId: r.employeeId,
              ticketNo: r.ticketNo,
              employeeName: r.employeeName,
              department: r.department,
              deptId: r.deptId,
              deptAcronym: r.deptAcronym || deptAcronymMap[r.deptId] || r.department,
              doj: r.doj || "",
              category: r.category || "O",
              shiftA: 0,
              shiftB: 0,
              shiftC: 0,
              absDays: 0,
              totalDays: 0
            });
          }

          const empRecord = empMap.get(empIdKey);
          if (!empRecord.category && r.category) empRecord.category = r.category;
          if (!empRecord.doj && r.doj) empRecord.doj = r.doj;

          let shiftLetter = "A";
          const sUpper = String(r.shift || "").toUpperCase();
          if (sUpper.includes("B")) shiftLetter = "B";
          else if (sUpper.includes("C")) shiftLetter = "C";
          else if (sUpper.includes("A")) shiftLetter = "A";
          else shiftLetter = sUpper.charAt(0) || "A";

          if (r.days > 0) {
            if (shiftLetter === "B") {
              empRecord.shiftB = Math.round((empRecord.shiftB + r.days) * 10) / 10;
            } else if (shiftLetter === "C") {
              empRecord.shiftC = Math.round((empRecord.shiftC + r.days) * 10) / 10;
            } else {
              empRecord.shiftA = Math.round((empRecord.shiftA + r.days) * 10) / 10;
            }
            empRecord.totalDays = Math.round((empRecord.totalDays + r.days) * 10) / 10;
          }
        });

        // Compute Abs = selected duration - (a + b + c days). If <= 0, then 0 (which displays as "-")
        const durationDays = Math.max(1, moment(toDate).startOf("day").diff(moment(fromDate).startOf("day"), "days") + 1);
        empMap.forEach(empRecord => {
          const workedDays = Math.round((empRecord.shiftA + empRecord.shiftB + empRecord.shiftC) * 10) / 10;
          empRecord.totalDays = workedDays;
          const calculatedAbs = Math.round((durationDays - workedDays) * 10) / 10;
          empRecord.absDays = calculatedAbs > 0 ? calculatedAbs : 0;
        });

        const allEmps = Array.from(empMap.values()).filter(e => e.totalDays > 0 || e.absDays > 0);

        const deptGroupMap = {};
        allEmps.forEach(emp => {
          const groupKey = (emp.deptAcronym || emp.department || "General").trim();
          if (!deptGroupMap[groupKey]) {
            deptGroupMap[groupKey] = {
              deptAcronym: emp.deptAcronym || groupKey,
              department: emp.department,
              employees: []
            };
          }
          deptGroupMap[groupKey].employees.push(emp);
        });

        const sortedDeptKeys = Object.keys(deptGroupMap).sort((a, b) => a.localeCompare(b));
        const flatRows = [];
        let runningSlNo = 1;
        let grandShiftA = 0;
        let grandShiftB = 0;
        let grandShiftC = 0;
        let grandAbsDays = 0;
        let grandTotalDays = 0;

        sortedDeptKeys.forEach(grpKey => {
          const grp = deptGroupMap[grpKey];
          // Sort employees within department strictly in alphabetical order by first name
          grp.employees.sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName)));

          flatRows.push({
            isDeptHeader: true,
            department: grp.department,
            deptAcronym: grp.deptAcronym || grpKey
          });

          let deptShiftA = 0;
          let deptShiftB = 0;
          let deptShiftC = 0;
          let deptAbsDays = 0;
          let deptTotalDays = 0;

          grp.employees.forEach(emp => {
            const currentSlNo = runningSlNo++;
            deptShiftA = Math.round((deptShiftA + emp.shiftA) * 10) / 10;
            deptShiftB = Math.round((deptShiftB + emp.shiftB) * 10) / 10;
            deptShiftC = Math.round((deptShiftC + emp.shiftC) * 10) / 10;
            deptAbsDays = Math.round((deptAbsDays + emp.absDays) * 10) / 10;
            deptTotalDays = Math.round((deptTotalDays + emp.totalDays) * 10) / 10;

            flatRows.push({
              isEmployeeRow: true,
              slNo: currentSlNo,
              ...emp
            });
          });

          flatRows.push({
            isDeptSubtotal: true,
            department: grp.department,
            deptAcronym: grp.deptAcronym || grpKey,
            shiftA: deptShiftA,
            shiftB: deptShiftB,
            shiftC: deptShiftC,
            absDays: deptAbsDays,
            totalDays: deptTotalDays
          });

          grandShiftA = Math.round((grandShiftA + deptShiftA) * 10) / 10;
          grandShiftB = Math.round((grandShiftB + deptShiftB) * 10) / 10;
          grandShiftC = Math.round((grandShiftC + deptShiftC) * 10) / 10;
          grandAbsDays = Math.round((grandAbsDays + deptAbsDays) * 10) / 10;
          grandTotalDays = Math.round((grandTotalDays + deptTotalDays) * 10) / 10;
        });

        const grandTotals = {
          shiftA: grandShiftA,
          shiftB: grandShiftB,
          shiftC: grandShiftC,
          absDays: grandAbsDays,
          totalDays: grandTotalDays
        };

        return res.status(200).json({
          success: true,
          companyName,
          reportTitle: "Attendance Shift wise Abstract",
          shiftName: targetShiftName,
          fromDate: moment(fromDate).format("DD-MM-YYYY"),
          toDate: moment(toDate).format("DD-MM-YYYY"),
          totalEmployees: runningSlNo - 1,
          grandTotals,
          grandTotalDays: grandTotals.totalDays,
          flatRows,
          data: flatRows
        });
      }

      // 3. Attendance Shift Wise Detail report format
      if (reportType === "Attendance Shift Wise Detail") {
        const dayCols = [];
        for (let d = 1; d <= 31; d++) {
          dayCols.push(String(d).padStart(2, "0"));
        }

        const activeRecords = mergedList.filter(r => r.days > 0);

        const empMap = new Map();
        activeRecords.forEach(r => {
          const empIdKey = r.employeeId || r.ticketNo || r.employeeName;
          if (!empMap.has(empIdKey)) {
            empMap.set(empIdKey, {
              employeeId: r.employeeId,
              ticketNo: r.ticketNo,
              employeeName: r.employeeName,
              department: r.department,
              deptId: r.deptId,
              deptAcronym: r.deptAcronym || deptAcronymMap[r.deptId] || r.department,
              doj: r.doj || "",
              dailyShifts: {},
              shiftA: 0,
              shiftB: 0,
              shiftC: 0,
              totalDays: 0
            });
          }

          const empRecord = empMap.get(empIdKey);
          const dayNum = moment(r.date).format("DD");

          let shiftLetter = "A";
          const sUpper = String(r.shift || "").toUpperCase();
          if (sUpper.includes("B")) shiftLetter = "B";
          else if (sUpper.includes("C")) shiftLetter = "C";
          else if (sUpper.includes("A")) shiftLetter = "A";
          else shiftLetter = sUpper.charAt(0) || "A";

          if (r.days === 0.5) {
            shiftLetter = "0.5";
          }
          empRecord.dailyShifts[dayNum] = shiftLetter;

          if (shiftLetter === "B") {
            empRecord.shiftB = Math.round((empRecord.shiftB + r.days) * 10) / 10;
          } else if (shiftLetter === "C") {
            empRecord.shiftC = Math.round((empRecord.shiftC + r.days) * 10) / 10;
          } else {
            empRecord.shiftA = Math.round((empRecord.shiftA + r.days) * 10) / 10;
          }
          empRecord.totalDays = Math.round((empRecord.totalDays + r.days) * 10) / 10;
        });

        const allEmps = Array.from(empMap.values());

        const deptGroupMap = {};
        allEmps.forEach(emp => {
          const groupKey = (emp.deptAcronym || emp.department || "General").trim();
          if (!deptGroupMap[groupKey]) {
            deptGroupMap[groupKey] = {
              deptAcronym: emp.deptAcronym,
              department: emp.department,
              employees: []
            };
          }
          deptGroupMap[groupKey].employees.push(emp);
        });

        const sortedDeptKeys = Object.keys(deptGroupMap).sort((a, b) => a.localeCompare(b));
        const flatRows = [];
        let grandTotalDays = 0;
        let totalEmployees = 0;

        sortedDeptKeys.forEach(grpKey => {
          const grp = deptGroupMap[grpKey];
          grp.employees.sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName)));

          flatRows.push({
            isDeptHeader: true,
            department: grp.department,
            deptAcronym: grp.deptAcronym || grpKey
          });

          grp.employees.forEach(emp => {
            totalEmployees += 1;
            grandTotalDays = Math.round((grandTotalDays + emp.totalDays) * 10) / 10;
            flatRows.push({
              isEmployeeRow: true,
              ...emp
            });
          });
        });

        let targetShiftName = "ALL";
        if (shift) {
          const found = allShifts.find(s => String(s.id) === String(shift));
          if (found) targetShiftName = found.name;
        }

        return res.status(200).json({
          success: true,
          reportTitle: "Shift wise Attendance Detail",
          shiftName: targetShiftName,
          fromDate: moment(fromDate).format("DD-MM-YYYY"),
          toDate: moment(toDate).format("DD-MM-YYYY"),
          dayCols,
          totalEmployees,
          grandTotalDays,
          flatRows,
          data: flatRows
        });
      }

      // 4. Department Attendance report format
      // Filter out records where days <= 0 (absent/leave)
      const validRecords = mergedList.filter(r => r.days > 0);

      const mixRecords = validRecords.filter(r => r.category === "MIX");
      const regularRecords = validRecords.filter(r => r.category !== "MIX");

      const processRecords = (recordsList) => {
        const deptGroups = {};
        recordsList.forEach(r => {
          const dName = (r.department || "General").toUpperCase().trim();
          if (!deptGroups[dName]) {
            deptGroups[dName] = [];
          }
          deptGroups[dName].push(r);
        });

        const sortedDeptNames = Object.keys(deptGroups).sort((a, b) => a.localeCompare(b));
        let total = 0;
        let countEmps = 0;
        const rows = [];

        sortedDeptNames.forEach(dName => {
          const emps = deptGroups[dName];
          emps.sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName)));

          let deptTotal = 0;
          const count = emps.length;

          emps.forEach((e, idx) => {
            deptTotal = Math.round((deptTotal + e.days) * 100) / 100;
            countEmps += 1;
            rows.push({
              ...e,
              department: dName,
              isFirstInDept: idx === 0,
              deptCount: count,
              empSlNo: idx + 1
            });
          });

          // Department subtotal row
          rows.push({
            isDeptSubtotal: true,
            department: dName,
            deptTotalDays: deptTotal
          });

          total = Math.round((total + deptTotal) * 100) / 100;
        });

        return { rows, total, countEmps };
      };

      let grandTotalDays = 0;
      let totalEmployees = 0;
      const flatRows = [];

      if (mixRecords.length > 0) {
        // Group 1: Regular records
        const regularProcessed = processRecords(regularRecords);
        flatRows.push(...regularProcessed.rows);
        flatRows.push({
          isGroupSubtotal: true,
          groupName: "REGULAR",
          groupTotalDays: regularProcessed.total
        });

        // Group 2: MIX records
        const mixProcessed = processRecords(mixRecords);
        flatRows.push(...mixProcessed.rows);
        flatRows.push({
          isGroupSubtotal: true,
          groupName: "MIX",
          groupTotalDays: mixProcessed.total
        });

        totalEmployees = regularProcessed.countEmps + mixProcessed.countEmps;
        grandTotalDays = Math.round((regularProcessed.total + mixProcessed.total) * 100) / 100;
      } else {
        const allProcessed = processRecords(validRecords);
        flatRows.push(...allProcessed.rows);
        totalEmployees = allProcessed.countEmps;
        grandTotalDays = allProcessed.total;
      }

      let targetShiftName = "ALL";
      if (shift) {
        const found = allShifts.find(s => String(s.id) === String(shift));
        if (found) targetShiftName = found.name;
      }

      return res.status(200).json({
        success: true,
        companyName,
        reportTitle: "Attendance Report for Production",
        shiftName: targetShiftName,
        fromDate: moment(fromDate).format("DD-MM-YYYY"),
        toDate: moment(toDate).format("DD-MM-YYYY"),
        totalEmployees,
        grandTotalDays,
        flatRows,
        data: flatRows
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
      const { OTHours, Employee, Department, ShiftType, Company } = require("../models");
      const moment = require("moment");

      let companyName = "Test Company";
      if (companyId) {
        const comp = await Company.findByPk(companyId);
        if (comp && (comp.name || comp.companyname)) companyName = comp.name || comp.companyname;
      }

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
            attributes: ["id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName"],
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
          ? (emp.firstName || emp.employeeCode)
          : (r.empName || "");

        const empCodeStr = emp ? (emp.newEmployeeCode ? `${emp.curEmployeeCode || ''} / ${emp.newEmployeeCode}` : (emp.curEmployeeCode || emp.employeeCode)) : "";
        return {
          ticketNo: empCodeStr || (r.ticketNo || ""),
          curEmployeeCode: emp?.curEmployeeCode || "",
          newEmployeeCode: emp?.newEmployeeCode || "",
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
        companyName,
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
      const { OTHours, Employee, Department, ShiftType, Attendance, BiometricPunch, Category, Company } = require("../models");
      const moment = require("moment");

      let companyName = "Test Company";
      if (companyId) {
        const comp = await Company.findByPk(companyId);
        if (comp && (comp.name || comp.companyname)) companyName = comp.name || comp.companyname;
      }

      // 1. Build query for OTHours
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
            attributes: [
              "id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName",
              "departmentId", "categoryId", "workingType", "employeeType", "epfNumber", "providentFundNumber", "isHostel"
            ],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "categoryName", "categoryCode"],
                required: false
              }
            ],
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
            as: "shift",
            attributes: ["id", "name", "startTime", "endTime"],
            required: false
          }
        ],
        order: [["date", "ASC"], ["id", "ASC"]]
      });

      // Filter post-reconciliation if departments array was passed
      let filteredRecords = records;
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        filteredRecords = records.filter(r => {
          const resolvedDeptId = r.workedDeptId || r.departmentId;
          return resolvedDeptId && deptIdSet.has(parseInt(resolvedDeptId));
        });
      }

      // 2. Fetch original biometric punch out times from Attendance and BiometricPunch
      const empIds = Array.from(new Set(filteredRecords.map(r => r.employeeId).filter(Boolean)));
      const attMap = {};
      const punchMap = {};

      if (empIds.length > 0) {
        const attRecords = await Attendance.findAll({
          where: {
            employeeId: { [Op.in]: empIds },
            attendanceDate: { [Op.between]: [fromDate, toDate] }
          },
          attributes: ["employeeId", "attendanceDate", "lastCheckOut"]
        });
        attRecords.forEach(a => {
          const k = `${a.employeeId}_${moment(a.attendanceDate).format("YYYY-MM-DD")}`;
          if (a.lastCheckOut) attMap[k] = a.lastCheckOut;
        });

        const punches = await BiometricPunch.findAll({
          where: {
            employeeId: { [Op.in]: empIds },
            punchDate: { [Op.between]: [fromDate, toDate] }
          },
          order: [["punchTime", "DESC"]],
          attributes: ["employeeId", "punchDate", "punchTime", "punchType"]
        });
        punches.forEach(p => {
          const k = `${p.employeeId}_${moment(p.punchDate).format("YYYY-MM-DD")}`;
          if (!punchMap[k] && p.punchTime) {
            punchMap[k] = p.punchTime;
          }
        });
      }

      // Helper: resolve category code (e.g. O, H, S-PF)
      const resolveCategoryCode = (emp) => {
        if (!emp) return "";
        const catName = String(emp.category?.categoryName || "").toUpperCase();
        if (catName.includes("HOSTEL") || emp.isHostel) return "H";
        if (catName.includes("OTHER")) return "O";
        if (catName.includes("STAFF") || emp.employeeType === "Staff") {
          return emp.epfNumber || emp.providentFundNumber ? "S-PF" : "S";
        }
        if (emp.category?.categoryCode) return emp.category.categoryCode;
        if (emp.category?.categoryName) return emp.category.categoryName.charAt(0);
        return "";
      };

      // Preload all shifts for reliable endTime lookup
      const allShifts = await ShiftType.findAll({ raw: true });
      const shiftMapById = {};
      const shiftMapByName = {};
      allShifts.forEach(s => {
        shiftMapById[s.id] = s;
        shiftMapByName[String(s.name).toUpperCase().trim()] = s;
      });

      const parseTime = (val) => {
        if (!val) return null;
        const s = String(val).trim();
        if (/^\d{2}:\d{2}\.\d$/.test(s)) return null;

        const formats = [
          moment.ISO_8601,
          "YYYY-MM-DDTHH:mm",
          "YYYY-MM-DDTHH:mm:ss",
          "YYYY-MM-DD HH:mm:ss",
          "YYYY-MM-DD HH:mm",
          "DD-MM-YYYY HH:mm",
          "DD-MM-YYYY HH:mm:ss",
          "YYYY-MM-DD h:mm A",
          "YYYY-MM-DD hh:mm A",
          "HH:mm:ss",
          "HH:mm",
          "h:mm A",
          "hh:mm A",
          "h:mm a",
          "hh:mm a",
          "h:mmA",
          "hh:mmA",
          "h:mma",
          "hh:mma"
        ];

        const m = moment(s, formats, false);
        return m.isValid() ? m : null;
      };

      // Helper: calculate Overtime In and Out
      // 1) First priority: Use the actual FROM TIME and TO TIME selected during OT entry (Multiple Entry)
      // 2) Fallback: If not entered or legacy, calculate based on shift operational hours + OT hours
      const calculateOtTimes = (r, sh) => {
        let otIn = "";
        let otOut = "";

        const mFrom = parseTime(r.fromTime);
        const mTo = parseTime(r.toTime);

        if (mFrom) {
          otIn = mFrom.format("h:mmA");
        }
        if (mTo) {
          otOut = mTo.format("h:mmA");
        }

        const hrs = parseFloat(r.otHours) || 0;

        // If fromTime was entered but toTime was not, add otHours to fromTime
        if (mFrom && !otOut && hrs > 0) {
          otOut = mFrom.clone().add(Math.round(hrs * 60), "minutes").format("h:mmA");
        }

        // If no valid fromTime was entered, fallback based on shift:
        // - Shift A (08:00-16:30): Overtime starts at 16:30 (4:30PM)
        // - Shift B (16:30-01:00): Overtime performed during Shift B starts at 16:30 (4:30PM),
        //                          or 16:00 (4:00PM) for MIXING department
        // - Shift C (01:00-08:00): Overtime starts at 08:00 (8:00AM)
        if (!otIn) {
          let shiftObj = sh;
          if (!shiftObj && r.shiftId) shiftObj = shiftMapById[r.shiftId];
          if (!shiftObj && r.employee?.shiftTypeId) shiftObj = shiftMapById[r.employee.shiftTypeId];
          if (!shiftObj && r.shift?.name) shiftObj = shiftMapByName[String(r.shift.name).toUpperCase().trim()];

          let sName = (shiftObj?.name || r.shift?.name || "").toUpperCase().trim();
          if (!sName && (r.shiftId === 1 || r.shiftId === "1")) sName = "A";
          if (!sName && (r.shiftId === 2 || r.shiftId === "2")) sName = "B";
          if (!sName && (r.shiftId === 3 || r.shiftId === "3")) sName = "C";

          const deptName = String(
            (r.workedDepartment ? r.workedDepartment.departmentname : null) ||
            (r.department ? r.department.departmentname : "") ||
            ""
          ).toUpperCase().trim();

          let otStartTime = "16:30:00"; // Default for Shift A
          if (sName === "B" || sName.startsWith("B")) {
            // Shift B overtime starts at 16:30 (4:30PM), or 16:00 (4:00PM) for MIXING
            if (deptName.includes("MIXING")) {
              otStartTime = "16:00:00";
            } else {
              otStartTime = "16:30:00";
            }
          } else if (sName === "C" || sName.startsWith("C")) {
            // Shift C overtime starts at 08:00 (8:00AM)
            otStartTime = "08:00:00";
          } else if (sName === "A" || sName.startsWith("A")) {
            // Shift A overtime starts at 16:30 (4:30PM)
            otStartTime = "16:30:00";
          } else {
            // Staff / General or other shifts: use their defined endTime if available
            if (shiftObj && shiftObj.endTime && shiftObj.endTime !== "01:00:00") {
              otStartTime = shiftObj.endTime;
            } else {
              otStartTime = "16:30:00";
            }
          }

          const baseDate = moment(r.date).format("YYYY-MM-DD");
          const inMoment = moment(`${baseDate} ${otStartTime}`, [
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DD HH:mm",
            "YYYY-MM-DD h:mm A",
            "YYYY-MM-DD h:mm:ss A"
          ]);

          if (inMoment.isValid()) {
            otIn = inMoment.format("h:mmA");
            otOut = inMoment.clone().add(Math.round(hrs * 60), "minutes").format("h:mmA");
          } else {
            otIn = otStartTime;
            otOut = "";
          }
        }

        return { otIn, otOut };
      };

      // 3. Group records by Shift, then Worked Department
      const shiftGroups = {};
      filteredRecords.forEach(r => {
        let sName = (r.shift ? r.shift.name : "").toUpperCase().trim();
        if (!sName && r.shiftId && shiftMapById[r.shiftId]) {
          sName = String(shiftMapById[r.shiftId].name).toUpperCase().trim();
        }
        if (!sName && r.employee?.shiftTypeId && shiftMapById[r.employee.shiftTypeId]) {
          sName = String(shiftMapById[r.employee.shiftTypeId].name).toUpperCase().trim();
        }
        if (!sName) sName = "ALL";
        if (!shiftGroups[sName]) {
          shiftGroups[sName] = [];
        }
        shiftGroups[sName].push(r);
      });

      // Sort shift keys: A, B, C, then others
      const shiftSortOrder = ["A", "B", "C", "SUP_A", "SUP_B", "SUP_C", "STAFF_A", "STAFF_B", "STAFF_C", "GENERAL_A", "GENERAL_B"];
      const sortedShiftKeys = Object.keys(shiftGroups).sort((a, b) => {
        const idxA = shiftSortOrder.indexOf(a);
        const idxB = shiftSortOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      let empSlNoCounter = 1;
      let shiftSlNoCounter = 1;
      let grandTotalHrs = 0;
      const formattedShifts = [];
      const flatRows = [];

      sortedShiftKeys.forEach(shiftKey => {
        const recs = shiftGroups[shiftKey];
        let shiftTotalHrs = 0;
        const shiftRows = [];

        // Group by worked department
        const deptGroups = {};
        recs.forEach(r => {
          const deptName = (r.workedDepartment ? r.workedDepartment.departmentname : null) || (r.department ? r.department.departmentname : "General");
          if (!deptGroups[deptName]) {
            deptGroups[deptName] = [];
          }
          deptGroups[deptName].push(r);
        });

        // Add shift header entry into flatRows
        flatRows.push({
          isShiftHeader: true,
          shiftName: shiftKey
        });

        const currentShiftSlNo = shiftSlNoCounter++;
        let isFirstDeptInShift = true;

        Object.keys(deptGroups).forEach((deptName) => {
          const deptRecs = deptGroups[deptName];
          const currentDeptSlNo = isFirstDeptInShift ? currentShiftSlNo : "";
          isFirstDeptInShift = false;

          deptRecs.forEach((r, rIdx) => {
            const emp = r.employee;
            const code = (emp ? (emp.curEmployeeCode || emp.newEmployeeCode) : "") || r.ticketNo || "";
            const name = emp ? (emp.firstName || "").trim() : (r.empName || "");
            const hours = parseFloat(r.otHours) || 0;
            shiftTotalHrs = Math.round((shiftTotalHrs + hours) * 100) / 100;
            grandTotalHrs = Math.round((grandTotalHrs + hours) * 100) / 100;

            const shiftForOt = r.shift || shiftMapById[r.shiftId] || shiftMapById[r.employee?.shiftTypeId];
            const { otIn, otOut } = calculateOtTimes(r, shiftForOt);

            const attKey = `${r.employeeId}_${moment(r.date).format("YYYY-MM-DD")}`;
            let punchOut = "";
            if (attMap[attKey]) {
              punchOut = moment(attMap[attKey]).format("h:mmA");
            } else if (punchMap[attKey]) {
              const pVal = punchMap[attKey];
              punchOut = moment(pVal, ["YYYY-MM-DD HH:mm:ss", "HH:mm:ss", "HH:mm"]).isValid()
                ? moment(pVal, ["YYYY-MM-DD HH:mm:ss", "HH:mm:ss", "HH:mm"]).format("h:mmA")
                : String(pVal);
            }

            const categoryCode = resolveCategoryCode(emp);

            const rowData = {
              deptSlNo: rIdx === 0 ? currentDeptSlNo : "",
              department: rIdx === 0 ? deptName : "",
              deptCount: deptRecs.length,
              isFirstInDept: rIdx === 0,
              empSlNo: empSlNoCounter++,
              ticketNo: code,
              employeeName: name.toUpperCase(),
              shift: shiftKey,
              otIn,
              otOut,
              otHours: hours,
              punchOut,
              category: categoryCode
            };

            shiftRows.push(rowData);
            flatRows.push({ ...rowData, isDataRow: true });
          });
        });

        // Add Shift Subtotal row
        flatRows.push({
          isShiftSubtotal: true,
          shiftName: shiftKey,
          shiftTotalHrs
        });

        formattedShifts.push({
          shiftName: shiftKey,
          shiftTotalHrs,
          rows: shiftRows
        });
      });

      // Resolve report title
      let computedReportTitle = "OT Report for Production";
      if (Array.isArray(departments) && departments.length === 1) {
        const singleDept = await Department.findByPk(departments[0]);
        if (singleDept) computedReportTitle = `OT Report for ${singleDept.departmentname}`;
      }

      let targetShiftName = "ALL";
      if (shift) {
        const sh = await ShiftType.findByPk(shift);
        if (sh && sh.name) targetShiftName = sh.name;
      }

      return res.status(200).json({
        success: true,
        companyName,
        reportTitle: computedReportTitle,
        shiftName: targetShiftName,
        fromDate: moment(fromDate).format("DD-MM-YYYY"),
        toDate: moment(toDate).format("DD-MM-YYYY"),
        shifts: formattedShifts,
        flatRows,
        data: flatRows,
        grandTotalHrs
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
      const { OTHours, Employee, Department, ShiftType, Company } = require("../models");
      const moment = require("moment");

      let companyName = "Test Company";
      if (companyId) {
        const comp = await Company.findByPk(companyId);
        if (comp && (comp.name || comp.companyname)) companyName = comp.name || comp.companyname;
      }

      // 1. Generate day sequence for the date range (supports spanning across months without collisions)
      const dayList = [];
      let cur = moment(fromDate);
      const end = moment(toDate);
      while (cur.isSameOrBefore(end)) {
        dayList.push({
          key: cur.format("YYYY-MM-DD"),
          dateStr: cur.format("YYYY-MM-DD"),
          label: cur.format("D")
        });
        cur.add(1, "day");
      }

      // 2. Resolve shift name if selected
      let targetShiftName = "ALL";
      if (shift) {
        const sh = await ShiftType.findByPk(shift);
        if (sh && sh.name) targetShiftName = sh.name;
      }

      // 3. Build query for OTHours
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
            attributes: ["id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName", "departmentId"],
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
            attributes: ["id", "name"],
            required: false
          }
        ],
        order: [["date", "ASC"], ["id", "ASC"]]
      });

      // Filter post-reconciliation to only include records whose resolved department matches
      let filteredRecords = records;
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        filteredRecords = records.filter(r => {
          const resolvedDeptId = r.workedDeptId || r.departmentId;
          return resolvedDeptId && deptIdSet.has(parseInt(resolvedDeptId));
        });
      }

      // 4. Pivot records by Employee (Cross-tab matrix by Day)
      const employeeMap = new Map();

      filteredRecords.forEach(r => {
        const emp = r.employee;
        const empId = r.employeeId || (emp ? emp.id : r.ticketNo);
        const code = (emp ? (emp.curEmployeeCode || emp.newEmployeeCode) : "") || r.ticketNo || String(empId);
        const name = emp
          ? (emp.firstName || "").trim() || (r.empName || "")
          : (r.empName || "");

        const dayNum = moment(r.date).format("D");
        const dateKey = moment(r.date).format("YYYY-MM-DD");
        const hours = parseFloat(r.otHours) || 0;

        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employeeId: empId,
            ticketNo: code,
            employeeName: name.toUpperCase(),
            department: (r.workedDepartment ? r.workedDepartment.departmentname : null) || (r.department ? r.department.departmentname : "General"),
            dailyHours: {},
            total: 0
          });
        }

        const empRow = employeeMap.get(empId);
        empRow.dailyHours[dateKey] = Math.round(((empRow.dailyHours[dateKey] || 0) + hours) * 100) / 100;
        empRow.dailyHours[dayNum] = empRow.dailyHours[dateKey];
        empRow.total = Math.round((empRow.total + hours) * 100) / 100;
      });

      // Sort rows numerically / alphabetically by ticketNo
      const rows = Array.from(employeeMap.values()).sort((a, b) => {
        const numA = parseInt(String(a.ticketNo).replace(/[^0-9]/g, ""), 10);
        const numB = parseInt(String(b.ticketNo).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return String(a.ticketNo).localeCompare(String(b.ticketNo), undefined, { numeric: true });
      });

      // 5. Calculate daily column totals and grand total
      const dayTotals = {};
      dayList.forEach(d => {
        dayTotals[d.key] = 0;
        dayTotals[d.label] = 0;
      });
      let grandTotal = 0;

      rows.forEach(row => {
        dayList.forEach(d => {
          if (row.dailyHours[d.key]) {
            dayTotals[d.key] = Math.round((dayTotals[d.key] + row.dailyHours[d.key]) * 100) / 100;
            dayTotals[d.label] = dayTotals[d.key];
          }
        });
        grandTotal = Math.round((grandTotal + row.total) * 100) / 100;
      });

      // Resolve report title
      const deptNames = Array.from(new Set(rows.map(r => r.department).filter(Boolean)));
      let computedReportTitle = "OT Report for Production";
      if (deptNames.length === 1) {
        computedReportTitle = `OT Report for ${deptNames[0]}`;
      } else if (Array.isArray(departments) && departments.length === 1) {
        const singleDept = await Department.findByPk(departments[0]);
        if (singleDept) computedReportTitle = `OT Report for ${singleDept.departmentname}`;
      }

      return res.status(200).json({
        success: true,
        companyName,
        reportTitle: computedReportTitle,
        shiftName: targetShiftName,
        fromDate: moment(fromDate).format("DD-MM-YYYY"),
        toDate: moment(toDate).format("DD-MM-YYYY"),
        days: dayList,
        data: rows,
        dayTotals,
        grandTotal
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
      const { OTHours, Employee, Department, ShiftType, Category, Company } = require("../models");
      const moment = require("moment");

      // Resolve selected shift name
      let shiftName = "ALL";
      if (shift) {
        const sh = await ShiftType.findByPk(shift);
        if (sh && sh.name) shiftName = sh.name;
      }

      // Fetch company name
      let companyName = "Test Company";
      if (companyId) {
        const comp = await Company.findByPk(companyId);
        if (comp && (comp.name || comp.companyname)) companyName = comp.name || comp.companyname;
      }

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
            attributes: [
              "id", "curEmployeeCode", "newEmployeeCode", "firstName", "middleName", "lastName",
              "departmentId", "categoryId", "workingType", "employeeType", "epfNumber", "providentFundNumber", "isHostel"
            ],
            include: [
              {
                model: Category,
                as: "category",
                attributes: ["id", "categoryName", "categoryCode"],
                required: false
              }
            ],
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
            as: "shift",
            attributes: ["id", "name"],
            required: false
          }
        ],
        order: [["date", "ASC"], ["id", "ASC"]]
      });

      // Filter post-reconciliation if departments array was passed
      let filteredRecords = records;
      if (Array.isArray(departments) && departments.length > 0) {
        const deptIdSet = new Set(departments.map(id => parseInt(id)));
        filteredRecords = records.filter(r => {
          const resolvedDeptId = r.workedDeptId || r.departmentId;
          return resolvedDeptId && deptIdSet.has(parseInt(resolvedDeptId));
        });
      }

      // Preload all shifts for reliable shift name lookup
      const allShifts = await ShiftType.findAll({ raw: true });
      const shiftMapById = {};
      allShifts.forEach(s => {
        shiftMapById[s.id] = s;
      });

      // Helper: resolve category code (e.g. O, H, S-PF)
      const resolveCategoryCode = (emp) => {
        if (!emp) return "";
        const catName = String(emp.category?.categoryName || "").toUpperCase();
        if (catName.includes("HOSTEL") || emp.isHostel) return "H";
        if (catName.includes("OTHER")) return "O";
        if (catName.includes("STAFF") || emp.employeeType === "Staff") {
          return emp.epfNumber || emp.providentFundNumber ? "S-PF" : "S";
        }
        if (emp.category?.categoryCode) return emp.category.categoryCode;
        if (emp.category?.categoryName) return emp.category.categoryName.charAt(0);
        return "";
      };

      // Helper for employee name formatting: only first name (no need last name)
      const formatEmployeeName = (emp, fallbackName) => {
        if (!emp) return (fallbackName || "").toUpperCase().trim();
        return (emp.firstName || fallbackName || "").toUpperCase().trim();
      };

      // Group records by shift
      const shiftGroups = {};
      filteredRecords.forEach(r => {
        const sh = r.shift || shiftMapById[r.shiftId] || shiftMapById[r.employee?.shiftTypeId];
        let sName = (sh?.name || "").toUpperCase().trim();
        if (!sName && (r.shiftId === 1 || r.shiftId === "1")) sName = "A";
        if (!sName && (r.shiftId === 2 || r.shiftId === "2")) sName = "B";
        if (!sName && (r.shiftId === 3 || r.shiftId === "3")) sName = "C";
        if (!sName) sName = "OTHER";

        if (!shiftGroups[sName]) {
          shiftGroups[sName] = [];
        }
        shiftGroups[sName].push(r);
      });

      const shiftSortOrder = ["A", "B", "C", "SUP_A", "SUP_B", "SUP_C", "STAFF_A", "STAFF_B", "STAFF_C", "GENERAL_A", "GENERAL_B"];
      const sortedShiftKeys = Object.keys(shiftGroups).sort((a, b) => {
        const idxA = shiftSortOrder.indexOf(a);
        const idxB = shiftSortOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      let grandTotalHrs = 0;
      const flatRows = [];

      sortedShiftKeys.forEach(shiftKey => {
        const recs = shiftGroups[shiftKey];
        let shiftTotalHrs = 0;

        // Group by (employeeId + resolvedDeptId) to aggregate hours per employee in that shift & department
        const empAggMap = new Map();
        recs.forEach(r => {
          const emp = r.employee;
          const empId = r.employeeId || r.ticketNo || r.id;
          const deptName = (r.workedDepartment ? r.workedDepartment.departmentname : null)
            || (r.department ? r.department.departmentname : "General");
          const key = `${shiftKey}_${deptName}_${empId}`;

          const hours = parseFloat(r.otHours) || 0;
          if (!empAggMap.has(key)) {
            const code = (emp ? (emp.curEmployeeCode || emp.newEmployeeCode) : "") || r.ticketNo || "";
            const empName = formatEmployeeName(emp, r.empName);
            const cat = resolveCategoryCode(emp);
            empAggMap.set(key, {
              shift: shiftKey,
              department: deptName,
              ticketNo: code,
              employeeName: empName,
              category: cat,
              otHours: 0
            });
          }
          const item = empAggMap.get(key);
          item.otHours = Math.round((item.otHours + hours) * 100) / 100;
        });

        const aggregatedList = Array.from(empAggMap.values());
        let empSlNo = 1;

        aggregatedList.forEach((row, rIdx) => {
          shiftTotalHrs = Math.round((shiftTotalHrs + row.otHours) * 100) / 100;
          grandTotalHrs = Math.round((grandTotalHrs + row.otHours) * 100) / 100;

          flatRows.push({
            isEmployeeRow: true,
            shift: row.shift,
            isFirstInShift: rIdx === 0,
            shiftCount: aggregatedList.length,
            department: row.department,
            slNo: empSlNo++,
            ticketNo: row.ticketNo,
            employeeName: row.employeeName,
            otHours: row.otHours,
            category: row.category
          });
        });

        // Add shift subtotal row
        flatRows.push({
          isShiftSubtotal: true,
          shift: shiftKey,
          shiftTotalHrs: Math.round(shiftTotalHrs * 100) / 100
        });
      });

      return res.status(200).json({
        success: true,
        companyName,
        shiftName,
        reportTitle: "OT Report for Production",
        data: flatRows.filter(r => r.isEmployeeRow),
        flatRows,
        grandTotalHrs: Math.round(grandTotalHrs * 100) / 100,
        totalRecords: filteredRecords.length
      });
    } catch (err) {
      console.error("Error generating abstract overtime report:", err);
      return res.status(500).json({ error: "Failed to generate abstract overtime report", message: err.message });
    }
  },
};