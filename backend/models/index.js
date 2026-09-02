const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Create a new Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: console.log, // Set to 'false' to disable logging SQL queries
});

const db = {};

// Import each model function and call it with `sequelize`
// This initializes the model and attaches it to the sequelize instance
db.Company = require('./Company')(sequelize);
db.Category = require("./Category")(sequelize, Sequelize.DataTypes);
db.Caste = require("./Caste")(sequelize, Sequelize.DataTypes);
db.Religion = require("./Religion")(sequelize, Sequelize.DataTypes);
db.Department = require('./Department')(sequelize, Sequelize.DataTypes);
db.Designation = require('./Designation')(sequelize, Sequelize.DataTypes);
db.EmploymentType = require('./EmploymentType')(sequelize, Sequelize.DataTypes);
db.EmployerGrade = require('./EmployerGrade')(sequelize);
db.LeavePolicy = require('./LeavePolicy')(sequelize, Sequelize.DataTypes);
db.LeavePeriod = require('./LeavePeriod')(sequelize, Sequelize.DataTypes);
db.LeaveType = require('./LeaveType')(sequelize, Sequelize.DataTypes);
db.HolidayList = require('./HolidayList')(sequelize, Sequelize.DataTypes);
db.Holiday = require('./Holiday')(sequelize, Sequelize.DataTypes);
db.ShiftType = require('./ShiftType')(sequelize, Sequelize.DataTypes);
db.BiometricDevice = require('./BiometricDevice')(sequelize, Sequelize.DataTypes);
db.BiometricPunch = require('./BiometricPunch')(sequelize, Sequelize.DataTypes);
// Import Employee model
db.Employee = require('./Employee')(sequelize, Sequelize.DataTypes);
// Import Bus model
db.Bus = require('./Bus')(sequelize, Sequelize.DataTypes);
db.SalaryComponent = require('./SalaryComponent')(sequelize, Sequelize.DataTypes);
db.LeaveAllocation = require('./LeaveAllocation')(sequelize, Sequelize.DataTypes);
db.Formula = require('./Formula')(sequelize, Sequelize.DataTypes);
db.ShiftAssignment = require('./ShiftAssignment')(sequelize, Sequelize.DataTypes);

db.EmployeeRelation = require('./EmployeeRelation')(sequelize, Sequelize.DataTypes);
db.AttendanceIncentive = require("./AttendanceIncentive")(sequelize, Sequelize.DataTypes);
db.AttendanceIncentiveCondition = require("./AttendanceIncentiveCondition")(sequelize, Sequelize.DataTypes);
db.AdditionalSalary = require("./AdditionalSalary")(sequelize, Sequelize.DataTypes);
db.HostelAttendanceIncentive = require("./HostelAttendanceIncentive")(sequelize, Sequelize.DataTypes);
db.PackagingIncentive = require("./PackagingIncentive")(sequelize, Sequelize.DataTypes);


db.OTHours = require('./OTHours')(sequelize);
db.LunchAttendance = require('./LunchAttendance')(sequelize, Sequelize.DataTypes);
db.EightEightEntry = require('./EightEightEntry')(sequelize);



// ✅ NEW: Import Attendance Model
db.DepartmentAttendance = require('./DepartmentAttendance')(sequelize, Sequelize.DataTypes);
db.Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);

// ✅ NEW: Import User Model
db.User = require('./User')(sequelize, Sequelize.DataTypes);

// ✅ NEW: Import Employee Salary Models
db.EmployeeSalaryMaster = require('./EmployeeSalaryMaster')(sequelize, Sequelize.DataTypes);
db.EmployeeSalaryComponent = require('./EmployeeSalaryComponent')(sequelize, Sequelize.DataTypes);
db.SalaryRevisionHistory = require('./SalaryRevisionHistory')(sequelize, Sequelize.DataTypes);

// ⭐ NEW: Import Leave Request Models
db.LeaveRequest = require('./LeaveRequest')(sequelize, Sequelize.DataTypes);
db.LeaveApproval = require('./LeaveApproval')(sequelize, Sequelize.DataTypes);
db.LeaveRequestHistory = require('./LeaveRequestHistory')(sequelize, Sequelize.DataTypes);

db.SalaryGeneration = require('./SalaryGeneration')(sequelize, Sequelize.DataTypes);
db.SalaryGenerationDetail = require('./SalaryGenerationDetail')(sequelize, Sequelize.DataTypes);
db.EmployeeLoan = require('./EmployeeLoan')(sequelize, Sequelize.DataTypes);

// db.Category = require("./Category")(sequelize, DataTypes);
db.StrengthReport = require("./StrengthReport")(sequelize, Sequelize.DataTypes);
db.Deduction = require("./Deduction")(sequelize, Sequelize.DataTypes);
// holilday salary
db.HolidaySalary = require("./HolidaySalary")(sequelize, Sequelize.DataTypes);
db.DiscrepancyApproval = require("./DiscrepancyApproval")(sequelize, Sequelize.DataTypes);
db.AttendanceLock = require("./AttendanceLock")(sequelize, Sequelize.DataTypes);
// --- Set up the associations between models ---
db.EmployeeDocument = require('./EmployeeDocument')(sequelize, Sequelize.DataTypes);

// Company → AttendanceLock
db.Company.hasMany(db.AttendanceLock, { foreignKey: "companyId", onDelete: "CASCADE" });
db.AttendanceLock.belongsTo(db.Company, { foreignKey: "companyId" });

// Company → StrengthReport
db.Company.hasMany(db.StrengthReport, { foreignKey: "companyId", onDelete: "CASCADE" });
db.StrengthReport.belongsTo(db.Company, { foreignKey: "companyId" });

// Department → StrengthReport
db.Department.hasMany(db.StrengthReport, { foreignKey: "departmentId", onDelete: "CASCADE" });
db.StrengthReport.belongsTo(db.Department, { foreignKey: "departmentId" });

// Category → StrengthReport
db.Category.hasMany(db.StrengthReport, { foreignKey: "categoryId", onDelete: "CASCADE" });
db.StrengthReport.belongsTo(db.Category, { foreignKey: "categoryId" });


// Employee → EmployeeDocument
db.Employee.hasOne(db.EmployeeDocument, { foreignKey: 'employeeId', as: 'documents', onDelete: 'CASCADE' });
db.EmployeeDocument.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

// EmployeeDocument → Company
db.Company.hasMany(db.EmployeeDocument, { foreignKey: 'companyId', onDelete: 'CASCADE' });
db.EmployeeDocument.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// EmployeeDocument → Department
db.Department.hasMany(db.EmployeeDocument, { foreignKey: 'departmentId', onDelete: 'SET NULL' });
db.EmployeeDocument.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });





db.Deduction.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.Deduction, { foreignKey: 'employeeId', as: 'deductions' });

db.Deduction.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
db.Department.hasMany(db.Deduction, { foreignKey: 'departmentId', as: 'deductions' });

db.Deduction.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.Deduction, { foreignKey: 'companyId', as: 'deductions' });


// HolidaySalary associations
db.HolidaySalary.belongsTo(db.Company, { foreignKey: "companyId", as: "company" });
db.Company.hasMany(db.HolidaySalary, { foreignKey: "companyId", as: "holidaySalaries" });

db.HolidaySalary.belongsTo(db.Employee, { foreignKey: "employeeId", as: "employee" });
db.Employee.hasMany(db.HolidaySalary, { foreignKey: "employeeId", as: "holidaySalaries" });

db.HolidaySalary.belongsTo(db.Holiday, { foreignKey: "holidayId", as: "holiday" });
db.Holiday.hasMany(db.HolidaySalary, { foreignKey: "holidayId", as: "holidaySalaries" });

db.HolidaySalary.belongsTo(db.Department, { foreignKey: "departmentId", as: "department" });
db.Department.hasMany(db.HolidaySalary, { foreignKey: "departmentId", as: "holidaySalaries" });


// //include employee shift model
db.EmployeeShift = require("./employeeShifts")(sequelize, Sequelize.DataTypes);

db.EmployeeShift.belongsTo(db.Employee, {
  foreignKey: "employeeId",
  as: "employee",
});

db.Employee.hasMany(db.EmployeeShift, {
  foreignKey: "employeeId",
  as: "employeeShifts",
});

// EmployeeShift → Company
db.EmployeeShift.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.Company.hasMany(db.EmployeeShift, {
  foreignKey: "companyId",
  as: "employeeShifts",
});

// Company Associations
db.Company.hasMany(db.Department, { foreignKey: 'companyId', as: 'departments' });
db.Company.hasMany(db.LeavePeriod, { foreignKey: 'companyId', as: 'leavePeriods' });
db.Company.hasMany(db.LeaveType, { foreignKey: 'companyId', as: 'leaveTypes' });
db.Company.hasMany(db.HolidayList, { foreignKey: 'companyId', as: 'holidayLists' });
db.Company.hasMany(db.ShiftType, { foreignKey: 'companyId', as: 'shiftTypes' });

// Department Associations
db.Department.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
// Department → Category (Department holds categoryId — Category is the parent)
db.Department.belongsTo(db.Category, { foreignKey: 'categoryId', as: 'category' });
db.Category.hasMany(db.Department, { foreignKey: 'categoryId', as: 'departments' });

// Category Associations
// Category is standalone under Company (no departmentId — reversed from old design)
db.Category.belongsTo(db.Company, { foreignKey: 'companyId', as: 'Company' });

// Leave Period Associations
db.LeavePeriod.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Leave Type Associations
db.LeaveType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add Designation associations
db.Company.hasMany(db.Designation, { foreignKey: 'companyId' });
db.Designation.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmploymentType associations
db.Company.hasMany(db.EmploymentType, { foreignKey: 'companyId' });
db.EmploymentType.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmployerGrade associations
db.Company.hasMany(db.EmployerGrade, { foreignKey: 'companyId' });
db.EmployerGrade.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add LeavePolicy associations
db.Company.hasMany(db.LeavePolicy, { foreignKey: 'companyId' });
db.LeavePolicy.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmploymentType association with LeavePolicy
db.EmploymentType.hasMany(db.LeavePolicy, { foreignKey: 'employmentTypeId' });
db.LeavePolicy.belongsTo(db.EmploymentType, { foreignKey: 'employmentTypeId' });

// Holiday List Associations
db.HolidayList.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.HolidayList.hasMany(db.Holiday, { foreignKey: 'holidayListId', as: 'holidays' });
db.HolidayList.hasMany(db.ShiftType, { foreignKey: 'holidayListId', as: 'shifts' });

// Holiday Associations
db.Holiday.belongsTo(db.HolidayList, { foreignKey: 'holidayListId', as: 'holidayList' });

// Shift Type Associations
db.ShiftType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.ShiftType.belongsTo(db.HolidayList, { foreignKey: 'holidayListId', as: 'holidayList' });

// Add Company → Bus association
db.Company.hasMany(db.Bus, { foreignKey: 'companyId', as: 'buses' });

// Add Bus → Company association
db.Bus.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add Company → BiometricDevice association
db.Company.hasMany(db.BiometricDevice, { foreignKey: 'companyId', as: 'biometricDevices' });

// Add BiometricDevice → Company association
db.BiometricDevice.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add all associations
db.Company.hasMany(db.Designation, { foreignKey: 'companyId', as: 'designations' });
db.Designation.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.EmploymentType, { foreignKey: 'companyId', as: 'employmentTypes' });
db.EmploymentType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.LeavePolicy, { foreignKey: 'companyId', as: 'leavePolicies' });
db.LeavePolicy.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.Employee, { foreignKey: 'companyId', as: 'employees' });
db.Employee.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

db.Designation.hasMany(db.Employee, { foreignKey: 'designationId', as: 'employees' });
db.Employee.belongsTo(db.Designation, { foreignKey: 'designationId', as: 'designation' });

db.EmploymentType.hasMany(db.Employee, { foreignKey: 'employmentTypeId', as: 'employees' });
db.Employee.belongsTo(db.EmploymentType, { foreignKey: 'employmentTypeId', as: 'employmentType' });

// Add EmployerGrade association with Employee
db.EmployerGrade.hasMany(db.Employee, { foreignKey: 'gradeId', as: 'employees' });
db.Employee.belongsTo(db.EmployerGrade, { foreignKey: 'gradeId', as: 'grade' });

db.ShiftType.hasMany(db.Employee, { foreignKey: 'shiftTypeId', as: 'employees' });
db.Employee.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });

db.LeavePolicy.hasMany(db.Employee, { foreignKey: 'leavePolicyId', as: 'employees' });
db.Employee.belongsTo(db.LeavePolicy, { foreignKey: 'leavePolicyId', as: 'leavePolicy' });

db.BiometricDevice.hasMany(db.Employee, { foreignKey: 'biometricDeviceId', as: 'employees' });
db.Employee.belongsTo(db.BiometricDevice, { foreignKey: 'biometricDeviceId', as: 'biometricDevice' });

db.Bus.hasMany(db.Employee, { foreignKey: 'busId', as: 'employees' });
db.Employee.belongsTo(db.Bus, { foreignKey: 'busId', as: 'bus' });

// Category, Caste, and Religion associations with Employee
db.Category.hasMany(db.Employee, { foreignKey: 'categoryId', as: 'employees' });
db.Employee.belongsTo(db.Category, { foreignKey: 'categoryId', as: 'category' });

db.Caste.hasMany(db.Employee, { foreignKey: 'casteId', as: 'employees' });
db.Employee.belongsTo(db.Caste, { foreignKey: 'casteId', as: 'caste' });

db.Religion.hasMany(db.Employee, { foreignKey: 'religionId', as: 'employees' });
db.Employee.belongsTo(db.Religion, { foreignKey: 'religionId', as: 'religion' });

// Self-reference for reporting manager
db.Employee.belongsTo(db.Employee, { foreignKey: 'reportingManagerId', as: 'reportingManager' });
db.Employee.hasMany(db.Employee, { foreignKey: 'reportingManagerId', as: 'subordinates' });

// Associations for leave allocations
db.Company.hasMany(db.LeaveAllocation, { foreignKey: 'companyId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Employee.hasMany(db.LeaveAllocation, { foreignKey: 'employeeId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

db.LeaveType.hasMany(db.LeaveAllocation, { foreignKey: 'leaveTypeId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

db.LeavePeriod.hasMany(db.LeaveAllocation, { foreignKey: 'leavePeriodId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.LeavePeriod, { foreignKey: 'leavePeriodId', as: 'leavePeriod' });

// Add SalaryComponent associations
db.Company.hasMany(db.SalaryComponent, { foreignKey: 'companyId' });
db.SalaryComponent.belongsTo(db.Company, { foreignKey: 'companyId' });

// Formula associations
db.Company.hasMany(db.Formula, { foreignKey: 'companyId' });
db.Formula.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Formula.belongsTo(db.SalaryComponent, {
  foreignKey: 'targetComponentId',
  as: 'targetComponent' // Add this alias for better query results
});
db.SalaryComponent.hasMany(db.Formula, { foreignKey: 'targetComponentId' });

// ✅ NEW: Employee Salary Master Associations
db.EmployeeSalaryMaster.belongsTo(db.Employee, { foreignKey: 'employeeId' });
db.Employee.hasMany(db.EmployeeSalaryMaster, { foreignKey: 'employeeId' });

db.EmployeeSalaryMaster.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.EmployeeSalaryMaster, { foreignKey: 'companyId' });

// BiometricPunch associations
db.BiometricPunch.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.BiometricPunch, { foreignKey: 'employeeId', as: 'punches' });

db.BiometricPunch.belongsTo(db.BiometricDevice, { foreignKey: 'biometricDeviceId', as: 'device' });
db.BiometricDevice.hasMany(db.BiometricPunch, { foreignKey: 'biometricDeviceId', as: 'punches' });

db.BiometricPunch.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shift' });
db.ShiftType.hasMany(db.BiometricPunch, { foreignKey: 'shiftTypeId', as: 'punches' });

db.BiometricPunch.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.BiometricPunch, { foreignKey: 'companyId', as: 'punches' });

// Self-reference for previous salary
db.EmployeeSalaryMaster.belongsTo(db.EmployeeSalaryMaster, {
  foreignKey: 'previousSalaryId',
  as: 'previousSalary'
});
db.EmployeeSalaryMaster.hasMany(db.EmployeeSalaryMaster, {
  foreignKey: 'previousSalaryId',
  as: 'nextSalaries'
});

// ✅ NEW: Employee Salary Component Associations
db.EmployeeSalaryMaster.hasMany(db.EmployeeSalaryComponent, {
  foreignKey: 'employeeSalaryMasterId'
});
db.EmployeeSalaryComponent.belongsTo(db.EmployeeSalaryMaster, {
  foreignKey: 'employeeSalaryMasterId'
});

db.EmployeeSalaryComponent.belongsTo(db.SalaryComponent, {
  foreignKey: 'componentId'
});
db.SalaryComponent.hasMany(db.EmployeeSalaryComponent, {
  foreignKey: 'componentId'
});

db.EmployeeSalaryComponent.belongsTo(db.Formula, {
  foreignKey: 'formulaId'
});
db.Formula.hasMany(db.EmployeeSalaryComponent, {
  foreignKey: 'formulaId'
});



// ==========================================
// Employee ↔ EmployeeRelation Associations
// ==========================================

db.Employee.hasMany(db.EmployeeRelation, {
  foreignKey: 'employeeId',
  as: 'relations', // this is the alias you will use in queries
  onDelete: 'CASCADE'
});

db.EmployeeRelation.belongsTo(db.Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});





// ✅ NEW: Salary Revision History Associations
db.SalaryRevisionHistory.belongsTo(db.Employee, { foreignKey: 'employeeId' });
db.Employee.hasMany(db.SalaryRevisionHistory, { foreignKey: 'employeeId' });

db.SalaryRevisionHistory.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.SalaryRevisionHistory, { foreignKey: 'companyId' });

db.SalaryRevisionHistory.belongsTo(db.EmployeeSalaryMaster, {
  foreignKey: 'oldSalaryMasterId',
  as: 'oldSalary'
});

db.SalaryRevisionHistory.belongsTo(db.EmployeeSalaryMaster, {
  foreignKey: 'newSalaryMasterId',
  as: 'newSalary'
});

// ⭐ NEW: Leave Request Associations
// LeaveRequest → Employee
db.LeaveRequest.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'Employee' });
db.Employee.hasMany(db.LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });

// LeaveRequest → LeaveType
db.LeaveRequest.belongsTo(db.LeaveType, { foreignKey: 'leaveTypeId' });
db.LeaveType.hasMany(db.LeaveRequest, { foreignKey: 'leaveTypeId', as: 'leaveRequests' });

// LeaveRequest → LeaveAllocation
db.LeaveRequest.belongsTo(db.LeaveAllocation, { foreignKey: 'leaveAllocationId' });
db.LeaveAllocation.hasMany(db.LeaveRequest, { foreignKey: 'leaveAllocationId', as: 'leaveRequests' });

// LeaveRequest → Company
db.LeaveRequest.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveRequest, { foreignKey: 'companyId', as: 'leaveRequests' });

// LeaveRequest → LeaveApproval (One-to-Many)
db.LeaveRequest.hasMany(db.LeaveApproval, { foreignKey: 'leaveRequestId' });
db.LeaveApproval.belongsTo(db.LeaveRequest, { foreignKey: 'leaveRequestId' });

// LeaveRequest → LeaveRequestHistory (One-to-Many)
db.LeaveRequest.hasMany(db.LeaveRequestHistory, { foreignKey: 'leaveRequestId' });
db.LeaveRequestHistory.belongsTo(db.LeaveRequest, { foreignKey: 'leaveRequestId' });

// LeaveApproval → Employee (Approver)
db.LeaveApproval.belongsTo(db.Employee, { foreignKey: 'approverId', as: 'Approver' });
db.Employee.hasMany(db.LeaveApproval, { foreignKey: 'approverId', as: 'approvals' });

// LeaveApproval → Company
db.LeaveApproval.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveApproval, { foreignKey: 'companyId', as: 'leaveApprovals' });

// LeaveRequestHistory → Employee (ActionBy)
db.LeaveRequestHistory.belongsTo(db.Employee, { foreignKey: 'actionBy', as: 'ActionBy' });
db.Employee.hasMany(db.LeaveRequestHistory, { foreignKey: 'actionBy', as: 'leaveActions' });

// LeaveRequestHistory → Company
db.LeaveRequestHistory.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveRequestHistory, { foreignKey: 'companyId', as: 'leaveHistory' });

// ShiftAssignment Associations
db.ShiftAssignment.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.ShiftAssignment, { foreignKey: 'companyId', as: 'shiftAssignments' });

db.ShiftAssignment.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.ShiftAssignment, { foreignKey: 'employeeId', as: 'shiftAssignments' });

db.ShiftAssignment.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });
db.ShiftType.hasMany(db.ShiftAssignment, { foreignKey: 'shiftTypeId', as: 'shiftAssignments' });

// ⭐⭐⭐ NEW: Attendance Associations ⭐⭐⭐

// Attendance → Employee
db.Attendance.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.Attendance, { foreignKey: 'employeeId', as: 'attendances' });

// Attendance → ShiftAssignment
db.Attendance.belongsTo(db.ShiftAssignment, { foreignKey: 'shiftAssignmentId', as: 'shiftAssignment' });
db.ShiftAssignment.hasMany(db.Attendance, { foreignKey: 'shiftAssignmentId', as: 'attendances' });

// Attendance → ShiftType
db.Attendance.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });
db.ShiftType.hasMany(db.Attendance, { foreignKey: 'shiftTypeId', as: 'attendances' });

// Attendance → Company
db.Attendance.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.Attendance, { foreignKey: 'companyId', as: 'attendances' });




db.AdditionalSalary.belongsTo(db.Company, { foreignKey: "companyId", as: "company" });
db.AdditionalSalary.belongsTo(db.Department, { foreignKey: "departmentId", as: "department" });
db.AdditionalSalary.belongsTo(db.Employee, { foreignKey: "employeeId", as: "employee" });
db.AdditionalSalary.belongsTo(db.SalaryComponent, { foreignKey: "salaryComponentId", as: "salaryComponent" });



db.HostelAttendanceIncentive.belongsTo(db.Company, { foreignKey: "companyId", as: "company" });
db.HostelAttendanceIncentive.belongsTo(db.Department, { foreignKey: "departmentId", as: "department" });
db.HostelAttendanceIncentive.belongsTo(db.Employee, { foreignKey: "employeeId", as: "employee" });




// ⭐⭐⭐ NEW: User Model Associations ⭐⭐⭐

// User → Company
db.User.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.User, { foreignKey: 'companyId', as: 'users' });

// User → Department
db.User.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
db.Department.hasMany(db.User, { foreignKey: 'departmentId', as: 'users' });

// User → Employee (optional link)
db.User.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasOne(db.User, { foreignKey: 'employeeId', as: 'user' });

// User self-references for createdBy/updatedBy
db.User.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.User, { foreignKey: 'createdBy', as: 'createdUsers' });

db.User.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.User, { foreignKey: 'updatedBy', as: 'updatedUsers' });

// Attendance → User (Approver and other user references)
db.Attendance.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });
db.User.hasMany(db.Attendance, { foreignKey: 'approvedBy', as: 'approvedAttendances' });

db.Attendance.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.Attendance, { foreignKey: 'createdBy', as: 'createdAttendances' });

db.Attendance.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.Attendance, { foreignKey: 'updatedBy', as: 'updatedAttendances' });

// ShiftAssignment → User (for createdBy/updatedBy)
db.ShiftAssignment.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.ShiftAssignment, { foreignKey: 'createdBy', as: 'createdShiftAssignments' });

db.ShiftAssignment.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.ShiftAssignment, { foreignKey: 'updatedBy', as: 'updatedShiftAssignments' });


//salary association
db.SalaryGeneration.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.SalaryGeneration, { foreignKey: 'employeeId', as: 'salaries' });

db.SalaryGeneration.belongsTo(db.EmployeeSalaryMaster, { foreignKey: 'employeeSalaryMasterId', as: 'salaryMaster' });

db.SalaryGeneration.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'generatedBy', as: 'generator' });
db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });
db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'paidBy', as: 'payer' });

db.SalaryGeneration.hasMany(db.SalaryGenerationDetail, { foreignKey: 'salaryGenerationId', as: 'details' });
db.SalaryGenerationDetail.belongsTo(db.SalaryGeneration, { foreignKey: 'salaryGenerationId' });

db.SalaryGenerationDetail.belongsTo(db.SalaryComponent, { foreignKey: 'componentId' });



// ==========================================
// EmployeeLoan Associations
// ==========================================

// EmployeeLoan → Employee (Loan holder)
db.EmployeeLoan.belongsTo(db.Employee, {
  foreignKey: 'employeeId',
  as: 'employee'
});
db.Employee.hasMany(db.EmployeeLoan, {
  foreignKey: 'employeeId',
  as: 'loans'
});

// EmployeeLoan → Employee (Approver)
db.EmployeeLoan.belongsTo(db.Employee, {
  foreignKey: 'approvedBy',
  as: 'approver'
});
db.Employee.hasMany(db.EmployeeLoan, {
  foreignKey: 'approvedBy',
  as: 'approvedLoans'
});

// EmployeeLoan → Company (via Employee relationship)
// This is implicit through the employee, but you can add explicit if needed
db.EmployeeLoan.belongsTo(db.Company, {
  foreignKey: 'companyId',
  as: 'company'
});
db.Company.hasMany(db.EmployeeLoan, {
  foreignKey: 'companyId',
  as: 'employeeLoans'
});



// ==========================================
// AttendanceIncentive Associations ✅
// ==========================================
db.AttendanceIncentive.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.AttendanceIncentive.belongsTo(db.Department, {
  foreignKey: "departmentId",
  as: "department",
});

db.AttendanceIncentive.belongsTo(db.Employee, {
  foreignKey: "employeeId",
  as: "employee",
});

db.AttendanceIncentive.belongsTo(db.ShiftType, {
  foreignKey: "shiftTypeId",
  as: "shiftType",
});

// Optional reverse relations (not required, but good)
db.Company.hasMany(db.AttendanceIncentive, {
  foreignKey: "companyId",
  as: "attendanceIncentives",
});

db.Department.hasMany(db.AttendanceIncentive, {
  foreignKey: "departmentId",
  as: "attendanceIncentives",
});

db.Employee.hasMany(db.AttendanceIncentive, {
  foreignKey: "employeeId",
  as: "attendanceIncentives",
});

db.ShiftType.hasMany(db.AttendanceIncentive, {
  foreignKey: "shiftTypeId",
  as: "attendanceIncentives",
});

// ==========================================
// PackagingIncentive Associations ✅
// ==========================================
db.PackagingIncentive.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.PackagingIncentive.belongsTo(db.Department, {
  foreignKey: "departmentId",
  as: "department",
});

db.PackagingIncentive.belongsTo(db.Employee, {
  foreignKey: "employeeId",
  as: "employee",
});

db.PackagingIncentive.belongsTo(db.ShiftType, {
  foreignKey: "shiftTypeId",
  as: "shiftType",
});

db.Company.hasMany(db.PackagingIncentive, {
  foreignKey: "companyId",
  as: "packagingIncentives",
});

db.Employee.hasMany(db.PackagingIncentive, {
  foreignKey: "employeeId",
  as: "packagingIncentives",
});

// ==========================================
// OT Hours Associations ✅
// ==========================================
db.OTHours.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.OTHours.belongsTo(db.Department, {
  foreignKey: "departmentId",
  as: "department",
});

db.OTHours.belongsTo(db.Employee, {
  foreignKey: "employeeId",
  as: "employee",
});

db.Company.hasMany(db.OTHours, {
  foreignKey: "companyId",
  as: "otHours",
});

db.Department.hasMany(db.OTHours, {
  foreignKey: "departmentId",
  as: "otHours",
});

db.Employee.hasMany(db.OTHours, {
  foreignKey: "employeeId",
  as: "otHours",
});

db.OTHours.belongsTo(db.Department, {
  foreignKey: "workedDeptId",
  as: "workedDepartment",
});

db.OTHours.belongsTo(db.ShiftType, {
  foreignKey: "shiftId",
  as: "shift",
});

db.Department.hasMany(db.OTHours, {
  foreignKey: "workedDeptId",
  as: "workedOtHours",
});

db.ShiftType.hasMany(db.OTHours, {
  foreignKey: "shiftId",
  as: "otHours",
});

// ==========================================
// Eight Eight Entry Associations ✅
// ==========================================
db.EightEightEntry.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});
if (db.DepartmentAttendance.associate) {
  db.DepartmentAttendance.associate(db);
}
if (db.DiscrepancyApproval.associate) {
  db.DiscrepancyApproval.associate(db);
}
db.EightEightEntry.belongsTo(db.Department, {
  foreignKey: "departmentId",
  as: "department",
});
db.EightEightEntry.belongsTo(db.Employee, {
  foreignKey: "employeeId",
  as: "employee",
});
db.EightEightEntry.belongsTo(db.Department, {
  foreignKey: "workedDeptId",
  as: "workedDepartment",
});
db.EightEightEntry.belongsTo(db.ShiftType, {
  foreignKey: "shiftId",
  as: "shift",
});

db.Company.hasMany(db.EightEightEntry, {
  foreignKey: "companyId",
  as: "eightEightEntries",
});
db.Department.hasMany(db.EightEightEntry, {
  foreignKey: "departmentId",
  as: "eightEightEntries",
});
db.Employee.hasMany(db.EightEightEntry, {
  foreignKey: "employeeId",
  as: "eightEightEntries",
});
db.Department.hasMany(db.EightEightEntry, {
  foreignKey: "workedDeptId",
  as: "workedEightEightEntries",
});
db.ShiftType.hasMany(db.EightEightEntry, {
  foreignKey: "shiftId",
  as: "eightEightEntries",
});

// ==========================================
// Attendance Department Associations ✅
// ==========================================
db.Attendance.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
db.Attendance.belongsTo(db.Department, { foreignKey: 'workedDeptId', as: 'workedDepartment' });
db.Department.hasMany(db.Attendance, { foreignKey: 'departmentId', as: 'departmentAttendances' });
db.Department.hasMany(db.Attendance, { foreignKey: 'workedDeptId', as: 'workedDepartmentAttendances' });

// ==========================================
// Lunch Attendance Associations ✅
// ==========================================
db.LunchAttendance.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.LunchAttendance.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.LunchAttendance.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
db.LunchAttendance.belongsTo(db.ShiftType, { foreignKey: 'shiftId', as: 'shift' });

db.Employee.hasMany(db.LunchAttendance, { foreignKey: 'employeeId', as: 'lunchAttendances' });
db.Department.hasMany(db.LunchAttendance, { foreignKey: 'departmentId', as: 'lunchAttendances' });
db.ShiftType.hasMany(db.LunchAttendance, { foreignKey: 'shiftId', as: 'lunchAttendances' });

// ==========================================
// Attendance Incentive Condition Associations ✅
// ==========================================
db.AttendanceIncentiveCondition.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.AttendanceIncentiveCondition.belongsTo(db.Category, { foreignKey: 'categoryId', as: 'category' });
db.AttendanceIncentiveCondition.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;