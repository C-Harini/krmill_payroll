const { Employee, EmployeeDocument, Company, Department, Designation, EmploymentType, EmployerGrade, ShiftType, LeavePolicy, BiometricDevice, Bus, EmployeeRelation, Category, Caste, Religion } = require('../models');
const Papa = require('papaparse');
const path = require('path');
const fs = require('fs');

// @desc    Get all employees for a specific company
// @route   GET /api/employees?companyId=1
// @access  Private
exports.getEmployeesByCompany = async (req, res) => {
  const { companyId, departmentId, status, isTrainee } = req.query;
  if (!companyId)
    return res.status(400).json({ message: "Company ID is required" });

  try {
    const whereClause = { companyId };
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (isTrainee !== undefined && isTrainee !== "" && isTrainee !== "all") {
      whereClause.isTrainee =
        isTrainee === "true" ||
        isTrainee === true ||
        isTrainee === "1" ||
        isTrainee === 1;
    }

    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
        { model: EmployerGrade, as: "grade", attributes: ["id", "name"] },
        { model: EmploymentType, as: "employmentType", attributes: ["id", "name"] },
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Caste, as: "caste", attributes: ["id", "casteName"] },
        { model: Religion, as: "religion", attributes: ["id", "religionName"] },
      ],
      order: [["employeeCode", "ASC"]],
    });

    // Add computed fields
    const employeesWithComputed = employees.map((emp) => {
      const empData = emp.toJSON();
      empData.age = emp.getAge();
      empData.retirementDate = emp.getRetirementDate();
      empData.fullName = emp.getFullName();
      return empData;
    });

    res.status(200).json(employeesWithComputed);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get a single employee by ID
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findByPk(id, {
      include: [
        { model: Company, as: "company", attributes: ["id", "name"] },
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
        { model: EmployerGrade, as: "grade", attributes: ["id", "name"] },
        {
          model: EmploymentType,
          as: "employmentType",
          attributes: ["id", "name"],
        },
        { model: ShiftType, as: "shiftType", attributes: ["id", "name"] },
        { model: LeavePolicy, as: "leavePolicy", attributes: ["id", "name"] },
        {
          model: BiometricDevice,
          as: "biometricDevice",
          attributes: ["id", "name"],
        },
        { model: Bus, as: "bus", attributes: ["id", "name"] },
        {
          model: Employee,
          as: "reportingManager",
          attributes: ["id", "firstName", "lastName", "employeeCode"],
        },
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Caste, as: "caste", attributes: ["id", "casteName"] },
        { model: Religion, as: "religion", attributes: ["id", "religionName"] },
        { model: EmployeeRelation, as: "relations" },
        { model: EmployeeDocument, as: 'documents' },
      ],
    });

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const empData = employee.toJSON();
    empData.age = employee.getAge();
    empData.retirementDate = employee.getRetirementDate();
    empData.fullName = employee.getFullName();

    res.status(200).json(empData);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private

exports.createEmployee = async (req, res) => {
  try {
    const cleanedData = { ...req.body };

    // Parse relations safely
    const relations = cleanedData.relations
      ? JSON.parse(cleanedData.relations)
      : [];

    delete cleanedData.relations;

    // Handle multiple uploaded files
    if (req.files) {
      Object.keys(req.files).forEach((key) => {
        cleanedData[key] = req.files[key][0].filename;
      });
    }

    // Foreign key fields → convert empty string to null
    const foreignKeyFields = [
      "reportingManagerId",
      "shiftTypeId",
      "leavePolicyId",
      "biometricDeviceId",
      "busId",
      "designationId",
      "employmentTypeId",
      "departmentId",
      "gradeId",
      "categoryId",
      "casteId",
      "religionId",
    ];

    foreignKeyFields.forEach((field) => {
      if (!cleanedData[field]) cleanedData[field] = null;
    });

    // Optional fields → convert empty string to null
    const optionalFields = [
      "middleName",
      "officialEmail",
      "alternateMobile",
      "emergencyContactName",
      "emergencyContactNumber",
      "emergencyContactRelationship",
      "currentAddressLine2",
      "permanentAddressLine1",
      "permanentAddressLine2",
      "relievingDate",
      "leavingReason",
      "permanentCity",
      "permanentState",
      "permanentPincode",
      "permanentCountry",
      "confirmationDate",
      "workLocation",
      "referencePersonName",
      "referencePersonContact",
      "biometricEnrollmentId",
      "bankName",
      "bankAccountNumber",
      "ifscCode",
      "bankBranch",
      "panNumber",
      "pickupPoint",
      "aadhaarNumber",
      "passportNumber",
      "drivingLicenseNumber",
      "voterIdNumber",
      "profilePhoto",
      "bloodGroup",
      "maritalStatus",
      "adolescenceCertificateNumber",
      "adolescenceCertificateValidity",
      "dateOfRejoining",
      "uanNumber",
      "epfNumber",
      "esiNumber",
    ];

    optionalFields.forEach((field) => {
      if (!cleanedData[field]) cleanedData[field] = null;
    });

    // ✅ Adolescence validation
    if (cleanedData.dateOfBirth) {
      const dob = new Date(cleanedData.dateOfBirth);
      const today = new Date();

      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      if (age < 18 && !cleanedData.adolescenceCertificate) {
        return res.status(400).json({
          message:
            "Adolescence certificate is required for employees under 18.",
        });
      }
    }

    // ✅ EXPERIENCE CALCULATION (Joining + Rejoining, gap excluded)

    let totalMonths = 0;
    const today = new Date();

    const joiningDate = cleanedData.dateOfJoining;
    const relievingDate = cleanedData.relievingDate;
    const rejoiningDate = cleanedData.dateOfRejoining;

    // ---- 1️⃣ First Service Period (Joining → Relieving OR Today)
    if (joiningDate) {
      const start = new Date(joiningDate);
      const end = relievingDate ? new Date(relievingDate) : today;

      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();

      if (end.getDate() < start.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      totalMonths += years * 12 + months;
    }

    // ---- 2️⃣ Second Service Period (Rejoining → Today)
    if (rejoiningDate) {
      const start = new Date(rejoiningDate);

      let years = today.getFullYear() - start.getFullYear();
      let months = today.getMonth() - start.getMonth();

      if (today.getDate() < start.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      totalMonths += years * 12 + months;
    }

    if (totalMonths > 0) {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      cleanedData.experience = totalMonths;
    } else {
      cleanedData.experience = 0;
    }

    // ✅ Convert boolean strings/values to boolean
    const booleanFields = [
      "isTrainee",
      "isHostel",
      "isTransportRequired",
      "isOvertimeApplicable",
      "isLeaveApplicable",
    ];
    booleanFields.forEach((field) => {
      if (cleanedData[field] !== undefined) {
        cleanedData[field] =
          cleanedData[field] === true ||
          cleanedData[field] === "true" ||
          cleanedData[field] === 1 ||
          cleanedData[field] === "1";
      }
    });

    // ✅ For non-trainee employees, workload must always be NULL
    if (!cleanedData.isTrainee) {
      cleanedData.workload = null;
    }

    // ✅ Create Employee
    const newEmployee = await Employee.create(cleanedData);

    // ✅ Save Relations
    if (relations.length > 0) {
      await EmployeeRelation.bulkCreate(
        relations.map((r) => ({
          ...r,
          employeeId: newEmployee.id,
          salary: r.salary && r.salary !== "" ? r.salary : null,
        })),
      );
    }

    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("Error creating employee:", error);

    let message = "Server Error";

    if (error.name === "SequelizeValidationError") {
      message = error.errors.map((err) => err.message).join(" ");
    } else if (error.name === "SequelizeUniqueConstraintError") {
      message = "An employee with this employee code already exists.";
    }

    res.status(400).json({ message });
  }
};
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const updatedData = { ...req.body };
    // console.log(updatedData)
    let relations = null;

    // Parse relations
    if (updatedData.relations) {
      relations = JSON.parse(updatedData.relations);
      delete updatedData.relations;
    }

    // Handle multiple uploaded files
    if (req.files) {
      Object.keys(req.files).forEach((key) => {
        if (employee[key]) {
          const oldFilePath = path.join(
            __dirname,
            "..",
            "uploads",
            employee[key],
          );
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        updatedData[key] = req.files[key][0].filename;
      });
    }

    // Clean foreign key fields
    const foreignKeyFields = [
      "reportingManagerId",
      "shiftTypeId",
      "leavePolicyId",
      "biometricDeviceId",
      "busId",
      "designationId",
      "employmentTypeId",
      "departmentId",
      "gradeId",
      "categoryId",
      "casteId",
      "religionId",
    ];

    foreignKeyFields.forEach((field) => {
      if (!updatedData[field]) updatedData[field] = null;
    });

    // Clean optional fields (including dateOfRejoining)
    const optionalFields = [
      "middleName",
      "officialEmail",
      "alternateMobile",
      "emergencyContactName",
      "emergencyContactNumber",
      "emergencyContactRelationship",
      "currentAddressLine2",
      "permanentAddressLine1",
      "permanentAddressLine2",
      "permanentCity",
      "permanentState",
      "permanentPincode",
      "permanentCountry",
      "confirmationDate",
      "workLocation",
      "referencePersonName",
      "referencePersonContact",
      "biometricEnrollmentId",
      "bankName",
      "bankAccountNumber",
      "ifscCode",
      "bankBranch",
      "panNumber",
      "pickupPoint",
      "relievingDate",
      "leavingReason",
      "aadhaarNumber",
      "passportNumber",
      "drivingLicenseNumber",
      "voterIdNumber",
      "profilePhoto",
      "bloodGroup",
      "maritalStatus",
      "adolescenceCertificateNumber",
      "adolescenceCertificateValidity",
      "dateOfRejoining",
      "uanNumber",
      "epfNumber",
      "esiNumber",
    ];

    optionalFields.forEach((field) => {
      if (updatedData[field] === "") {
        updatedData[field] = null;
      }
    });

    // ✅ EXPERIENCE CALCULATION (Joining + Rejoining)

    let totalMonths = 0;
    const today = new Date();

    const joiningDate = updatedData.dateOfJoining || employee.dateOfJoining;
    const relievingDate = updatedData.hasOwnProperty("relievingDate")
      ? updatedData.relievingDate
      : employee.relievingDate;

    const rejoiningDate =
      updatedData.dateOfRejoining || employee.dateOfRejoining;

    // ---- 1️⃣ First Service Period (Joining → Relieving OR Today)
    if (joiningDate) {
      const start = new Date(joiningDate);
      const end = relievingDate ? new Date(relievingDate) : today;

      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();

      if (end.getDate() < start.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      totalMonths += years * 12 + months;
    }

    // ---- 2️⃣ Second Service Period (Rejoining → Today)
    if (rejoiningDate) {
      const start = new Date(rejoiningDate);

      let years = today.getFullYear() - start.getFullYear();
      let months = today.getMonth() - start.getMonth();

      if (today.getDate() < start.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      totalMonths += years * 12 + months;
    }

    if (totalMonths > 0) {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      updatedData.experience = totalMonths;
    } else {
      updatedData.experience = 0;
    }

    // ✅ Convert boolean fields and enforce workload = null for non-trainees
    const booleanFields = [
      "isTrainee",
      "isHostel",
      "isTransportRequired",
      "isOvertimeApplicable",
      "isLeaveApplicable",
    ];
    booleanFields.forEach((field) => {
      if (updatedData[field] !== undefined) {
        updatedData[field] =
          updatedData[field] === true ||
          updatedData[field] === "true" ||
          updatedData[field] === 1 ||
          updatedData[field] === "1";
      }
    });

    if (updatedData.hasOwnProperty("isTrainee")) {
      if (!updatedData.isTrainee) {
        updatedData.workload = null;
      }
    } else if (!employee.isTrainee) {
      updatedData.workload = null;
    }

    // Update employee
    await employee.update(updatedData);

    // Handle relations
    if (relations !== null) {
      await EmployeeRelation.destroy({
        where: { employeeId: employee.id },
      });

      const cleanedRelations = relations.map((r) => ({
        ...r,
        salary: r.salary === "" ? null : r.salary,
        employeeId: employee.id,
      }));

      if (cleanedRelations.length > 0) {
        await EmployeeRelation.bulkCreate(cleanedRelations);
      }
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);

    let message = "Server Error";
    if (error.name === "SequelizeValidationError") {
      message = error.errors.map((err) => err.message).join(" ");
    }

    res.status(400).json({ message });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findByPk(id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // TODO: Add a check here to prevent deletion if the employee has attendance or payroll records
    await employee.destroy();
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Bulk upload employees from CSV
// @route   POST /api/employees/bulk-upload
// @access  Private
exports.bulkUploadEmployees = async (req, res) => {
  try {
    const { csvData, companyId } = req.body;

    if (!csvData || !companyId) {
      return res
        .status(400)
        .json({ message: "CSV data and company ID are required" });
    }

    // Parse CSV data
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsedData.errors.length > 0) {
      return res.status(400).json({
        message: "CSV parsing error",
        errors: parsedData.errors,
      });
    }

    const employees = parsedData.data;
    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process each employee
    for (let i = 0; i < employees.length; i++) {
      try {
        const empData = { ...employees[i], companyId };

        // Convert boolean strings to actual booleans
        if (typeof empData.isTrainee === "string") {
          empData.isTrainee = empData.isTrainee.toLowerCase() === "true";
        }
        if (typeof empData.isHostel === "string") {
          empData.isHostel = empData.isHostel.toLowerCase() === "true";
        }
        if (typeof empData.isTransportRequired === "string") {
          empData.isTransportRequired =
            empData.isTransportRequired.toLowerCase() === "true";
        }
        if (typeof empData.isOvertimeApplicable === "string") {
          empData.isOvertimeApplicable =
            empData.isOvertimeApplicable.toLowerCase() === "true";
        }
        if (typeof empData.isLeaveApplicable === "string") {
          empData.isLeaveApplicable =
            empData.isLeaveApplicable.toLowerCase() === "true";
        }

        await Employee.create(empData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          employeeCode: employees[i].employeeCode || "Unknown",
          error: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Bulk upload completed",
      results,
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Download employee CSV template
// @route   GET /api/employees/download-template
// @access  Private
exports.downloadTemplate = async (req, res) => {
  const csvTemplate = `employeeCode,firstName,middleName,lastName,dateOfBirth,gender,bloodGroup,maritalStatus,personalEmail,officialEmail,mobileNumber,alternateMobile,emergencyContactName,emergencyContactNumber,emergencyContactRelationship,currentAddressLine1,currentAddressLine2,currentCity,currentState,currentPincode,currentCountry,permanentAddressLine1,permanentAddressLine2,permanentCity,permanentState,permanentPincode,permanentCountry,departmentId,designationId,employmentTypeId,employeeType,dateOfJoining,confirmationDate,probationPeriod,reportingManagerId,workLocation,employmentStatus,referencePersonName,referencePersonContact,shiftTypeId,leavePolicyId,weeklyOff,isOvertimeApplicable,isLeaveApplicable,biometricDeviceId,biometricEnrollmentId,basicSalary,bankName,bankAccountNumber,ifscCode,bankBranch,paymentMode,panNumber,uanNumber,esiNumber,isTransportRequired,busId,pickupPoint,isHostel,isTrainee,aadhaarNumber,passportNumber,drivingLicenseNumber,voterIdNumber,categoryId,casteId,religionId,status
EMP001,John,M,Doe,1990-01-15,Male,A+,Single,john.doe@example.com,john.doe@company.com,9876543210,9876543211,Jane Doe,9876543212,Spouse,123 Main St,,New York,NY,10001,USA,123 Main St,,New York,NY,10001,USA,1,1,1,Permanent,2023-01-01,2023-04-01,3,2,Head Office,Active,Robert Smith,9876543213,1,1,Sunday,false,true,1,BIO001,25000,HDFC Bank,1234567890,HDFC0001234,NY Branch,Bank Transfer,ABCDE1234F,123456789012,1234567890,false,1,Main Street,false,false,123456789012,A1234567,DL123456,ABC1234567,1,1,1,Active`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=employee_template.csv",
  );
  res.status(200).send(csvTemplate);
};


exports.updateEmployeeDocuments = async (req, res) => {
    const { id } = req.params;
 
    try {
        const employee = await Employee.findByPk(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
 
        // Build update payload from text fields
        const docUpdate = {};
 
        const numberFields = [
            'aadhaarNumber', 'panNumber', 'passportNumber',
            'voterIdNumber', 'drivingLicenseNumber'
        ];
        numberFields.forEach(field => {
            if (req.body[field] !== undefined) {
                docUpdate[field] = req.body[field] === '' ? null : req.body[field];
            }
        });
 
        // Handle uploaded files — delete old file from disk first
        const fileFields = [
            'aadhaarDocument', 'panDocument', 'passportDocument',
            'voterIdDocument', 'drivingLicenseDocument'
        ];
 
        // Get existing doc record to find old filenames
        const existingDoc = await EmployeeDocument.findOne({ where: { employeeId: id } });
 
        if (req.files) {
            fileFields.forEach(field => {
                if (req.files[field] && req.files[field][0]) {
                    // Delete old file
                    if (existingDoc && existingDoc[field]) {
                        const oldPath = path.join(__dirname, '..', 'uploads', existingDoc[field]);
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }
                    docUpdate[field] = req.files[field][0].filename;
                }
            });
        }
 
        // Upsert: update if exists, create if not
        if (existingDoc) {
            await existingDoc.update({
                companyId:    employee.companyId,
                departmentId: employee.departmentId,
                ...docUpdate
            });
        } else {
            await EmployeeDocument.create({
                employeeId:   parseInt(id),
                companyId:    employee.companyId,
                departmentId: employee.departmentId,
                ...docUpdate
            });
        }
 
        const updatedDoc = await EmployeeDocument.findOne({ where: { employeeId: id } });
 
        res.status(200).json({
            message: 'Documents updated successfully',
            documents: updatedDoc
        });
 
    } catch (error) {
        console.error('Error updating employee documents:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
 
// ── updateEmployeeRelations — standalone route ──────────────────
// @route PUT /api/employees/:id/relations
exports.updateEmployeeRelations = async (req, res) => {
    const { id } = req.params;
 
    try {
        const employee = await Employee.findByPk(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
 
        const { relations } = req.body;
 
        if (!Array.isArray(relations)) {
            return res.status(400).json({ message: 'relations must be an array' });
        }
 
        // Delete existing relations
        await EmployeeRelation.destroy({ where: { employeeId: id } });
 
        // Insert new relations
        if (relations.length > 0) {
            const cleaned = relations.map(r => ({
    name:       r.name ? String(r.name).trim() : '',
    age:        (r.age !== null && r.age !== undefined && r.age !== '' && r.age !== 'null')
                  ? parseInt(r.age) : null,
    relation:   r.relation || '',
    occupation: (r.occupation && r.occupation !== 'null' && String(r.occupation).trim() !== '')
                  ? String(r.occupation).trim() : null,
    salary:     (r.salary !== null && r.salary !== undefined && r.salary !== '' && r.salary !== 'null')
                  ? parseFloat(r.salary) : null,
    employeeId: parseInt(id),
}));
            await EmployeeRelation.bulkCreate(cleaned);
        }
 
        const updated = await Employee.findByPk(id, {
            include: [{ model: EmployeeRelation, as: 'relations' }]
        });
 
        res.status(200).json({
            message: 'Relations updated successfully',
            relations: updated.relations
        });
 
    } catch (error) {
        console.error('Error updating employee relations:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get count of active employees
// @route   GET /api/employees/count/active
// @access  Private
exports.getActiveEmployeeCount = async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const count = await Employee.count({
      where: {
        companyId,
        status: 'Active'
      }
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching active employee count:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update single employee workload
// @route   PUT /api/employees/:id/workload
// @access  Private
exports.updateEmployeeWorkload = async (req, res) => {
  const { id } = req.params;
  const { workload } = req.body;

  try {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (!employee.isTrainee) {
      return res.status(400).json({
        success: false,
        message: `Employee ${employee.firstName} (${employee.employeeCode}) is not a Trainee. Workload can only be set for Trainee employees.`,
      });
    }

    const parsedWorkload = (workload === "" || workload === null || workload === undefined) 
      ? null 
      : parseFloat(workload);

    if (parsedWorkload !== null && (isNaN(parsedWorkload) || parsedWorkload < 0 || parsedWorkload > 1)) {
      return res.status(400).json({
        success: false,
        message: "Workload must be between 0.00 and 1.00",
      });
    }

    await employee.update({ workload: parsedWorkload });

    res.status(200).json({
      success: true,
      message: "Workload updated successfully",
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        workload: employee.workload,
      },
    });
  } catch (error) {
    console.error("Error updating employee workload:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Bulk update employee workloads
// @route   PUT /api/employees/bulk-workload
// @access  Private
exports.bulkUpdateWorkloads = async (req, res) => {
  const { updates, employeeIds, workload } = req.body;

  try {
    if (Array.isArray(updates) && updates.length > 0) {
      // Validate all updates first
      for (const item of updates) {
        if (item.workload !== "" && item.workload !== null && item.workload !== undefined) {
          const num = parseFloat(item.workload);
          if (isNaN(num) || num < 0 || num > 1) {
            return res.status(400).json({
              success: false,
              message: `Invalid workload value: ${item.workload}. Workload must be between 0.00 and 1.00.`,
            });
          }
        }
      }

      const updatePromises = updates.map(async (item) => {
        const empId = item.id || item.employeeId;
        const val = (item.workload === "" || item.workload === null || item.workload === undefined)
          ? null
          : parseFloat(item.workload);
        if (empId) {
          return Employee.update({ workload: val }, { where: { id: empId } });
        }
      });
      await Promise.all(updatePromises);
      return res.status(200).json({
        success: true,
        message: `Workloads updated successfully for ${updates.length} employee(s)`,
      });
    }

    if (Array.isArray(employeeIds) && employeeIds.length > 0 && workload !== undefined) {
      const parsedWorkload = (workload === "" || workload === null) ? null : parseFloat(workload);
      if (parsedWorkload !== null && (isNaN(parsedWorkload) || parsedWorkload < 0 || parsedWorkload > 1)) {
        return res.status(400).json({
          success: false,
          message: "Workload value must be between 0.00 and 1.00",
        });
      }

      await Employee.update(
        { workload: parsedWorkload },
        { where: { id: employeeIds } }
      );
      return res.status(200).json({
        success: true,
        message: `Workloads updated successfully for ${employeeIds.length} employee(s)`,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Please provide valid updates array or employeeIds with workload value",
    });
  } catch (error) {
    console.error("Error bulk updating workloads:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Bulk upload workloads from CSV
// @route   POST /api/employees/bulk-upload-workload
// @access  Private
exports.bulkUploadWorkload = async (req, res) => {
  try {
    const { csvData, records, companyId } = req.body;

    let rowsToProcess = [];

    if (Array.isArray(records) && records.length > 0) {
      rowsToProcess = records;
    } else if (csvData) {
      const parsedData = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (parsedData.errors && parsedData.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "CSV parsing error",
          errors: parsedData.errors,
        });
      }
      rowsToProcess = parsedData.data;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide csvData or records array",
      });
    }

    const results = {
      total: rowsToProcess.length,
      updated: 0,
      failed: 0,
      notFound: 0,
      errors: [],
    };

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      const ticketNo = String(
        row.ticketNo || row.ticket_no || row["ticket num"] || row.ticketNumber || row.employeeCode || row.empCode || ""
      ).trim();
      
      const workloadVal = row.workload !== undefined ? row.workload : row.workloads !== undefined ? row.workloads : null;

      if (!ticketNo) {
        results.failed++;
        results.errors.push({ row: i + 1, message: "Missing Ticket Number / Employee Code" });
        continue;
      }

      const parsedWorkload = (workloadVal === "" || workloadVal === null || workloadVal === undefined)
        ? null
        : parseFloat(workloadVal);

      if (parsedWorkload !== null && (isNaN(parsedWorkload) || parsedWorkload < 0 || parsedWorkload > 1)) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          ticketNo,
          message: `Workload must be between 0.00 and 1.00 (received '${workloadVal}')`,
        });
        continue;
      }

      try {
        const whereClause = {
          employeeCode: ticketNo,
        };
        if (companyId) {
          whereClause.companyId = companyId;
        }

        const employee = await Employee.findOne({ where: whereClause });
        if (!employee) {
          results.notFound++;
          results.errors.push({ row: i + 1, ticketNo, message: `Employee with Ticket No '${ticketNo}' not found` });
          continue;
        }

        if (!employee.isTrainee) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            ticketNo,
            message: `Employee '${ticketNo}' (${employee.firstName}) is not a Trainee. Workload only applies to Trainee employees.`,
          });
          continue;
        }

        await employee.update({ workload: parsedWorkload });
        results.updated++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 1, ticketNo, message: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Workload upload completed. Updated: ${results.updated}, Not Found: ${results.notFound}, Failed: ${results.failed}`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk workload upload:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Download workload CSV template
// @route   GET /api/employees/download-workload-template
// @access  Private
exports.downloadWorkloadTemplate = async (req, res) => {
  const csvTemplate = `ticketNo,employeeName,workload\nEMP001,John Doe,1.0\nEMP002,Jane Smith,0.5\nEMP003,Alex Kumar,0.75`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=workload_template.csv",
  );
  res.status(200).send(csvTemplate);
};