// controllers/employeeReportsController.js - FIXED VERSION
const { Op } = require('sequelize');
//const sequelize = require('../config/database');
const db = require('../models');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const sequelize = db.sequelize;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const Designation = db.Designation;
const EmploymentType = db.EmploymentType; // Added employment type
const LeaveRequest = db.LeaveRequest;
const LeaveType = db.LeaveType;
const Attendance = db.Attendance;
const BiometricPunch = db.BiometricPunch;

const BiometricDevice = db.BiometricDevice;

// ==========================================
// 1. EMPLOYEE DETAILS REPORT
// ==========================================

exports.getEmployeeDetails = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active',
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    // Build optimized where clause
    const whereClause = {
      status: status
    };

    if (company_id) whereClause.companyId = company_id;
    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Get employees with all associations
    const { count, rows: employees } = await Employee.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'employeeCode', 'firstName', 'lastName',
        'officialEmail', 'mobileNumber', 'dateOfJoining',
        'status', 'companyId', 'departmentId', 'designationId', 'employmentTypeId',
        'dateOfBirth', 'gender', 'bloodGroup', 'maritalStatus',
        'currentAddressLine1', 'currentAddressLine2', 'currentCity', 'currentState', 'currentPincode', 'currentCountry',
        'uanNumber', 'epfNumber', 'esiNumber',
        'bankName', 'bankAccountNumber', 'ifscCode', 'emergencyContactName',
        'emergencyContactNumber', 'emergencyContactRelationship'
      ],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'registrationNumber'],
          required: false
        },
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: db.EmployeeDocument,
          as: 'documents',
          attributes: ['panNumber', 'aadhaarNumber'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['firstName', 'ASC']],
      distinct: true
    });

    // Format response with correct field mappings
    const formattedEmployees = employees.map(emp => {
      const addressText = [
        emp.currentAddressLine1,
        emp.currentAddressLine2,
        emp.currentCity,
        emp.currentState,
        emp.currentPincode,
        emp.currentCountry
      ].filter(Boolean).join(', ') || 'N/A';

      return {
        employee_id: emp.id,
        employee_code: emp.employeeCode,
        employee_name: emp.firstName || '',
        first_name: emp.firstName,
        last_name: '',

        // Company details - YOUR DB uses 'name', not 'company_name'
        company_id: emp.companyId,
        company_name: emp.company?.name || 'N/A',
        company_code: emp.company?.registrationNumber || 'N/A',

        // Department details - YOUR DB uses 'departmentname', not 'department_name'
        department_id: emp.departmentId,
        department_name: emp.department?.departmentname || 'N/A',

        // Designation details - YOUR DB uses 'name'
        designation_id: emp.designationId,
        designation_name: emp.designation?.name || 'N/A',

        // Employment type details - YOUR DB uses 'name', not 'employment_type_name'
        employment_type_id: emp.employmentTypeId,
        employment_type_name: emp.employmentType?.name || 'N/A',

        email: emp.officialEmail || '',
        mobile: emp.mobileNumber || '',
        date_of_joining: emp.dateOfJoining,
        status: emp.status,

        date_of_birth: emp.dateOfBirth,
        gender: emp.gender,
        bloodGroup: emp.bloodGroup,
        maritalStatus: emp.maritalStatus,
        address: addressText,
        pan: emp.documents?.panNumber || 'N/A',
        aadhar: emp.documents?.aadhaarNumber || 'N/A',
        uan: emp.uanNumber || 'N/A',
        esic: emp.esiNumber || 'N/A',
        bankName: emp.bankName || 'N/A',
        accountNumber: emp.bankAccountNumber || 'N/A',
        ifsc: emp.ifscCode || 'N/A',
        emergencyContactName: emp.emergencyContactName || 'N/A',
        emergencyContactNumber: emp.emergencyContactNumber || 'N/A',
        emergencyContactRelation: emp.emergencyContactRelationship || 'N/A'
      };
    });

    return res.json({
      success: true,
      data: formattedEmployees,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get employee details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee details',
      error: error.message || 'Internal server error'
    });
  }
};


// ==========================================
// 2. LEAVE BALANCE REPORT
// ==========================================

// 
exports.getLeaveBalance = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      leave_type_id,
      year = new Date().getFullYear()
    } = req.query;

    console.log('📊 Leave Balance Request:', { company_id, department_id, employee_id, leave_type_id, year });

    // Build employee where clause
    const employeeWhere = {
      status: 'Active'
    };

    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    // Fetch employees
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'companyId', 'departmentId', 'employmentTypeId'],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    console.log(`✅ Found ${employees.length} employees`);

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_employees: 0,
          total_leave_types: 0,
          year: year
        }
      });
    }

    // Fetch leave types for the company
    const leaveTypeWhere = {
      status: 'Active'
    };

    if (company_id) leaveTypeWhere.companyId = company_id;
    if (leave_type_id) leaveTypeWhere.id = leave_type_id;

    const leaveTypes = await LeaveType.findAll({
      where: leaveTypeWhere,
      attributes: ['id', 'name', 'isCarryForwardEnabled'],
      order: [['name', 'ASC']]
    });

    console.log(`✅ Found ${leaveTypes.length} leave types`);


    const LeaveAllocation = db.LeaveAllocation;

    const leaveAllocations = await LeaveAllocation.findAll({
      where: {
        employeeId: employees.map(e => e.id),
        leaveTypeId: leave_type_id ? [leave_type_id] : leaveTypes.map(lt => lt.id),
        companyId: company_id,
        status: 'Active',
        // Filter by year - check if effectiveFrom/effectiveTo falls in the year
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveFrom')), '<=', year),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveTo')), '>=', year)
        ]
      },
      attributes: [
        'id',
        'employeeId',
        'leaveTypeId',
        'allocatedLeaves',
        'carryForwardFromPrevious',
        'usedLeaves',
        'totalAccruedTillDate',
        'maxCarryForwardLimit',
        'enableMonthlyAccrual',
        'monthlyAccrualRate'
      ]
    });

    console.log(`✅ Found ${leaveAllocations.length} leave allocations`);

    // ==========================================
    // BUILD LEAVE BALANCE REPORT
    // ==========================================
    const leaveBalanceReport = [];

    employees.forEach(employee => {
      leaveTypes.forEach(leaveType => {
        // Find allocation for this employee and leave type
        const allocation = leaveAllocations.find(
          a => a.employeeId === employee.id && a.leaveTypeId === leaveType.id
        );

        if (allocation) {
          // Calculate total available using the allocation data
          const allocatedLeaves = parseFloat(allocation.allocatedLeaves || 0);
          const carryForward = parseFloat(allocation.carryForwardFromPrevious || 0);
          const accrued = parseFloat(allocation.totalAccruedTillDate || 0);
          const totalAllowed = allocatedLeaves + carryForward + accrued;

          const totalUsed = parseFloat(allocation.usedLeaves || 0);
          const balance = totalAllowed - totalUsed;

          leaveBalanceReport.push({
            employee_id: employee.id,
            employee_code: employee.employeeCode || 'N/A',
            employee_name: employee.firstName || '',
            company_name: employee.company?.name || 'N/A',
            department_name: employee.department?.name || 'N/A',
            employment_type_name: employee.employmentType?.name || 'N/A',
            leave_type_id: leaveType.id,
            leave_type_name: leaveType.name,
            allocated_leaves: allocatedLeaves,
            carry_forward: carryForward,
            accrued: accrued,
            total_allowed: totalAllowed,
            total_used: totalUsed,
            balance: balance,
            year: year
          });
        } else {
          // No allocation found - show 0s
          leaveBalanceReport.push({
            employee_id: employee.id,
            employee_code: employee.employeeCode || 'N/A',
            employee_name: employee.firstName || '',
            company_name: employee.company?.name || 'N/A',
            department_name: employee.department?.name || 'N/A',
            employment_type_name: employee.employmentType?.name || 'N/A',
            leave_type_id: leaveType.id,
            leave_type_name: leaveType.name,
            allocated_leaves: 0,
            carry_forward: 0,
            accrued: 0,
            total_allowed: 0,
            total_used: 0,
            balance: 0,
            year: year
          });
        }
      });
    });

    console.log(`✅ Generated ${leaveBalanceReport.length} leave balance records`);

    return res.json({
      success: true,
      data: leaveBalanceReport,
      summary: {
        total_employees: employees.length,
        total_leave_types: leaveTypes.length,
        total_allocated: leaveBalanceReport.reduce((sum, item) => sum + item.total_allowed, 0),
        total_used: leaveBalanceReport.reduce((sum, item) => sum + item.total_used, 0),
        total_balance: leaveBalanceReport.reduce((sum, item) => sum + item.balance, 0),
        year: year
      }
    });

  } catch (error) {
    console.error('❌ Get leave balance error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



exports.getLeaveTaken = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      leave_type_id,
      from_date,
      to_date,
      status,
      page = 1,
      limit = 50
    } = req.query;

    // Validate required dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required'
      });
    }

    const offset = (page - 1) * limit;

    // Build employee where clause with correct field names
    const employeeWhere = {};
    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    // Get employees
    const employees = await db.Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeCode', 'firstName', 'lastName']
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      });
    }

    // Build leave request where clause with CORRECT field names
    const leaveWhere = {
      employeeId: employees.map(e => e.id),
      [Op.or]: [
        {
          startDate: { // Changed from from_date to startDate
            [Op.between]: [from_date, to_date]
          }
        },
        {
          endDate: { // Changed from to_date to endDate
            [Op.between]: [from_date, to_date]
          }
        },
        {
          [Op.and]: [
            { startDate: { [Op.lte]: from_date } }, // Changed field name
            { endDate: { [Op.gte]: to_date } }     // Changed field name
          ]
        }
      ]
    };

    if (leave_type_id) leaveWhere.leaveTypeId = leave_type_id;
    if (status) leaveWhere.status = status;

    // Get leave requests with correct model and field names
    const { count, rows: leaves } = await db.LeaveRequest.findAndCountAll({
      where: leaveWhere,
      include: [
        {
          model: db.Employee,
          as: 'Employee', // Changed from 'employee' to 'Employee'
          attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
          include: [
            {
              model: db.Company,
              as: 'company',
              attributes: ['id', 'name']
            },
            { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
            {
              model: db.EmploymentType,
              as: 'employmentType',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: db.LeaveType,
          as: 'LeaveType', // Changed from 'leaveType' to 'LeaveType'
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['startDate', 'DESC']],
      distinct: true
    });

    // Update response formatting to use correct aliases
    const formattedLeaves = leaves.map(leave => ({
      leave_id: leave.id,
      employee_id: leave.employeeId,
      employee_code: leave.Employee?.employeeCode, // Changed from employee to Employee
      employee_name: leave.Employee?.firstName || '',
      company_name: leave.Employee?.company?.name || 'N/A',
      department_name: leave.Employee?.department?.name || 'N/A',
      employment_type_name: leave.Employee?.employmentType?.name || 'N/A',
      leave_type_name: leave.LeaveType?.name || 'N/A', // Changed from leaveType to LeaveType
      from_date: leave.startDate,
      to_date: leave.endDate,
      total_days: leave.totalDays,
      reason: leave.reason,
      status: leave.status,
      applied_date: leave.createdAt,
      approved_by: leave.approvedBy,
      approved_date: leave.approvedAt,
      remarks: leave.remarks
    }));

    return res.json({
      success: true,
      data: formattedLeaves,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get leave taken error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave taken data',
      error: error.message
    });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      from_date,
      to_date,
      attendance_status,
      page = 1,
      limit = 50
    } = req.query;

    // ✅ Validate required dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required"
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // ✅ Build employee filter
    const employeeWhere = {};
    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ["id"]
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {},
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      });
    }

    // ✅ Build attendance filter (FIXED FIELD NAMES)
    const attendanceWhere = {
      employeeId: employees.map(e => e.id),
      attendanceDate: {
        [Op.between]: [from_date, to_date]
      }
    };


    if (attendance_status) attendanceWhere.status = attendance_status;

    attendanceWhere[Op.or] = [
      { firstCheckIn: null },
      { lastCheckOut: { [Op.ne]: null } }
    ];

    // ✅ Fetch attendance
    const { count, rows } = await Attendance.findAndCountAll({
      where: attendanceWhere,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name"]
            },
            { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [["attendanceDate", "DESC"], ["employeeId", "ASC"]],
      distinct: true
    });
    // ✅ Summary calculation
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      late_entries: 0,
      total_records: count
    };

    const formattedAttendance = rows.map(att => {
      // Update summary
      if (att.status === "Present") summary.present++;
      else if (att.status === "Absent") summary.absent++;
      else if (att.status === "Leave") summary.leave++;
      else if (att.status === "Holiday") summary.holiday++;

      if (att.isLate) summary.late_entries++;

      return {
        attendance_id: att.id,
        employee_id: att.employeeId,

        employee_code: att.employee?.employeeCode || "-",
        employee_name:
          att.employee?.firstName || "-",

        company_id: att.employee?.company?.id,
        company_name: att.employee?.company?.name || "N/A",

        department_id: att.employee?.department?.id,
        department_name: att.employee?.department?.departmentname || "N/A",

        attendance_date: att.attendanceDate,
        attendance_status: att.status,

        check_in_time: att.firstCheckIn,
        check_out_time: att.lastCheckOut,

        total_hours: parseFloat(att.workingHours || 0),
        overtime_hours: parseFloat(att.overtimeHours || 0),

        shift_name: att.shiftName,

        is_late: att.isLate,
        late_by_minutes: att.lateByMinutes,

        is_early_exit: att.isEarlyExit,
        early_exit_minutes: att.earlyExitMinutes,

        remarks: att.remarks
      };
    });

    res.json({
      success: true,
      data: formattedAttendance,
      summary,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error("Get attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance report",
      error: error.message
    });
  }
};

// Helper function to calculate late minutes
function calculateLateMinutes(checkInTime) {
  if (!checkInTime) return 0;

  const standardTime = new Date(`2000-01-01 09:30:00`);
  const actualTime = new Date(`2000-01-01 ${checkInTime}`);

  const diffMs = actualTime - standardTime;
  return Math.max(0, Math.floor(diffMs / 60000));
}

// ==========================================
// 5. BIOMETRIC PUNCH REPORT
// ==========================================

exports.getBiometricReport = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, from_date, to_date, punch_type, page = 1, limit = 100 } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, message: 'from_date and to_date are required' });
    }

    const offset = (page - 1) * limit;

    // Build employee filter
    const employeeWhere = {};
    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        },
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },

      ]
    });

    if (!employees.length) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } });
    }

    // Punch filter
    const punchWhere = {
      employeeId: employees.map(e => e.id),
      punchDate: { [Op.between]: [from_date, to_date] }
    };
    if (punch_type) punchWhere.punchType = punch_type;

    const { count, rows: punches } = await BiometricPunch.findAndCountAll({
      where: punchWhere,
      include: [
        {
          model: Employee,
          as: 'employee',  // matches db.BiometricPunch.belongsTo(db.Employee, { as: 'employee' })
          attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
          ]
        },
        {
          model: BiometricDevice,
          as: 'device', // matches db.BiometricPunch.belongsTo(db.BiometricDevice, { as: 'device' })
          attributes: ['id', 'name', 'location']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['punchDate', 'DESC'], ['punchTime', 'DESC']],
      distinct: true
    });

    const formattedPunches = punches.map(p => ({
      punch_id: p.id,
      employee_id: p.employeeId,
      employee_code: p.employee?.employeeCode,
      employee_name: p.employee?.firstName || '',
      company_id: p.employee?.company?.id,
      company_name: p.employee?.company?.name || 'N/A',
      department_id: p.employee?.department?.id,
      department_name: p.employee?.department?.name || 'N/A',
      punch_date: p.punchDate,
      punch_time: p.punchTime,
      punch_type: p.punchType,
      device_name: p.device?.name || 'N/A',
      location: p.device?.location || 'N/A',
      is_late: p.isLate,
      is_early_out: p.isEarlyOut,
      remarks: p.remarks
    }));

    res.json({
      success: true,
      data: formattedPunches,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    });

  } catch (error) {
    console.error('Get biometric report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch biometric report', error: error.message });
  }
};

// ==========================================
// 6. COMPREHENSIVE EMPLOYEE REPORT
// ==========================================// ==========================================
exports.getComprehensiveReport = async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;

    if (!employee_id)
      return res.status(400).json({ success: false, message: 'employee_id is required' });
    if (!from_date || !to_date)
      return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    // Fetch employee with aliases intact
    const employee = await Employee.findOne({
      where: { id: employee_id },
      include: [
        { model: Department, as: 'department', attributes: ['id', ['departmentname', 'name']], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name', 'acronym'] },
        { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'] },
      ],
    });

    if (!employee)
      return res.status(404).json({ success: false, message: 'Employee not found' });

    // Leave types
    const leaveTypes = await LeaveType.findAll();
    const year = new Date(from_date).getFullYear();

    // Leave Data (Used leaves)
    const leaveData = await LeaveRequest.findAll({
      where: {
        employeeId: employee_id,
        status: { [Op.in]: ['Approved', 'Pending'] },
        [Op.or]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('startDate')), year),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('endDate')), year),
        ],
      },
      attributes: [
        'leaveTypeId', // correct column
        [sequelize.fn('SUM', sequelize.col('totalDays')), 'total_used'],
      ],
      group: ['leaveTypeId'],
    });

    // Map leave balance
    const leaveBalance = leaveTypes.map((lt) => {
      const used = leaveData.find((ld) => ld.leaveTypeId === lt.id);
      const totalAllowed = parseFloat(lt.maxConsecutiveLeaves || 0);
      const totalUsed = parseFloat(used?.getDataValue('total_used') || 0);
      return {
        leave_type_name: lt.name,
        total_allowed: totalAllowed,
        total_used: totalUsed,
        balance: totalAllowed - totalUsed,
      };
    });

    // Leaves taken in date range (without alias)
    const leaveTaken = await LeaveRequest.findAll({
      where: {
        employeeId: employee_id,
        [Op.or]: [
          { startDate: { [Op.between]: [from_date, to_date] } },
          { endDate: { [Op.between]: [from_date, to_date] } },
        ],
      },
      include: [
        {
          model: LeaveType, // No alias here
          attributes: ['id', 'name'],
        },
      ],
      order: [['startDate', 'DESC']],
    });

    // Attendance
    const attendance = await Attendance.findAll({
      where: {
        employeeId: employee_id,
        attendanceDate: { [Op.between]: [from_date, to_date] },
      },
      order: [['attendanceDate', 'DESC']],
    });

    // Attendance summary
    const attendanceSummary = {
      present: attendance.filter(a => a.status === 'Present' || a.status === 'Present with Permission').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      leave: attendance.filter(a => a.status === 'Leave').length,
      holiday: attendance.filter(a => a.status === 'Holiday' || a.isHoliday).length,
      late_entries: attendance.filter(a => a.isLate).length,
    };
    const formatTime = (timeString) => {
      if (!timeString) return "N/A";
      const date = new Date(timeString);
      if (isNaN(date)) return "N/A"; // fallback if string is invalid
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };


    const attendanceDetails = attendance.map((a) => ({
      date: a.attendanceDate,
      status: a.status,
      check_in: formatTime(a.firstCheckIn),
      check_out: formatTime(a.lastCheckOut),
      total_hours:
        a.workingHours !== null && a.workingHours !== undefined
          ? Number(a.workingHours).toFixed(2)
          : "N/A",
      is_late: a.isLate || false,
    }));
    console.log(attendanceDetails)

    const report = {
      employee_details: {
        employee_id: employee.id,
        employee_code: employee.employeeCode,
        employee_name: employee.firstName || '',
        first_name: employee.firstName,
        last_name: '',
        email: employee.personalEmail || employee.officialEmail,
        mobile: employee.mobileNumber,
        date_of_birth: employee.dateOfBirth,
        date_of_joining: employee.dateOfJoining,
        gender: employee.gender,
        status: employee.employmentStatus,
        company_id: employee.company?.id || null,
        company_name: employee.company?.name || 'N/A',
        department_id: employee.department?.id || null,
        department_name: employee.department?.name || 'N/A',
        department_code: employee.department?.acronym || 'N/A',
        designation_id: employee.designation?.id || null,
        designation_name: employee.designation?.name || 'N/A',
        designation_code: employee.designation?.acronym || 'N/A',
        employment_type_id: employee.employmentType?.id || null,
        employment_type_name: employee.employmentType?.name || 'N/A',
        pan_number: employee.panNumber,
        aadhar_number: employee.aadharNumber,
        uan_number: employee.uanNumber,
        esic_number: employee.esicNumber,
      },
      leave_balance: leaveBalance,
      leave_taken: leaveTaken.map((l) => ({
        leave_type: l.LeaveType?.name, // Access without alias
        from_date: l.startDate,
        to_date: l.endDate,
        total_days: l.totalDays,
        reason: l.reason,
        status: l.status,
      })),
      attendance_summary: attendanceSummary,
      attendance_details: attendanceDetails,
      report_period: { from_date, to_date },
    };

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get comprehensive report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive report',
      error: error.message,
    });
  }
};
// ==========================================
// 7. EXPORT TO PDF
// ==========================================

// exports.exportEmployeeDetailsPDF = async (req, res) => {
//   try {
//     const { company_id, department_id, employment_type_id, status = 'Active' } = req.query;

//     // Build where clause
//     const whereClause = {};
//     if (company_id) whereClause.companyId = company_id;
//     if (department_id) whereClause.departmentId = department_id;
//     if (employment_type_id) whereClause.employmentTypeId = employment_type_id;
//     if (status) whereClause.status = status;

//     // Fetch employees from database
//     const employees = await Employee.findAll({
//       where: whereClause,
//       attributes: [
//         'id', 'employeeCode', 'firstName', 'lastName',
//         'officialEmail', 'mobileNumber', 'dateOfJoining',
//         'status', 'companyId', 'departmentId', 'designationId', 'employmentTypeId'
//       ],
//       include: [
//         {
//           model: Company,
//           as: 'company',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: Department,
//           as: 'department',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: Designation,
//           as: 'designation',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: EmploymentType,
//           as: 'employmentType',
//           attributes: ['id', 'name'],
//           required: false
//         }
//       ],
//       order: [['firstName', 'ASC']]
//     });

//     // Create PDF
//     const doc = new PDFDocument({ 
//       size: 'A4', 
//       layout: 'landscape',
//       margin: 20,
//       bufferPages: true
//     });

//     // Set up response
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=employee_details.pdf');
//     doc.pipe(res);

//     // Add title
//     doc.fontSize(16).font('Helvetica-Bold')
//        .text('Employee Details Report', { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(10)
//        .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
//     doc.moveDown();

//     // Define columns
//     const columns = [
//       { header: 'Code', width: 60 },
//       { header: 'Name', width: 120 },
//       { header: 'Company', width: 100 }, // Added Company column
//       { header: 'Department', width: 100 },
//       { header: 'Designation', width: 100 },
//       { header: 'Emp Type', width: 80 }, // Added Employment Type
//       { header: 'Email', width: 140 },
//       { header: 'Mobile', width: 80 }
//     ];

//     // Draw header
//     let x = 20;
//     let y = 100;
//     doc.font('Helvetica-Bold').fontSize(9);

//     columns.forEach(col => {
//       doc.text(col.header, x, y, { width: col.width });
//       x += col.width + 5;
//     });

//     // Draw header line
//     y += 15;
//     doc.moveTo(20, y).lineTo(810, y).stroke();
//     y += 10;

//     // Draw rows
//     doc.font('Helvetica').fontSize(8);
//     employees.forEach(emp => {
//       if (y > 500) {
//         doc.addPage();
//         y = 50;

//         // Redraw headers on new page
//         x = 20;
//         doc.font('Helvetica-Bold').fontSize(9);
//         columns.forEach(col => {
//           doc.text(col.header, x, y, { width: col.width });
//           x += col.width + 5;
//         });
//         doc.moveTo(20, y + 15).lineTo(810, y + 15).stroke();
//         y = 80;
//         doc.font('Helvetica').fontSize(8);
//       }

//       // Draw row
//       x = 20;
//       columns.forEach((col, i) => {
//         let value = '';
//         switch(i) {
//           case 0: value = emp.employeeCode || ''; break;
//           case 1: value = `${emp.firstName} ${emp.lastName || ''}`; break;
//           case 2: value = emp.company?.name || 'N/A'; break;
//           case 3: value = emp.department?.name || 'N/A'; break;
//           case 4: value = emp.designation?.name || 'N/A'; break;
//           case 5: value = emp.employmentType?.name || 'N/A'; break;
//           case 6: value = emp.officialEmail || ''; break;
//           case 7: value = emp.mobileNumber || ''; break;
//         }
//         doc.text(value, x, y, { width: col.width });
//         x += col.width + 5;
//       });

//       y += 20;
//     });

//     // Add footer
//     doc.font('Helvetica-Bold').fontSize(10);
//     doc.text(`Total Employees: ${employees.length}`, 20, y + 20);

//     // End document
//     doc.end();

//   } catch (error) {
//     console.error('Export PDF error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to export PDF',
//       error: error.message
//     });
//   }
// };
// ==========================================
// COMPREHENSIVE PDF EXPORT - ALL FIELDS
// ==========================================

exports.exportEmployeeDetailsPDF = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active',
      fields
    } = req.query;

    // Build where clause
    const whereClause = {
      status: status
    };

    if (company_id) whereClause.companyId = company_id;
    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Fetch ALL employee fields
    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: db.EmployeeDocument,
          as: 'documents',
          attributes: ['panNumber', 'aadhaarNumber'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employees found'
      });
    }

    // Create PDF in Portrait mode for more fields
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 30
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_details_filtered.pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(16).font('Helvetica-Bold')
      .text('Complete Employee Details Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(0.5);

    // Add summary
    doc.fontSize(9).font('Helvetica-Bold')
      .text(`Total Employees: ${employees.length}`, { align: 'left' });
    doc.moveDown(0.8);

    const selectedFields = fields ? fields.split(',') : [];
    const showField = (key) => selectedFields.length === 0 || selectedFields.includes(key);

    // Draw each employee as a card/section
    employees.forEach((emp, index) => {
      const leftCol = 40;
      const rightCol = 300;
      const lineHeight = 15;

      // Calculate heights and layout dynamically first
      let leftHeight = 35;
      const personalFields = ['email', 'mobile', 'dob', 'gender', 'bloodGroup', 'maritalStatus'];
      const hasPersonalInfo = personalFields.some(showField);
      if (hasPersonalInfo) {
        leftHeight += lineHeight; // header
        leftHeight += personalFields.filter(showField).length * lineHeight;
        leftHeight += 5; // padding
      }

      let addressText = '';
      if (showField('address')) {
        leftHeight += lineHeight; // header
        addressText = [
          emp.currentAddressLine1,
          emp.currentAddressLine2,
          emp.currentCity,
          emp.currentState,
          emp.currentPincode,
          emp.currentCountry
        ].filter(Boolean).join(', ') || 'N/A';
        const addressLines = Math.ceil(doc.fontSize(8).widthOfString(addressText) / 220) || 1;
        leftHeight += (addressLines * lineHeight) + 5;
      }

      let rightHeight = 35;
      const companyFields = ['company', 'department', 'designation', 'employmentType', 'doj', 'status'];
      const hasCompanyInfo = companyFields.some(showField);
      if (hasCompanyInfo) {
        rightHeight += lineHeight; // header
        rightHeight += companyFields.filter(showField).length * lineHeight;
        rightHeight += 5; // padding
      }
      const statutoryFields = ['pan', 'aadhar', 'uan', 'esic'];
      const hasStatutoryInfo = statutoryFields.some(showField);
      if (hasStatutoryInfo) {
        rightHeight += lineHeight; // header
        rightHeight += statutoryFields.filter(showField).length * lineHeight;
      }

      const boxHeight = Math.max(80, Math.max(leftHeight, rightHeight) + 10);

      // Check if we need a new page
      if (doc.y + boxHeight > 730) {
        doc.addPage();
      }

      const startY = doc.y;

      // Draw box container
      doc.save()
        .rect(30, startY, 535, boxHeight)
        .stroke();

      // Employee header with background
      doc.fillColor('#f0f0f0')
        .rect(30, startY, 535, 25)
        .fill();

      doc.fillColor('#000000')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(
          `${index + 1}. ${emp.employeeCode || 'N/A'} - ${emp.firstName || ''}`,
          40,
          startY + 7
        );

      let yPosLeft = startY + 35;
      let yPosRight = startY + 35;

      doc.fontSize(8).font('Helvetica');

      // Draw LEFT COLUMN
      if (hasPersonalInfo) {
        doc.font('Helvetica-Bold').text('Personal Information:', leftCol, yPosLeft);
        yPosLeft += lineHeight;
        doc.font('Helvetica');

        if (showField('email')) {
          doc.text(`Email: `, leftCol, yPosLeft, { continued: true }).font('Helvetica').text(emp.officialEmail || 'N/A');
          yPosLeft += lineHeight;
        }
        if (showField('mobile')) {
          doc.font('Helvetica').text(`Mobile: `, leftCol, yPosLeft, { continued: true }).text(emp.mobileNumber || 'N/A');
          yPosLeft += lineHeight;
        }
        if (showField('dob')) {
          doc.text(`Date of Birth: `, leftCol, yPosLeft, { continued: true }).text(emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : 'N/A');
          yPosLeft += lineHeight;
        }
        if (showField('gender')) {
          doc.text(`Gender: `, leftCol, yPosLeft, { continued: true }).text(emp.gender || 'N/A');
          yPosLeft += lineHeight;
        }
        if (showField('bloodGroup')) {
          doc.text(`Blood Group: `, leftCol, yPosLeft, { continued: true }).text(emp.bloodGroup || 'N/A');
          yPosLeft += lineHeight;
        }
        if (showField('maritalStatus')) {
          doc.text(`Marital Status: `, leftCol, yPosLeft, { continued: true }).text(emp.maritalStatus || 'N/A');
          yPosLeft += lineHeight;
        }
        yPosLeft += 5;
      }

      if (showField('address')) {
        doc.font('Helvetica-Bold').text('Address:', leftCol, yPosLeft);
        yPosLeft += lineHeight;
        doc.font('Helvetica');
        doc.text(addressText, leftCol, yPosLeft, { width: 220 });
        const addressLines = Math.ceil(doc.fontSize(8).widthOfString(addressText) / 220) || 1;
        yPosLeft += (addressLines * lineHeight) + 5;
      }

      // Draw RIGHT COLUMN
      if (hasCompanyInfo) {
        doc.font('Helvetica-Bold').text('Company Information:', rightCol, yPosRight);
        yPosRight += lineHeight;
        doc.font('Helvetica');

        if (showField('company')) {
          doc.text(`Company: `, rightCol, yPosRight, { continued: true }).text(emp.company?.name || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('department')) {
          doc.text(`Department: `, rightCol, yPosRight, { continued: true }).text(emp.department?.name || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('designation')) {
          doc.text(`Designation: `, rightCol, yPosRight, { continued: true }).text(emp.designation?.name || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('employmentType')) {
          doc.text(`Employment Type: `, rightCol, yPosRight, { continued: true }).text(emp.employmentType?.name || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('doj')) {
          doc.text(`Date of Joining: `, rightCol, yPosRight, { continued: true }).text(emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('status')) {
          doc.text(`Status: `, rightCol, yPosRight, { continued: true }).text(emp.status || 'N/A');
          yPosRight += lineHeight;
        }
        yPosRight += 5;
      }

      if (hasStatutoryInfo) {
        doc.font('Helvetica-Bold').text('Statutory Information:', rightCol, yPosRight);
        yPosRight += lineHeight;
        doc.font('Helvetica');

        if (showField('pan')) {
          doc.text(`PAN: `, rightCol, yPosRight, { continued: true }).text(emp.documents?.panNumber || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('aadhar')) {
          doc.text(`Aadhar: `, rightCol, yPosRight, { continued: true }).text(emp.documents?.aadhaarNumber || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('uan')) {
          doc.text(`UAN: `, rightCol, yPosRight, { continued: true }).text(emp.uanNumber || 'N/A');
          yPosRight += lineHeight;
        }
        if (showField('esic')) {
          doc.text(`ESIC: `, rightCol, yPosRight, { continued: true }).text(emp.esiNumber || 'N/A');
          yPosRight += lineHeight;
        }
      }

      // Move cursor past the box
      doc.y = startY + boxHeight + 15;
    });

    // Footer on last page
    doc.fontSize(8).font('Helvetica')
      .text(`Report Generated: ${new Date().toLocaleString()}`, 30, doc.page.height - 50, {
        align: 'center'
      });

    doc.end();

  } catch (error) {
    console.error('Export PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF',
        error: error.message
      });
    }
  }
};
exports.exportEmployeeDetailsExcel = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active',
      fields
    } = req.query;

    // Build where clause
    const whereClause = {
      status: status
    };

    if (company_id) whereClause.companyId = company_id;
    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Fetch ALL employee fields
    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: db.EmployeeDocument,
          as: 'documents',
          attributes: ['panNumber', 'aadhaarNumber'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employees found'
      });
    }

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HR System';
    workbook.created = new Date();

    // Create worksheet
    const worksheet = workbook.addWorksheet('Employee Details', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Define columns with ALL fields
    let excelColumns = [
      { header: 'Employee Code', key: 'employeeCode', width: 15 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Blood Group', key: 'bloodGroup', width: 12 },
      { header: 'Marital Status', key: 'maritalStatus', width: 15 },

      // Company Information
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Employment Type', key: 'employmentType', width: 15 },
      { header: 'Date of Joining', key: 'doj', width: 15 },
      { header: 'Status', key: 'status', width: 12 },

      // Address
      { header: 'Address', key: 'address', width: 40 },

      // Statutory Information
      { header: 'PAN Number', key: 'pan', width: 15 },
      { header: 'Aadhar Number', key: 'aadhar', width: 15 },
      { header: 'UAN Number', key: 'uan', width: 15 },
      { header: 'ESIC Number', key: 'esic', width: 15 },

      // Bank Information
      { header: 'Bank Name', key: 'bankName', width: 20 },
      { header: 'Account Number', key: 'accountNumber', width: 20 },
      { header: 'IFSC Code', key: 'ifsc', width: 15 },

      // Emergency Contact
      { header: 'Emergency Contact Name', key: 'emergencyContactName', width: 20 },
      { header: 'Emergency Contact Number', key: 'emergencyContactNumber', width: 18 },
      { header: 'Emergency Contact Relation', key: 'emergencyContactRelation', width: 20 }
    ];

    if (fields) {
      const selectedFields = fields.split(',');
      excelColumns = excelColumns.filter(col => {
        if (col.key === 'firstName' || col.key === 'lastName') {
          return selectedFields.includes('fullName');
        }
        if (col.key === 'emergencyContactNumber' || col.key === 'emergencyContactRelation') {
          return selectedFields.includes('emergencyContactName');
        }
        return selectedFields.includes(col.key);
      });
    }

    worksheet.columns = excelColumns;

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Add data rows
    employees.forEach((emp, index) => {
      // Parse address if it's stored as JSON
      const addressText = [
        emp.currentAddressLine1,
        emp.currentAddressLine2,
        emp.currentCity,
        emp.currentState,
        emp.currentPincode,
        emp.currentCountry
      ].filter(Boolean).join(', ') || 'N/A';

      const row = worksheet.addRow({
        employeeCode: emp.employeeCode || '',
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        fullName: emp.getFullName ? emp.getFullName() : `${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`,
        email: emp.officialEmail || '',
        mobile: emp.mobileNumber || '',
        dob: emp.dateOfBirth ? new Date(emp.dateOfBirth) : '',
        gender: emp.gender || '',
        bloodGroup: emp.bloodGroup || '',
        maritalStatus: emp.maritalStatus || '',

        company: emp.company?.name || '',
        department: emp.department?.departmentname || '',
        designation: emp.designation?.name || '',
        employmentType: emp.employmentType?.name || '',
        doj: emp.dateOfJoining ? new Date(emp.dateOfJoining) : '',
        status: emp.status || '',

        address: addressText,

        pan: emp.documents?.panNumber || '',
        aadhar: emp.documents?.aadhaarNumber || '',
        uan: emp.uanNumber || '',
        esic: emp.esiNumber || '',

        bankName: emp.bankName || '',
        accountNumber: emp.bankAccountNumber || '',
        ifsc: emp.ifscCode || '',

        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactNumber: emp.emergencyContactNumber || '',
        emergencyContactRelation: emp.emergencyContactRelationship || ''
      });

      // Format date columns
      if (emp.dateOfBirth) {
        row.getCell('dob').numFmt = 'dd/mm/yyyy';
      }
      if (emp.dateOfJoining) {
        row.getCell('doj').numFmt = 'dd/mm/yyyy';
      }

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
      }

      // Center align specific columns
      row.getCell('gender').alignment = { horizontal: 'center' };
      row.getCell('bloodGroup').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.lastColumn.letter + '1'
    };

    // Freeze first row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Add summary row at the bottom
    const summaryRow = worksheet.addRow({
      employeeCode: '',
      firstName: `TOTAL EMPLOYEES: ${employees.length}`,
      lastName: '',
      fullName: '',
      email: '',
      mobile: '',
      dob: '',
      gender: '',
      bloodGroup: '',
      maritalStatus: '',
      company: '',
      department: '',
      designation: '',
      employmentType: '',
      doj: '',
      status: '',
      address: '',
      pan: '',
      aadhar: '',
      uan: '',
      esic: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: ''
    });

    summaryRow.font = { bold: true, size: 11 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };

    // Add a separate summary sheet
    const summarySheet = workbook.addWorksheet('Summary');

    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'Employee Report Summary';
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.addRow([]);
    summarySheet.addRow(['Total Employees:', employees.length]);
    summarySheet.addRow(['Report Generated:', new Date().toLocaleString()]);
    summarySheet.addRow(['Company:', employees[0]?.company?.name || 'N/A']);

    // Count by status
    const activeCount = employees.filter(e => e.status === 'Active').length;
    const inactiveCount = employees.filter(e => e.status === 'Inactive').length;
    summarySheet.addRow([]);
    summarySheet.addRow(['Active Employees:', activeCount]);
    summarySheet.addRow(['Inactive Employees:', inactiveCount]);

    // Count by employment type
    const employmentTypeCounts = {};
    employees.forEach(emp => {
      const type = emp.employmentType?.name || 'Unknown';
      employmentTypeCounts[type] = (employmentTypeCounts[type] || 0) + 1;
    });

    summarySheet.addRow([]);
    summarySheet.addRow(['By Employment Type:']);
    Object.entries(employmentTypeCounts).forEach(([type, count]) => {
      summarySheet.addRow([type, count]);
    });

    // Count by department
    const deptCounts = {};
    employees.forEach(emp => {
      const dept = emp.department?.name || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    summarySheet.addRow([]);
    summarySheet.addRow(['By Department:']);
    Object.entries(deptCounts).forEach(([dept, count]) => {
      summarySheet.addRow([dept, count]);
    });

    summarySheet.columns = [
      { width: 30 },
      { width: 15 }
    ];

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=employee_details_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export Excel error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export Excel',
        error: error.message
      });
    }
  }
};

// ==========================================
// HELPER: Shared data fetcher for exports
// ==========================================

async function getLeaveBalanceData({ company_id, department_id, employee_id, leave_type_id, year }) {
  const employeeWhere = { status: 'Active' };
  if (company_id) employeeWhere.companyId = company_id;
  if (department_id) employeeWhere.departmentId = department_id;
  if (employee_id) employeeWhere.id = employee_id;

  const employees = await Employee.findAll({
    where: employeeWhere,
    attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'companyId', 'departmentId'],
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name'], required: false },
      { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
      { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'], required: false }
    ]
  });

  const leaveTypeWhere = { status: 'Active' };
  if (company_id) leaveTypeWhere.companyId = company_id;
  if (leave_type_id) leaveTypeWhere.id = leave_type_id;

  const leaveTypes = await LeaveType.findAll({ where: leaveTypeWhere, attributes: ['id', 'name'] });

  const LeaveAllocation = db.LeaveAllocation;
  const leaveAllocations = await LeaveAllocation.findAll({
    where: {
      employeeId: employees.map(e => e.id),
      leaveTypeId: leave_type_id ? [leave_type_id] : leaveTypes.map(lt => lt.id),
      companyId: company_id,
      status: 'Active',
      [Op.and]: [
        sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveFrom')), '<=', year),
        sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveTo')), '>=', year)
      ]
    },
    attributes: ['employeeId', 'leaveTypeId', 'allocatedLeaves', 'carryForwardFromPrevious', 'usedLeaves', 'totalAccruedTillDate']
  });

  const rows = [];
  employees.forEach(employee => {
    leaveTypes.forEach(leaveType => {
      const allocation = leaveAllocations.find(a => a.employeeId === employee.id && a.leaveTypeId === leaveType.id);
      const allocatedLeaves = parseFloat(allocation?.allocatedLeaves || 0);
      const carryForward = parseFloat(allocation?.carryForwardFromPrevious || 0);
      const accrued = parseFloat(allocation?.totalAccruedTillDate || 0);
      const totalAllowed = allocatedLeaves + carryForward + accrued;
      const totalUsed = parseFloat(allocation?.usedLeaves || 0);
      rows.push({
        employee_code: employee.employeeCode || 'N/A',
        employee_name: employee.firstName || '',
        company_name: employee.company?.name || 'N/A',
        department_name: employee.department?.name || 'N/A',
        employment_type_name: employee.employmentType?.name || 'N/A',
        leave_type_name: leaveType.name,
        allocated_leaves: allocatedLeaves,
        carry_forward: carryForward,
        accrued,
        total_allowed: totalAllowed,
        total_used: totalUsed,
        balance: totalAllowed - totalUsed,
        year
      });
    });
  });
  return rows;
}

// ==========================================
// LEAVE BALANCE EXPORTS
// ==========================================

exports.exportLeaveBalancePDF = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, leave_type_id, year = new Date().getFullYear() } = req.query;
    if (!company_id) return res.status(400).json({ success: false, message: 'company_id is required' });

    const data = await getLeaveBalanceData({ company_id, department_id, employee_id, leave_type_id, year });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave_balance_${year}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text(`Leave Balance Report - ${year}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const cols = [
      { label: 'Emp Code', width: 65 },
      { label: 'Name', width: 110 },
      { label: 'Department', width: 90 },
      { label: 'Leave Type', width: 90 },
      { label: 'Allocated', width: 60 },
      { label: 'Carry Fwd', width: 60 },
      { label: 'Used', width: 55 },
      { label: 'Balance', width: 60 }
    ];

    const drawRow = (row, y, isHeader = false) => {
      let x = 30;
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      if (isHeader) {
        doc.fillColor('#366092').rect(30, y - 3, cols.reduce((s, c) => s + c.width + 4, 0), 18).fill();
        doc.fillColor('#FFFFFF');
      } else {
        doc.fillColor('#000000');
      }
      row.forEach((val, i) => {
        doc.text(String(val), x, y, { width: cols[i].width });
        x += cols[i].width + 4;
      });
      doc.fillColor('#000000');
    };

    const headerRow = cols.map(c => c.label);
    drawRow(headerRow, doc.y, true);
    doc.moveDown(0.8);

    data.forEach((item, idx) => {
      if (doc.y > 510) { doc.addPage(); drawRow(headerRow, doc.y, true); doc.moveDown(0.8); }
      if (idx % 2 === 0) {
        doc.fillColor('#F5F5F5').rect(30, doc.y - 2, cols.reduce((s, c) => s + c.width + 4, 0), 14).fill();
        doc.fillColor('#000000');
      }
      drawRow([
        item.employee_code, item.employee_name, item.department_name,
        item.leave_type_name, item.allocated_leaves, item.carry_forward,
        item.total_used, item.balance
      ], doc.y);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('exportLeaveBalancePDF error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportLeaveBalanceExcel = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, leave_type_id, year = new Date().getFullYear() } = req.query;
    if (!company_id) return res.status(400).json({ success: false, message: 'company_id is required' });

    const data = await getLeaveBalanceData({ company_id, department_id, employee_id, leave_type_id, year });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Leave Balance');
    ws.columns = [
      { header: 'Employee Code', key: 'employee_code', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 25 },
      { header: 'Company', key: 'company_name', width: 20 },
      { header: 'Department', key: 'department_name', width: 20 },
      { header: 'Employment Type', key: 'employment_type_name', width: 18 },
      { header: 'Leave Type', key: 'leave_type_name', width: 20 },
      { header: 'Allocated', key: 'allocated_leaves', width: 12 },
      { header: 'Carry Forward', key: 'carry_forward', width: 14 },
      { header: 'Accrued', key: 'accrued', width: 12 },
      { header: 'Total Allowed', key: 'total_allowed', width: 14 },
      { header: 'Used', key: 'total_used', width: 10 },
      { header: 'Balance', key: 'balance', width: 12 },
      { header: 'Year', key: 'year', width: 8 }
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    ws.getRow(1).height = 22;

    data.forEach((item, idx) => {
      const row = ws.addRow(item);
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });

    ws.autoFilter = { from: 'A1', to: 'M1' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leave_balance_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportLeaveBalanceExcel error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// LEAVE TAKEN EXPORTS
// ==========================================

async function getLeaveTakenData({ company_id, department_id, employee_id, leave_type_id, from_date, to_date, status }) {
  const employeeWhere = {};
  if (company_id) employeeWhere.companyId = company_id;
  if (department_id) employeeWhere.departmentId = department_id;
  if (employee_id) employeeWhere.id = employee_id;

  const employees = await Employee.findAll({ where: employeeWhere, attributes: ['id'] });
  if (!employees.length) return [];

  const leaveWhere = {
    employeeId: employees.map(e => e.id),
    [Op.or]: [
      { startDate: { [Op.between]: [from_date, to_date] } },
      { endDate: { [Op.between]: [from_date, to_date] } },
      { [Op.and]: [{ startDate: { [Op.lte]: from_date } }, { endDate: { [Op.gte]: to_date } }] }
    ]
  };
  if (leave_type_id) leaveWhere.leaveTypeId = leave_type_id;
  if (status) leaveWhere.status = status;

  const leaves = await LeaveRequest.findAll({
    where: leaveWhere,
    include: [
      {
        model: Employee, as: 'Employee', attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
          { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'] }
        ]
      },
      { model: LeaveType, as: 'LeaveType', attributes: ['id', 'name'] }
    ],
    order: [['startDate', 'DESC']]
  });

  return leaves.map(l => ({
    employee_code: l.Employee?.employeeCode || 'N/A',
    employee_name: l.Employee?.firstName || '',
    company_name: l.Employee?.company?.name || 'N/A',
    department_name: l.Employee?.department?.name || 'N/A',
    employment_type_name: l.Employee?.employmentType?.name || 'N/A',
    leave_type_name: l.LeaveType?.name || 'N/A',
    from_date: l.startDate,
    to_date: l.endDate,
    total_days: l.totalDays,
    reason: l.reason || '',
    status: l.status,
    applied_date: l.createdAt
  }));
}

exports.exportLeaveTakenPDF = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, leave_type_id, from_date, to_date, status } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getLeaveTakenData({ company_id, department_id, employee_id, leave_type_id, from_date, to_date, status });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave_taken_${from_date}_${to_date}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Leave Taken Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`Period: ${from_date} to ${to_date}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const cols = [
      { label: 'Emp Code', width: 65 }, { label: 'Name', width: 100 },
      { label: 'Department', width: 90 }, { label: 'Leave Type', width: 90 },
      { label: 'From', width: 70 }, { label: 'To', width: 70 },
      { label: 'Days', width: 40 }, { label: 'Status', width: 65 }
    ];

    const totalWidth = cols.reduce((s, c) => s + c.width + 4, 0);

    const drawHeader = (y) => {
      doc.fillColor('#366092').rect(30, y - 3, totalWidth, 18).fill();
      let x = 30;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      cols.forEach(c => { doc.text(c.label, x, y, { width: c.width }); x += c.width + 4; });
      doc.fillColor('#000000');
    };

    drawHeader(doc.y);
    doc.moveDown(0.8);

    data.forEach((item, idx) => {
      if (doc.y > 510) { doc.addPage(); drawHeader(doc.y); doc.moveDown(0.8); }
      if (idx % 2 === 0) {
        doc.fillColor('#F5F5F5').rect(30, doc.y - 2, totalWidth, 14).fill();
        doc.fillColor('#000000');
      }
      let x = 30;
      doc.font('Helvetica').fontSize(8);
      [
        item.employee_code, item.employee_name, item.department_name, item.leave_type_name,
        item.from_date ? new Date(item.from_date).toLocaleDateString() : '',
        item.to_date ? new Date(item.to_date).toLocaleDateString() : '',
        item.total_days, item.status
      ].forEach((val, i) => { doc.text(String(val ?? ''), x, doc.y, { width: cols[i].width }); x += cols[i].width + 4; });
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('exportLeaveTakenPDF error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportLeaveTakenExcel = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, leave_type_id, from_date, to_date, status } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getLeaveTakenData({ company_id, department_id, employee_id, leave_type_id, from_date, to_date, status });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Leave Taken');
    ws.columns = [
      { header: 'Employee Code', key: 'employee_code', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 25 },
      { header: 'Company', key: 'company_name', width: 20 },
      { header: 'Department', key: 'department_name', width: 20 },
      { header: 'Employment Type', key: 'employment_type_name', width: 18 },
      { header: 'Leave Type', key: 'leave_type_name', width: 20 },
      { header: 'From Date', key: 'from_date', width: 14 },
      { header: 'To Date', key: 'to_date', width: 14 },
      { header: 'Total Days', key: 'total_days', width: 12 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Status', key: 'status', width: 14 }
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    ws.getRow(1).height = 22;

    data.forEach((item, idx) => {
      const row = ws.addRow({ ...item, from_date: item.from_date ? new Date(item.from_date) : '', to_date: item.to_date ? new Date(item.to_date) : '' });
      row.getCell('from_date').numFmt = 'dd/mm/yyyy';
      row.getCell('to_date').numFmt = 'dd/mm/yyyy';
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });

    ws.autoFilter = { from: 'A1', to: 'K1' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leave_taken_${from_date}_${to_date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportLeaveTakenExcel error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ATTENDANCE EXPORTS
// ==========================================

async function getAttendanceExportData({ company_id, department_id, employee_id, from_date, to_date, attendance_status }) {
  const employeeWhere = {};
  if (company_id) employeeWhere.companyId = company_id;
  if (department_id) employeeWhere.departmentId = department_id;
  if (employee_id) employeeWhere.id = employee_id;

  const employees = await Employee.findAll({ where: employeeWhere, attributes: ['id'] });
  if (!employees.length) return [];

  const attendanceWhere = {
    employeeId: employees.map(e => e.id),
    attendanceDate: { [Op.between]: [from_date, to_date] }
  };
  if (attendance_status) attendanceWhere.status = attendance_status;

  attendanceWhere[Op.or] = [
    { firstCheckIn: null },
    { lastCheckOut: { [Op.ne]: null } }
  ];

  const rows = await Attendance.findAll({
    where: attendanceWhere,
    include: [
      {
        model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false }
        ]
      }
    ],
    order: [['attendanceDate', 'DESC'], ['employeeId', 'ASC']]
  });

  return rows.map(att => ({
    attendance_date: att.attendanceDate,
    employee_code: att.employee?.employeeCode || '',
    employee_name: att.employee?.firstName || '',
    company_name: att.employee?.company?.name || 'N/A',
    department_name: att.employee?.department?.departmentname || 'N/A',
    status: att.status,
    check_in: att.firstCheckIn,
    check_out: att.lastCheckOut,
    total_hours: att.workingHours != null ? Number(att.workingHours).toFixed(2) : 'N/A',
    overtime_hours: att.overtimeHours != null ? Number(att.overtimeHours).toFixed(2) : '0',
    is_late: att.isLate ? 'Yes' : 'No',
    late_by_minutes: att.lateByMinutes || 0,
    shift_name: att.shiftName || '',
    remarks: att.remarks || ''
  }));
}

exports.exportAttendancePDF = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, from_date, to_date, attendance_status } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getAttendanceExportData({ company_id, department_id, employee_id, from_date, to_date, attendance_status });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${from_date}_${to_date}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`Period: ${from_date} to ${to_date}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const cols = [
      { label: 'Emp Code', width: 65 }, { label: 'Name', width: 110 },
      { label: 'Department', width: 95 }, { label: 'Status', width: 70 },
      { label: 'Check In', width: 70 }, { label: 'Check Out', width: 70 },
      { label: 'Hours', width: 55 }, { label: 'Late', width: 45 },
      { label: 'Late(min)', width: 65 }
    ];
    const totalWidth = cols.reduce((s, c) => s + c.width + 4, 0);

    const drawHeader = (y) => {
      doc.fillColor('#366092').rect(30, y - 3, totalWidth, 16).fill();
      let x = 30;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      cols.forEach(c => { doc.text(c.label, x, y, { width: c.width }); x += c.width + 4; });
      doc.fillColor('#000000');
      doc.y = y + 16;
    };

    // Group by Date, then Shift
    const grouped = {};
    data.forEach(item => {
      const rawDate = item.attendance_date ? new Date(item.attendance_date).toISOString().split('T')[0] : 'Unknown';
      if (!grouped[rawDate]) grouped[rawDate] = {};
      const shiftName = item.shift_name || 'Unassigned';
      if (!grouped[rawDate][shiftName]) grouped[rawDate][shiftName] = [];
      grouped[rawDate][shiftName].push(item);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((rawDate) => {
      const formattedDate = rawDate !== 'Unknown' ? new Date(rawDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';

      if (doc.y > 500) {
        doc.addPage();
      }

      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F4E79').text(`Date: ${formattedDate}`, 30);
      doc.fillColor('#000000');
      doc.moveDown(0.2);

      const shifts = grouped[rawDate];
      Object.keys(shifts).sort().forEach((shiftName) => {
        const records = shifts[shiftName];
        if (!records.length) return;

        if (doc.y > 500) {
          doc.addPage();
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#595959').text(`  Shift: ${shiftName}`, 30);
        doc.fillColor('#000000');
        doc.moveDown(0.3);

        drawHeader(doc.y);
        doc.moveDown(0.8);

        records.forEach((item, idx) => {
          if (doc.y > 510) {
            doc.addPage();
            drawHeader(doc.y);
            doc.moveDown(0.8);
          }
          if (idx % 2 === 0) {
            doc.fillColor('#F5F5F5').rect(30, doc.y - 2, totalWidth, 14).fill();
            doc.fillColor('#000000');
          }
          let x = 30;
          doc.font('Helvetica').fontSize(8);

          const checkInStr = item.check_in ? new Date(item.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
          const checkOutStr = item.check_out ? new Date(item.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';

          const startY = doc.y;
          [
            item.employee_code,
            item.employee_name,
            item.department_name,
            item.status,
            checkInStr,
            checkOutStr,
            item.total_hours !== 'N/A' ? `${Number(item.total_hours).toFixed(2)}h` : 'N/A',
            item.is_late || 'No',
            item.late_by_minutes ? `${item.late_by_minutes}m` : '-'
          ].forEach((val, i) => {
            doc.text(String(val ?? ''), x, startY, { width: cols[i].width });
            x += cols[i].width + 4;
          });
          doc.y = startY + 14;
        });

        doc.moveDown(0.5);
      });
    });

    doc.end();
  } catch (error) {
    console.error('exportAttendancePDF error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportAttendanceExcel = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, from_date, to_date, attendance_status } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getAttendanceExportData({ company_id, department_id, employee_id, from_date, to_date, attendance_status });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Attendance');
    ws.columns = [
      { header: 'Date', key: 'attendance_date', width: 14 },
      { header: 'Employee Code', key: 'employee_code', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 25 },
      { header: 'Company', key: 'company_name', width: 20 },
      { header: 'Department', key: 'department_name', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Check In', key: 'check_in', width: 14 },
      { header: 'Check Out', key: 'check_out', width: 14 },
      { header: 'Total Hours', key: 'total_hours', width: 12 },
      { header: 'Is Late', key: 'is_late', width: 10 },
      { header: 'Late By (min)', key: 'late_by_minutes', width: 14 },
      { header: 'Remarks', key: 'remarks', width: 25 }
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    ws.getRow(1).height = 22;

    const grouped = {};
    data.forEach(item => {
      const rawDate = item.attendance_date ? new Date(item.attendance_date).toISOString().split('T')[0] : 'Unknown';
      if (!grouped[rawDate]) grouped[rawDate] = {};
      const shiftName = item.shift_name || 'Unassigned';
      if (!grouped[rawDate][shiftName]) grouped[rawDate][shiftName] = [];
      grouped[rawDate][shiftName].push(item);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    let rn = 2;
    sortedDates.forEach((rawDate) => {
      const formattedDate = rawDate !== 'Unknown' ? new Date(rawDate).toLocaleDateString('en-GB') : 'Unknown';

      const dateRow = ws.addRow({ attendance_date: `DATE: ${formattedDate}` });
      dateRow.font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } };
      rn++;

      const shifts = grouped[rawDate];
      Object.keys(shifts).sort().forEach((shiftName) => {
        const records = shifts[shiftName];
        if (!records.length) return;

        const shiftRow = ws.addRow({ attendance_date: `  SHIFT: ${shiftName}` });
        shiftRow.font = { bold: true, size: 10, color: { argb: 'FF595959' } };
        rn++;

        const headersRow = ws.addRow([
          'Date', 'Employee Code', 'Employee Name', 'Company', 'Department', 'Status',
          'Check In', 'Check Out', 'Total Hours', 'Is Late', 'Late By (min)', 'Remarks'
        ]);
        headersRow.font = { bold: true };
        headersRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        rn++;

        records.forEach((item, idx) => {
          const rowData = {
            ...item,
            attendance_date: item.attendance_date ? new Date(item.attendance_date) : '',
            check_in: item.check_in ? new Date(item.check_in) : '',
            check_out: item.check_out ? new Date(item.check_out) : '',
            late_by_minutes: item.is_late === 'Yes' && item.late_by_minutes > 0 ? item.late_by_minutes : '-'
          };
          const row = ws.addRow(rowData);
          row.getCell('attendance_date').numFmt = 'dd/mm/yyyy';
          if (rowData.check_in) row.getCell('check_in').numFmt = 'hh:mm AM/PM';
          if (rowData.check_out) row.getCell('check_out').numFmt = 'hh:mm AM/PM';

          if (idx % 2 === 0) {
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          }
          rn++;
        });

        ws.addRow([]);
        rn++;
      });
      ws.addRow([]);
      rn++;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${from_date}_${to_date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportAttendanceExcel error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// BIOMETRIC EXPORTS
// ==========================================

async function getBiometricExportData({ company_id, department_id, employee_id, from_date, to_date, punch_type }) {
  const employeeWhere = {};
  if (company_id) employeeWhere.companyId = company_id;
  if (department_id) employeeWhere.departmentId = department_id;
  if (employee_id) employeeWhere.id = employee_id;

  const employees = await Employee.findAll({ where: employeeWhere, attributes: ['id'] });
  if (!employees.length) return [];

  const punchWhere = {
    employeeId: employees.map(e => e.id),
    punchDate: { [Op.between]: [from_date, to_date] }
  };
  if (punch_type) punchWhere.punchType = punch_type;

  const punches = await BiometricPunch.findAll({
    where: punchWhere,
    include: [
      {
        model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false }
        ]
      },
      { model: BiometricDevice, as: 'device', attributes: ['id', 'name', 'location'] }
    ],
    order: [['punchDate', 'DESC'], ['punchTime', 'DESC']]
  });

  return punches.map(p => ({
    punch_date: p.punchDate,
    punch_time: p.punchTime,
    employee_code: p.employee?.employeeCode || '',
    employee_name: p.employee?.firstName || '',
    company_name: p.employee?.company?.name || 'N/A',
    department_name: p.employee?.department?.name || 'N/A',
    punch_type: p.punchType,
    device_name: p.device?.name || 'N/A',
    location: p.device?.location || 'N/A',
    is_late: p.isLate ? 'Yes' : 'No',
    is_early_out: p.isEarlyOut ? 'Yes' : 'No'
  }));
}

exports.exportBiometricPDF = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, from_date, to_date, punch_type } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getBiometricExportData({ company_id, department_id, employee_id, from_date, to_date, punch_type });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=biometric_${from_date}_${to_date}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Biometric Punch Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`Period: ${from_date} to ${to_date}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const cols = [
      { label: 'Date', width: 65 }, { label: 'Time', width: 60 },
      { label: 'Emp Code', width: 65 }, { label: 'Name', width: 105 },
      { label: 'Department', width: 90 }, { label: 'Type', width: 45 },
      { label: 'Device', width: 90 }, { label: 'Location', width: 90 }
    ];
    const totalWidth = cols.reduce((s, c) => s + c.width + 3, 0);

    const drawHeader = (y) => {
      doc.fillColor('#366092').rect(30, y - 3, totalWidth, 18).fill();
      let x = 30;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      cols.forEach(c => { doc.text(c.label, x, y, { width: c.width }); x += c.width + 3; });
      doc.fillColor('#000000');
    };

    drawHeader(doc.y);
    doc.moveDown(0.8);

    data.forEach((item, idx) => {
      if (doc.y > 510) { doc.addPage(); drawHeader(doc.y); doc.moveDown(0.8); }
      if (idx % 2 === 0) {
        doc.fillColor('#F5F5F5').rect(30, doc.y - 2, totalWidth, 14).fill();
        doc.fillColor('#000000');
      }
      let x = 30;
      doc.font('Helvetica').fontSize(8);
      [
        item.punch_date ? new Date(item.punch_date).toLocaleDateString() : '',
        item.punch_time || '', item.employee_code, item.employee_name,
        item.department_name, item.punch_type, item.device_name, item.location
      ].forEach((val, i) => { doc.text(String(val ?? ''), x, doc.y, { width: cols[i].width }); x += cols[i].width + 3; });
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('exportBiometricPDF error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportBiometricExcel = async (req, res) => {
  try {
    const { company_id, department_id, employee_id, from_date, to_date, punch_type } = req.query;
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const data = await getBiometricExportData({ company_id, department_id, employee_id, from_date, to_date, punch_type });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Biometric Punches');
    ws.columns = [
      { header: 'Date', key: 'punch_date', width: 14 },
      { header: 'Time', key: 'punch_time', width: 12 },
      { header: 'Employee Code', key: 'employee_code', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 25 },
      { header: 'Company', key: 'company_name', width: 20 },
      { header: 'Department', key: 'department_name', width: 20 },
      { header: 'Punch Type', key: 'punch_type', width: 12 },
      { header: 'Device', key: 'device_name', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Is Late', key: 'is_late', width: 10 },
      { header: 'Early Out', key: 'is_early_out', width: 12 }
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    ws.getRow(1).height = 22;

    data.forEach((item, idx) => {
      const row = ws.addRow({ ...item, punch_date: item.punch_date ? new Date(item.punch_date) : '' });
      row.getCell('punch_date').numFmt = 'dd/mm/yyyy';
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });

    ws.autoFilter = { from: 'A1', to: 'K1' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=biometric_${from_date}_${to_date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportBiometricExcel error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// COMPREHENSIVE EXPORTS
// ==========================================

exports.exportComprehensivePDF = async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;
    if (!employee_id) return res.status(400).json({ success: false, message: 'employee_id is required' });
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    // Re-use the getComprehensiveReport logic by calling it internally
    const employee = await Employee.findOne({
      where: { id: employee_id },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name'] },
        { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ]
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const attendance = await Attendance.findAll({
      where: { employeeId: employee_id, attendanceDate: { [Op.between]: [from_date, to_date] } },
      order: [['attendanceDate', 'ASC']]
    });

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprehensive_${employee.employeeCode}_${from_date}_${to_date}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Comprehensive Employee Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`Period: ${from_date} to ${to_date}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Employee Info Box
    doc.fillColor('#366092').rect(40, doc.y, 515, 20).fill();
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
      .text('Employee Information', 48, doc.y - 15);
    doc.fillColor('#000000').moveDown(0.5);

    const emp = employee;
    const fields = [
      ['Employee Code', emp.employeeCode], ['Name', emp.firstName || ''],
      ['Company', emp.company?.name || 'N/A'], ['Department', emp.department?.name || 'N/A'],
      ['Designation', emp.designation?.name || 'N/A'], ['Employment Type', emp.employmentType?.name || 'N/A'],
      ['Date of Joining', emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : 'N/A'],
      ['Email', emp.officialEmail || 'N/A'], ['Mobile', emp.mobileNumber || 'N/A']
    ];

    doc.font('Helvetica').fontSize(9);
    fields.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 40 : 300;
      if (i % 2 === 0 && i > 0) doc.moveDown(0.4);
      doc.font('Helvetica-Bold').text(`${label}: `, x, doc.y, { continued: true })
        .font('Helvetica').text(String(value || 'N/A'));
    });
    doc.moveDown(1);

    // Attendance Summary
    const summary = {
      Present: attendance.filter(a => a.status === 'Present').length,
      Absent: attendance.filter(a => a.status === 'Absent').length,
      Leave: attendance.filter(a => a.status === 'Leave').length,
      Holiday: attendance.filter(a => a.status === 'Holiday').length,
      'Late Entries': attendance.filter(a => a.isLate).length
    };

    doc.fillColor('#366092').rect(40, doc.y, 515, 20).fill();
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('Attendance Summary', 48, doc.y - 15);
    doc.fillColor('#000000').moveDown(0.5);

    const summaryEntries = Object.entries(summary);
    const boxW = 95, boxH = 40, startX = 40;
    summaryEntries.forEach(([label, val], i) => {
      const x = startX + i * (boxW + 5);
      doc.fillColor('#F0F4FF').rect(x, doc.y, boxW, boxH).fill();
      doc.fillColor('#366092').fontSize(8).font('Helvetica-Bold').text(label, x + 5, doc.y - boxH + 8, { width: boxW - 10, align: 'center' });
      doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text(String(val), x + 5, doc.y - 20, { width: boxW - 10, align: 'center' });
    });
    doc.fillColor('#000000').moveDown(2);

    // Attendance Detail Table
    if (attendance.length > 0) {
      doc.fillColor('#366092').rect(40, doc.y, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('Attendance Details', 48, doc.y - 15);
      doc.fillColor('#000000').moveDown(0.5);

      const aCols = [
        { label: 'Date', width: 75 }, { label: 'Status', width: 75 },
        { label: 'Check In', width: 80 }, { label: 'Check Out', width: 80 },
        { label: 'Hours', width: 60 }, { label: 'Late', width: 50 }
      ];

      // Header
      let ax = 40;
      doc.fillColor('#E8EDF4').rect(40, doc.y - 2, 515, 16).fill();
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
      aCols.forEach(c => { doc.text(c.label, ax, doc.y - 2, { width: c.width }); ax += c.width + 5; });
      doc.moveDown(0.7);

      attendance.forEach((att, idx) => {
        if (doc.y > 720) {
          doc.addPage();
          ax = 40;
          doc.fillColor('#E8EDF4').rect(40, doc.y - 2, 515, 16).fill();
          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
          aCols.forEach(c => { doc.text(c.label, ax, doc.y - 2, { width: c.width }); ax += c.width + 5; });
          doc.moveDown(0.7);
        }
        if (idx % 2 === 0) {
          doc.fillColor('#F9F9F9').rect(40, doc.y - 2, 515, 13).fill();
          doc.fillColor('#000000');
        }
        ax = 40;
        doc.font('Helvetica').fontSize(8);
        [
          att.attendanceDate ? new Date(att.attendanceDate).toLocaleDateString() : '',
          att.status || '',
          att.firstCheckIn ? new Date(att.firstCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          att.lastCheckOut ? new Date(att.lastCheckOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
          att.workingHours != null ? Number(att.workingHours).toFixed(2) : 'N/A',
          att.isLate ? `⚠ ${att.lateByMinutes || 0}m` : '✓'
        ].forEach((val, i) => { doc.text(String(val), ax, doc.y, { width: aCols[i].width }); ax += aCols[i].width + 5; });
        doc.moveDown(0.55);
      });
    }

    doc.end();
  } catch (error) {
    console.error('exportComprehensivePDF error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportComprehensiveExcel = async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;
    if (!employee_id) return res.status(400).json({ success: false, message: 'employee_id is required' });
    if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'from_date and to_date are required' });

    const employee = await Employee.findOne({
      where: { id: employee_id },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name']], required: false },
        { model: Designation, as: 'designation', attributes: ['id', 'name'] },
        { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ]
    });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const attendance = await Attendance.findAll({
      where: { employeeId: employee_id, attendanceDate: { [Op.between]: [from_date, to_date] } },
      order: [['attendanceDate', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Employee Info
    const infoSheet = workbook.addWorksheet('Employee Info');
    infoSheet.columns = [{ width: 25 }, { width: 35 }];
    infoSheet.addRow(['Field', 'Value']).font = { bold: true };
    infoSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    infoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    [
      ['Employee Code', employee.employeeCode],
      ['Full Name', employee.getFullName ? employee.getFullName() : `${employee.firstName} ${employee.middleName ? employee.middleName + ' ' : ''}${employee.lastName}`],
      ['Company', employee.company?.name || 'N/A'],
      ['Department', employee.department?.name || 'N/A'],
      ['Designation', employee.designation?.name || 'N/A'],
      ['Employment Type', employee.employmentType?.name || 'N/A'],
      ['Date of Joining', employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A'],
      ['Email', employee.officialEmail || 'N/A'],
      ['Mobile', employee.mobileNumber || 'N/A'],
      ['Report Period', `${from_date} to ${to_date}`]
    ].forEach(([f, v]) => infoSheet.addRow([f, v]));

    // Sheet 2: Attendance
    const attSheet = workbook.addWorksheet('Attendance');
    attSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Check In', key: 'check_in', width: 14 },
      { header: 'Check Out', key: 'check_out', width: 14 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Shift', key: 'shift', width: 16 },
      { header: 'Is Late', key: 'is_late', width: 10 },
      { header: 'Late By (min)', key: 'late_by', width: 14 },
      { header: 'Remarks', key: 'remarks', width: 25 }
    ];
    attSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    attSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    attSheet.getRow(1).height = 22;

    attendance.forEach((att, idx) => {
      const row = attSheet.addRow({
        date: att.attendanceDate ? new Date(att.attendanceDate) : '',
        status: att.status,
        check_in: att.firstCheckIn ? new Date(att.firstCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        check_out: att.lastCheckOut ? new Date(att.lastCheckOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        working_hours: att.workingHours != null ? Number(att.workingHours).toFixed(2) : 'N/A',
        shift: att.shiftName || '',
        is_late: att.isLate ? 'Yes' : 'No',
        late_by: att.isLate && att.lateByMinutes > 0 ? att.lateByMinutes : '-',
        remarks: att.remarks || ''
      });
      row.getCell('date').numFmt = 'dd/mm/yyyy';
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });

    attSheet.autoFilter = { from: 'A1', to: 'I1' };
    attSheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=comprehensive_${employee.employeeCode}_${from_date}_${to_date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportComprehensiveExcel error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDiscrepancyReport = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      from_date,
      to_date,
      page = 1,
      limit = 50
    } = req.query;

    if (!from_date || !to_date || !company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id, from_date and to_date are required"
      });
    }

    const moment = require("moment");
    const DepartmentAttendance = db.DepartmentAttendance;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 1. Filter active employees matching company/department/id
    const employeeWhere = { companyId: company_id, status: 'Active' };
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ["id", "employeeCode", "firstName", "lastName", "departmentId"],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "departmentname"]
        },
        {
          model: Company,
          as: "company",
          attributes: ["id", "name"]
        }
      ]
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 }
      });
    }

    const employeeIds = employees.map(e => e.id);
    const formattedFromDate = moment(from_date).format("YYYY-MM-DD");
    const formattedToDate = moment(to_date).format("YYYY-MM-DD");

    // 2. Fetch all Attendance records in target range (finalized only)
    const attendanceRecords = await Attendance.findAll({
      where: {
        employeeId: { [Op.in]: employeeIds },
        attendanceDate: { [Op.between]: [formattedFromDate, formattedToDate] },
        isFinalized: true
      }
    });

    // 3. Fetch all DepartmentAttendance records in target range
    const deptAttendanceRecords = await DepartmentAttendance.findAll({
      where: {
        employeeId: { [Op.in]: employeeIds },
        attendanceDate: { [Op.between]: [formattedFromDate, formattedToDate] }
      }
    });

    // Index DepartmentAttendance by employeeId_date
    const deptAttMap = {};
    deptAttendanceRecords.forEach(da => {
      deptAttMap[`${da.employeeId}_${da.attendanceDate}`] = da;
    });

    // Index Attendance by employeeId_date
    const attMap = {};
    attendanceRecords.forEach(att => {
      attMap[`${att.employeeId}_${att.attendanceDate}`] = att;
    });

    const discrepancies = [];

    // Collect dates in range to walk through
    const dates = [];
    let curr = moment(formattedFromDate);
    const end = moment(formattedToDate);
    while (curr.isSameOrBefore(end)) {
      dates.push(curr.format("YYYY-MM-DD"));
      curr.add(1, "days");
    }

    // Evaluate for each employee and date
    employees.forEach(emp => {
      dates.forEach(dateStr => {
        const key = `${emp.id}_${dateStr}`;
        const att = attMap[key];
        const da = deptAttMap[key];

        let hasDiscrepancy = false;
        let cause = "";
        let hrStatus = da ? da.status : "No Bulk Record";
        let masterStatus = att ? att.status : "No Master Record";
        let checkIn = att ? att.firstCheckIn : null;
        let checkOut = att ? att.lastCheckOut : null;
        let workingHours = att ? att.workingHours : null;

        // Compare status in both tables only
        if (att && da && att.status.toLowerCase() !== da.status.toLowerCase()) {
          hasDiscrepancy = true;
          cause = "HR Snapshot vs Master status mismatch";
        }

        if (hasDiscrepancy) {
          discrepancies.push({
            employee_id: emp.id,
            employee_code: emp.employeeCode || "-",
            employee_name: emp.firstName,
            department_name: emp.department?.departmentname || "N/A",
            company_name: emp.company?.name || "N/A",
            date: dateStr,
            shift_name: da ? da.shiftName : (att ? att.shiftName : "Unknown"),
            hr_status: hrStatus,
            master_status: masterStatus,
            check_in: checkIn,
            check_out: checkOut,
            working_hours: workingHours,
            cause: cause
          });
        }
      });
    });

    // Sort discrepancies: newest date first, then employee code
    discrepancies.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employee_code.localeCompare(b.employee_code);
    });

    // Apply pagination
    const totalCount = discrepancies.length;
    const paginatedData = discrepancies.slice(offset, offset + parseInt(limit));

    return res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error("Get discrepancy report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch discrepancy report data",
      error: error.message
    });
  }
};

exports.approveDiscrepancy = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { employeeId, date, status, reason } = req.body;

    if (!employeeId || !date || !status || !reason) {
      return res.status(400).json({
        success: false,
        message: "employeeId, date, status, and reason are required"
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User ID not found in request context."
      });
    }

    // Find the master attendance record
    const att = await Attendance.findOne({
      where: { employeeId, attendanceDate: date }
    });

    const originalStatus = att ? att.status : "No Master Record";
    const documentPath = req.file ? `uploads/${req.file.filename}` : null;

    // 1. Create or update discrepancy approval entry
    let approval = await db.DiscrepancyApproval.findOne({
      where: { employeeId, attendanceDate: date },
      transaction
    });

    if (approval) {
      approval.originalStatus = originalStatus;
      approval.approvedStatus = status;
      approval.reason = reason;
      if (documentPath) approval.documentPath = documentPath;
      approval.approvedBy = req.user.id;
      approval.approvedAt = new Date();
      await approval.save({ transaction });
    } else {
      approval = await db.DiscrepancyApproval.create({
        employeeId,
        attendanceDate: date,
        originalStatus,
        approvedStatus: status,
        reason,
        documentPath,
        approvedBy: req.user.id,
        approvedAt: new Date()
      }, { transaction });
    }

    // 2. Update or create master attendance entry
    if (att) {
      att.status = status;
      att.approvedBy = req.user.id;
      att.approvedAt = new Date();
      att.isFinalized = true;
      att.remarks = reason;
      await att.save({ transaction });
    } else {
      const emp = await Employee.findByPk(employeeId);
      if (!emp) {
        throw new Error("Employee not found");
      }
      await Attendance.create({
        employeeId,
        companyId: emp.companyId,
        departmentId: emp.departmentId,
        attendanceDate: date,
        status: status,
        isFinalized: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        remarks: reason
      }, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Discrepancy approved and attendance updated successfully",
      data: approval
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Approve discrepancy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve discrepancy",
      error: error.message
    });
  }
};

exports.getDiscrepancyHistory = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      from_date,
      to_date,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build filters for DiscrepancyApproval
    const approvalWhere = {};
    if (from_date && to_date) {
      approvalWhere.attendanceDate = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      approvalWhere.attendanceDate = { [Op.gte]: from_date };
    } else if (to_date) {
      approvalWhere.attendanceDate = { [Op.lte]: to_date };
    }

    // Build filters for Employee association
    const employeeWhere = {};
    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    const { count, rows } = await db.DiscrepancyApproval.findAndCountAll({
      where: approvalWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
          attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'departmentname']
            }
          ]
        },
        {
          model: db.User,
          as: 'approvedByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['attendanceDate', 'DESC'], ['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error("Get discrepancy history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch discrepancy history data",
      error: error.message
    });
  }
};

module.exports = exports;