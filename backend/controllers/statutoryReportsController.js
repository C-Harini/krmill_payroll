// controllers/statutoryReportsController.js
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const SalaryGeneration = db.SalaryGeneration;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const EmployeeLoan = db.EmployeeLoan;
const Designation = db.Designation;
const Relation = db.EmployeeRelation;
const EmployeeDocument = db.EmployeeDocument;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getMonthName(month) {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  return months[parseInt(month) - 1];
}

function getMonthShort(month) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(month) - 1];
}

function calculateProfessionalTax(sixMonthGross) {
  if (sixMonthGross <= 20000) return 0;
  if (sixMonthGross <= 30000) return 135;
  if (sixMonthGross <= 45000) return 315;
  if (sixMonthGross <= 60000) return 690;
  if (sixMonthGross <= 75000) return 1025;
  return 1250;
}

function getPTPeriod(month, year) {
  month = parseInt(month);
  year = parseInt(year);
  if (month === 2) {
    // Feb report: Sep(prev year) → Oct → Nov → Dec → Jan → Feb
    return [
      { month: 9,  year: year - 1 },
      { month: 10, year: year - 1 },
      { month: 11, year: year - 1 },
      { month: 12, year: year - 1 },
      { month: 1,  year: year },
      { month: 2,  year: year }
    ];
  } else if (month === 8) {
    // Aug report: Mar → Apr → May → Jun → Jul → Aug
    return [
      { month: 3, year: year },
      { month: 4, year: year },
      { month: 5, year: year },
      { month: 6, year: year },
      { month: 7, year: year },
      { month: 8, year: year }
    ];
  }
  return null;
}

// ==========================================
// 1. EPF (PROVIDENT FUND) REPORT
// ==========================================

exports.getPFReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const whereClause = { salaryMonth: month, salaryYear: year, status: 'paid' };
    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'uanNumber', 'epfNumber', 'dateOfJoining'],
          // ↑ if epfNumber field name differs in your DB, adjust here
          include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] }
          ]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    const pfData = salaryData.map(record => {
      const earnings   = record.earningsBreakdown || {};
      const epfWage    = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
      const epsWage    = Math.min(epfWage, 15000);  // EPS wage capped at ₹15,000
      const edliWage   = Math.min(epfWage, 15000);  // EDLI wage capped at ₹15,000
      const employeePF = epfWage * 0.12;             // Employee contribution 12%
      const employerEPS = epsWage * 0.0833;          // Employer EPS 8.33% of capped wage
      const employerEPF = (epfWage * 0.12) - employerEPS; // Employer EPF 3.67%
      const ncpDays    = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));

      return {
        id: record.id,
        employee: record.employee,
        grossWages: parseFloat(record.grossPay || 0),
        epfWage,
        epsWage,
        edliWage,
        employeePF,
        employerEPS,
        employerEPF,
        ncpDays
      };
    });

    const totals = {
      totalGrossWages:          pfData.reduce((s, i) => s + i.grossWages, 0),
      totalEPFWage:             pfData.reduce((s, i) => s + i.epfWage, 0),
      totalEPSWage:             pfData.reduce((s, i) => s + i.epsWage, 0),
      totalEDLIWage:            pfData.reduce((s, i) => s + i.edliWage, 0),
      totalEmployeePF:          pfData.reduce((s, i) => s + i.employeePF, 0),
      totalEmployerEPS:         pfData.reduce((s, i) => s + i.employerEPS, 0),
      totalEmployerEPF:         pfData.reduce((s, i) => s + i.employerEPF, 0),
      totalEmployerContribution:pfData.reduce((s, i) => s + i.employerEPS + i.employerEPF, 0),
      employeeCount: pfData.length
    };

    res.json({ success: true, data: pfData, totals, companyInfo: salaryData[0]?.company || {} });

  } catch (error) {
    console.error('EPF report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EPF report', error: error.message });
  }
};

// ==========================================
// 2. ESI REPORT
// ==========================================

exports.getESIReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const whereClause = { salaryMonth: month, salaryYear: year, status: 'paid' };
    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'esiNumber', 'dateOfJoining'],
          include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] }
          ]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    const esiData = salaryData.map(record => {
      const earnings    = record.earningsBreakdown || {};
      const totalWages  = parseFloat(record.grossPay || 0);
      const basicPay    = parseFloat(earnings.basicSalary || 0);
      const sa          = parseFloat(earnings.specialAllowance || 0);
      const llpDays     = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));
      const employeeESI = totalWages * 0.0075;  // 0.75%
      const employerESI = totalWages * 0.0325;  // 3.25%

      return {
        id: record.id,
        employee: record.employee,
        basicPay,
        sa,
        totalWages,
        llpDays,
        employeeESI,
        employerESI,
        totalESI: employeeESI + employerESI,
        workingDays: record.workingDays,
        presentDays: record.presentDays
      };
    });

    const totals = {
      totalBasicPay:    esiData.reduce((s, i) => s + i.basicPay, 0),
      totalSA:          esiData.reduce((s, i) => s + i.sa, 0),
      totalWages:       esiData.reduce((s, i) => s + i.totalWages, 0),
      totalEmployeeESI: esiData.reduce((s, i) => s + i.employeeESI, 0),
      totalEmployerESI: esiData.reduce((s, i) => s + i.employerESI, 0),
      totalESI:         esiData.reduce((s, i) => s + i.totalESI, 0),
      employeeCount:    esiData.length
    };

    res.json({ success: true, data: esiData, totals, companyInfo: salaryData[0]?.company || {} });

  } catch (error) {
    console.error('ESI report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ESI report', error: error.message });
  }
};

// ==========================================
// 3. TDS REPORT (unchanged logic)
// ==========================================

exports.getTaxReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year, quarter } = req.query;

    const whereClause = { status: 'paid' };
    if (companyId) whereClause.companyId = companyId;

    if (quarter) {
      const quarterMonths = {
        'Q1': [4, 5, 6],
        'Q2': [7, 8, 9],
        'Q3': [10, 11, 12],
        'Q4': [1, 2, 3]
      };
      whereClause.salaryMonth = { [Op.in]: quarterMonths[quarter] };
      if (quarter === 'Q4') {
        whereClause[Op.or] = [
          { salaryYear: year, salaryMonth: { [Op.in]: [1, 2, 3] } },
          { salaryYear: parseInt(year) - 1, salaryMonth: { [Op.in]: [1, 2, 3] } }
        ];
      } else {
        whereClause.salaryYear = year;
      }
    } else if (month && year) {
      whereClause.salaryMonth = month;
      whereClause.salaryYear = year;
    } else {
      return res.status(400).json({ success: false, message: 'Month and year, or quarter and year are required' });
    }

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'panNumber', 'dateOfJoining'],
          include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] }
          ]
        },
        { model: Company, as: 'company', attributes: ['name', 'tanNumber'] }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC'],
        ['salaryMonth', 'ASC']
      ]
    });

    const employeeTaxMap = {};
    salaryData.forEach(record => {
      const empId = record.employeeId;
      const deductions = record.deductionsBreakdown || {};
      const taxDeducted = parseFloat(deductions.incomeTax || 0);

      if (!employeeTaxMap[empId]) {
        employeeTaxMap[empId] = { employee: record.employee, months: [], totalGross: 0, totalTaxDeducted: 0 };
      }
      employeeTaxMap[empId].months.push({
        month: record.salaryMonth, year: record.salaryYear,
        grossPay: parseFloat(record.grossPay), taxDeducted
      });
      employeeTaxMap[empId].totalGross += parseFloat(record.grossPay);
      employeeTaxMap[empId].totalTaxDeducted += taxDeducted;
    });

    const taxData = Object.values(employeeTaxMap);
    const totals = {
      totalGross: taxData.reduce((s, i) => s + i.totalGross, 0),
      totalTaxDeducted: taxData.reduce((s, i) => s + i.totalTaxDeducted, 0),
      employeeCount: taxData.length
    };

    res.json({
      success: true, data: taxData, totals,
      companyInfo: salaryData[0]?.company || {},
      period: quarter ? `Quarter ${quarter} ${year}` : `${getMonthName(month)} ${year}`
    });

  } catch (error) {
    console.error('TDS report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax report', error: error.message });
  }
};

// ==========================================
// 4. PROFESSIONAL TAX REPORT
// ==========================================

exports.getProfessionalTaxReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }
    if (parseInt(month) !== 2 && parseInt(month) !== 8) {
      return res.status(400).json({ success: false, message: 'Professional Tax report is only for February (2) and August (8)' });
    }

    const period = getPTPeriod(month, year);
    const whereClause = {
      [Op.or]: period.map(p => ({ salaryMonth: p.month, salaryYear: String(p.year) })),
      status: 'paid'
    };
    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'mobileNumber', 'officialEmail', 'providentFundNumber'],
          include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] },
            { model: Relation, as: 'relations', attributes: ['name', 'relation'], required: false },
            { model: EmployeeDocument, as: 'documents', attributes: ['panNumber'], required: false },
            { model: Designation, as: 'designation', attributes: ['name'], required: false }
          ]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    // Group by employee
    const employeeMap = {};
    salaryData.forEach(record => {
      const empId = record.employeeId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = { employee: record.employee, company: record.company, months: {}, actualGross: 0 };
      }
      const key = `${record.salaryMonth}-${record.salaryYear}`;
      employeeMap[empId].months[key] = parseFloat(record.grossPay || 0);
      // Last month of the period = the "actual gross"
      if (parseInt(record.salaryMonth) === period[5].month && parseInt(record.salaryYear) === period[5].year) {
        employeeMap[empId].actualGross = parseFloat(record.grossPay || 0);
      }
    });

    const ptData = Object.values(employeeMap).map(emp => {
      const monthlyGross = {};
      let sixMonthTotal = 0;
      period.forEach(p => {
        const key = `${p.month}-${p.year}`;
        monthlyGross[key] = emp.months[key] || 0;
        sixMonthTotal += monthlyGross[key];
      });

      const relations = emp.employee.relations || [];
      const rel = relations.find(r => r.relation === 'Father' || r.relation === 'Spouse');

      return {
        employee: emp.employee,
        company: emp.company,
        fatherHusbandName: rel?.name || 'N/A',
        panNumber: emp.employee.documents?.panNumber || 'N/A',
        actualGross: emp.actualGross,
        monthlyGross,
        sixMonthTotal,
        profTax: calculateProfessionalTax(sixMonthTotal)
      };
    });

    // Period labels to send to frontend for dynamic columns
    const periodLabels = period.map(p => ({
      key: `${p.month}-${p.year}`,
      label: `${getMonthShort(p.month)}-${String(p.year).slice(-2)}`
    }));

    const totals = {
      totalSixMonthGross: ptData.reduce((s, i) => s + i.sixMonthTotal, 0),
      totalProfTax:       ptData.reduce((s, i) => s + i.profTax, 0),
      employeeCount:      ptData.length
    };

    res.json({ success: true, data: ptData, totals, period: periodLabels, companyInfo: salaryData[0]?.company || {} });

  } catch (error) {
    console.error('PT report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch PT report', error: error.message });
  }
};

// ==========================================
// 5. LOAN/ADVANCE REPORT (unchanged)
// ==========================================

exports.getLoanReport = async (req, res) => {
  try {
    const { companyId, departmentId, status, loanType } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (loanType) whereClause.loanType = loanType;

    const employeeWhere = {};
    if (companyId) employeeWhere.companyId = companyId;
    if (departmentId) employeeWhere.departmentId = departmentId;

    const loanData = await EmployeeLoan.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'dateOfJoining'],
          include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] },
            { model: Company, as: 'company', attributes: ['name'] }
          ]
        }
      ],
      order: [
        ['status', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    const loanDetails = loanData.map(loan => {
      const paidAmount = parseFloat(loan.paidAmount || 0);
      const outstandingAmount = parseFloat(loan.loanAmount) - paidAmount;
      const completionPercentage = (paidAmount / parseFloat(loan.loanAmount)) * 100;
      return {
        id: loan.id,
        employee: loan.employee,
        loanType: loan.loanType,
        loanAmount: parseFloat(loan.loanAmount),
        sanctionDate: loan.sanctionDate,
        installmentAmount: parseFloat(loan.installmentAmount),
        numberOfInstallments: loan.numberOfInstallments,
        paidInstallments: loan.paidInstallments || 0,
        paidAmount,
        outstandingAmount,
        remainingInstallments: loan.numberOfInstallments - (loan.paidInstallments || 0),
        completionPercentage: completionPercentage.toFixed(2),
        status: loan.status,
        remarks: loan.remarks
      };
    });

    const totals = {
      totalLoans: loanDetails.length,
      totalLoanAmount: loanDetails.reduce((s, i) => s + i.loanAmount, 0),
      totalPaidAmount: loanDetails.reduce((s, i) => s + i.paidAmount, 0),
      totalOutstanding: loanDetails.reduce((s, i) => s + i.outstandingAmount, 0),
      activeLoans: loanDetails.filter(l => l.status === 'active').length,
      completedLoans: loanDetails.filter(l => l.status === 'completed').length,
      pendingLoans: loanDetails.filter(l => l.status === 'pending').length
    };

    res.json({ success: true, data: loanDetails, totals });

  } catch (error) {
    console.error('Loan report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch loan report', error: error.message });
  }
};

// ==========================================
// 6. DOWNLOAD EPF REPORT AS PDF
// ==========================================

exports.downloadPFReportPDF = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const whereClause = { salaryMonth: month, salaryYear: year, status: 'paid' };
    if (companyId) whereClause.companyId = companyId;
    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'uanNumber', 'epfNumber'],
          include: [{ model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] }]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    const pfData = salaryData.map(record => {
      const earnings = record.earningsBreakdown || {};
      const epfWage   = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
      const epsWage   = Math.min(epfWage, 15000);
      const edliWage  = Math.min(epfWage, 15000);
      const employeePF  = epfWage * 0.12;
      const employerEPS = epsWage * 0.0833;
      const employerEPF = (epfWage * 0.12) - employerEPS;
      const ncpDays = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));
      return {
        employee: record.employee,
        grossWages: parseFloat(record.grossPay || 0),
        epfWage, epsWage, edliWage, employeePF, employerEPS, employerEPF, ncpDays
      };
    });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=EPF-Report-${month}-${year}.pdf`);
    doc.pipe(res);

    const companyName = salaryData[0]?.company?.name || 'Company';
    doc.fontSize(14).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`EPF Report - ${getMonthName(month)} ${year}`, { align: 'center' });
    doc.moveDown(0.5);

    // Column definitions [label, x, width]
    const cols = [
      { label: 'S.No',        x: 20,  w: 28 },
      { label: 'Staff Code',  x: 48,  w: 52 },
      { label: 'Staff Name',  x: 100, w: 95 },
      { label: 'EPF Number',  x: 195, w: 75 },
      { label: 'UAN Number',  x: 270, w: 70 },
      { label: 'Gross Wages', x: 340, w: 58 },
      { label: 'EPF Wages',   x: 398, w: 55 },
      { label: 'EPS Wages',   x: 453, w: 55 },
      { label: 'EDLI Wages',  x: 508, w: 55 },
      { label: 'Emp PF 12%',  x: 563, w: 55 },
      { label: 'EPS 8.33%',   x: 618, w: 55 },
      { label: 'EPF 3.67%',   x: 673, w: 55 },
      { label: 'NCP Days',    x: 728, w: 44 }
    ];
    const tableWidth = 752;

    let yPos = doc.y;
    doc.rect(20, yPos, tableWidth, 22).fillAndStroke('#4A5568', '#4A5568');
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
    cols.forEach(col => doc.text(col.label, col.x + 2, yPos + 8, { width: col.w - 4, align: 'center' }));
    yPos += 22;

    doc.font('Helvetica').fontSize(7).fillColor('black');
    pfData.forEach((item, index) => {
      if (yPos > 540) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 20 });
        yPos = 20;
        doc.rect(20, yPos, tableWidth, 22).fillAndStroke('#4A5568', '#4A5568');
        doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
        cols.forEach(col => doc.text(col.label, col.x + 2, yPos + 8, { width: col.w - 4, align: 'center' }));
        yPos += 22;
        doc.font('Helvetica').fontSize(7).fillColor('black');
      }

      const bg = index % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      doc.rect(20, yPos, tableWidth, 17).fillAndStroke(bg, '#E2E8F0');
      doc.fillColor('black');

      const values = [
        index + 1,
        item.employee.employeeCode,
        item.employee.firstName || '',
        item.employee.epfNumber || 'N/A',
        item.employee.uanNumber || 'N/A',
        item.grossWages.toFixed(2),
        item.epfWage.toFixed(2),
        item.epsWage.toFixed(2),
        item.edliWage.toFixed(2),
        item.employeePF.toFixed(2),
        item.employerEPS.toFixed(2),
        item.employerEPF.toFixed(2),
        item.ncpDays
      ];

      cols.forEach((col, i) => {
        const align = i >= 5 ? 'right' : 'left';
        doc.text(String(values[i]), col.x + 2, yPos + 5, { width: col.w - 4, align });
      });
      yPos += 17;
    });

    // Total row
    yPos += 5;
    doc.rect(20, yPos, tableWidth, 20).fillAndStroke('#EBF4FF', '#4A5568');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('black');
    doc.text('TOTAL', 22, yPos + 6, { width: 170 });

    const totVals = [
      null, null, null, null, null,
      pfData.reduce((s, i) => s + i.grossWages, 0),
      pfData.reduce((s, i) => s + i.epfWage, 0),
      pfData.reduce((s, i) => s + i.epsWage, 0),
      pfData.reduce((s, i) => s + i.edliWage, 0),
      pfData.reduce((s, i) => s + i.employeePF, 0),
      pfData.reduce((s, i) => s + i.employerEPS, 0),
      pfData.reduce((s, i) => s + i.employerEPF, 0),
      null
    ];
    cols.forEach((col, i) => {
      if (totVals[i] !== null) doc.text(totVals[i].toFixed(2), col.x + 2, yPos + 6, { width: col.w - 4, align: 'right' });
    });

    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}   |   Total Employees: ${pfData.length}`, 20);
    doc.end();

  } catch (error) {
    console.error('EPF PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate EPF PDF', error: error.message });
  }
};

// ==========================================
// 7. DOWNLOAD ESI REPORT AS PDF
// ==========================================

exports.downloadESIReportPDF = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const whereClause = { salaryMonth: month, salaryYear: year, status: 'paid' };
    if (companyId) whereClause.companyId = companyId;
    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'esiNumber'],
          include: [{ model: Department, as: 'department', attributes: ['departmentName'] }]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    const esiData = salaryData.map(record => {
      const earnings   = record.earningsBreakdown || {};
      const totalWages = parseFloat(record.grossPay || 0);
      const basicPay   = parseFloat(earnings.basicSalary || 0);
      const sa         = parseFloat(earnings.specialAllowance || 0);
      const llpDays    = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));
      const employeeESI = totalWages * 0.0075;
      const employerESI = totalWages * 0.0325;
      return {
        employee: record.employee,
        basicPay, sa, totalWages, llpDays,
        employeeESI, employerESI,
        totalESI: employeeESI + employerESI
      };
    });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ESI-Report-${month}-${year}.pdf`);
    doc.pipe(res);

    const companyName = salaryData[0]?.company?.name || 'Company';
    doc.fontSize(14).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`ESI Report - ${getMonthName(month)} ${year}`, { align: 'center' });
    doc.moveDown(0.5);

    const cols = [
      { label: 'S.No',         x: 20,  w: 30 },
      { label: 'Staff Code',   x: 50,  w: 60 },
      { label: 'Staff Name',   x: 110, w: 115 },
      { label: 'ESI Number',   x: 225, w: 85 },
      { label: 'Basic Pay',    x: 310, w: 70 },
      { label: 'SA',           x: 380, w: 65 },
      { label: 'Total Wages',  x: 445, w: 75 },
      { label: 'LLP Days',     x: 520, w: 55 },
      { label: 'Emp ESI 0.75%',x: 575, w: 65 },
      { label: 'Empr ESI 3.25%',x:640, w: 65 },
      { label: 'Total ESI',    x: 705, w: 65 }
    ];
    const tableWidth = 750;

    let yPos = doc.y;
    doc.rect(20, yPos, tableWidth, 22).fillAndStroke('#4A5568', '#4A5568');
    doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
    cols.forEach(col => doc.text(col.label, col.x + 2, yPos + 8, { width: col.w - 4, align: 'center' }));
    yPos += 22;

    doc.font('Helvetica').fontSize(7).fillColor('black');
    esiData.forEach((item, index) => {
      if (yPos > 540) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 20 });
        yPos = 20;
        doc.rect(20, yPos, tableWidth, 22).fillAndStroke('#4A5568', '#4A5568');
        doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold');
        cols.forEach(col => doc.text(col.label, col.x + 2, yPos + 8, { width: col.w - 4, align: 'center' }));
        yPos += 22;
        doc.font('Helvetica').fontSize(7).fillColor('black');
      }

      const bg = index % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      doc.rect(20, yPos, tableWidth, 17).fillAndStroke(bg, '#E2E8F0');
      doc.fillColor('black');

      const values = [
        index + 1,
        item.employee.employeeCode,
        item.employee.firstName || '',
        item.employee.esiNumber || 'N/A',
        item.basicPay.toFixed(2),
        item.sa.toFixed(2),
        item.totalWages.toFixed(2),
        item.llpDays,
        item.employeeESI.toFixed(2),
        item.employerESI.toFixed(2),
        item.totalESI.toFixed(2)
      ];

      cols.forEach((col, i) => {
        const align = i >= 4 ? 'right' : 'left';
        doc.text(String(values[i]), col.x + 2, yPos + 5, { width: col.w - 4, align });
      });
      yPos += 17;
    });

    // Total row
    yPos += 5;
    doc.rect(20, yPos, tableWidth, 20).fillAndStroke('#EBF4FF', '#4A5568');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('black');
    doc.text('TOTAL', 22, yPos + 6, { width: 200 });

    const totVals = [
      null, null, null, null,
      esiData.reduce((s, i) => s + i.basicPay, 0),
      esiData.reduce((s, i) => s + i.sa, 0),
      esiData.reduce((s, i) => s + i.totalWages, 0),
      null,
      esiData.reduce((s, i) => s + i.employeeESI, 0),
      esiData.reduce((s, i) => s + i.employerESI, 0),
      esiData.reduce((s, i) => s + i.totalESI, 0)
    ];
    cols.forEach((col, i) => {
      if (totVals[i] !== null) doc.text(totVals[i].toFixed(2), col.x + 2, yPos + 6, { width: col.w - 4, align: 'right' });
    });

    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}   |   Total Employees: ${esiData.length}`, 20);
    doc.end();

  } catch (error) {
    console.error('ESI PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate ESI PDF', error: error.message });
  }
};

// ==========================================
// 8. DOWNLOAD PT REPORT AS PDF
// ==========================================

exports.downloadPTReportPDF = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }
    if (parseInt(month) !== 2 && parseInt(month) !== 8) {
      return res.status(400).json({ success: false, message: 'PT report only for February and August' });
    }

    const period = getPTPeriod(month, year);
    const whereClause = {
      [Op.or]: period.map(p => ({ salaryMonth: p.month, salaryYear: String(p.year) })),
      status: 'paid'
    };
    if (companyId) whereClause.companyId = companyId;
    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'mobileNumber', 'officialEmail', 'providentFundNumber'],
          include: [
            { model: Department, as: 'department', attributes: ['departmentName'] },
            { model: Relation, as: 'relations', attributes: ['name', 'relation'], required: false },
            { model: EmployeeDocument, as: 'documents', attributes: ['panNumber'], required: false },
            { model: Designation, as: 'designation', attributes: ['name'], required: false }
          ]
        },
        { model: Company, as: 'company', attributes: ['name'] }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    // Group by employee
    const employeeMap = {};
    salaryData.forEach(record => {
      const empId = record.employeeId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = { employee: record.employee, company: record.company, months: {}, actualGross: 0 };
      }
      const key = `${record.salaryMonth}-${record.salaryYear}`;
      employeeMap[empId].months[key] = parseFloat(record.grossPay || 0);
      if (parseInt(record.salaryMonth) === period[5].month && parseInt(record.salaryYear) === period[5].year) {
        employeeMap[empId].actualGross = parseFloat(record.grossPay || 0);
      }
    });

    const ptData = Object.values(employeeMap).map(emp => {
      let sixMonthTotal = 0;
      const monthlyGross = {};
      period.forEach(p => {
        const key = `${p.month}-${p.year}`;
        monthlyGross[key] = emp.months[key] || 0;
        sixMonthTotal += monthlyGross[key];
      });
      const relations = emp.employee.relations || [];
      const rel = relations.find(r => r.relation === 'Father' || r.relation === 'Spouse');
      return {
        employee: emp.employee,
        company: emp.company,
        fatherHusbandName: rel?.name || 'N/A',
        panNumber: emp.employee.documents?.panNumber || 'N/A',
        actualGross: emp.actualGross,
        monthlyGross,
        sixMonthTotal,
        profTax: calculateProfessionalTax(sixMonthTotal)
      };
    });

    // PT has many columns — use A4 landscape with font size 6
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 15 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PT-Report-${month}-${year}.pdf`);
    doc.pipe(res);

    const companyName = salaryData[0]?.company?.name || 'Company';
    doc.fontSize(13).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Professional Tax Report - ${getMonthName(month)} ${year}`, { align: 'center' });
    doc.moveDown(0.3);

    // Build column definitions dynamically
    const fixedCols = [
      { label: 'S.No',            x: 15,  w: 22 },
      { label: 'Company',         x: 37,  w: 52 },
      { label: 'Staff Code',      x: 89,  w: 42 },
      { label: 'Staff Name',      x: 131, w: 62 },
      { label: 'Father/Husband',  x: 193, w: 62 },
      { label: 'Category',        x: 255, w: 38 },
      { label: 'Designation',     x: 293, w: 52 },
      { label: 'Mobile',          x: 345, w: 52 },
      { label: 'Email',           x: 397, w: 68 },
      { label: 'PAN',             x: 465, w: 52 },
      { label: 'Actual Gross',    x: 517, w: 44 }
    ];

    const mColW = 36;
    let xOff = 561;
    const monthCols = period.map(p => {
      const col = {
        label: `${getMonthShort(p.month)}-${String(p.year).slice(-2)}`,
        x: xOff, w: mColW,
        key: `${p.month}-${p.year}`
      };
      xOff += mColW;
      return col;
    });

    const finalCols = [
      { label: '6M Gross', x: xOff,      w: 44 },
      { label: 'Prof Tax', x: xOff + 44, w: 44 }
    ];

    const allCols = [...fixedCols, ...monthCols, ...finalCols];
    const tableWidth = xOff + 88 - 15;

    let yPos = doc.y;
    const drawHeader = () => {
      doc.rect(15, yPos, tableWidth, 19).fillAndStroke('#4A5568', '#4A5568');
      doc.fillColor('white').fontSize(5.5).font('Helvetica-Bold');
      allCols.forEach(col => doc.text(col.label, col.x + 1, yPos + 6, { width: col.w - 2, align: 'center' }));
      yPos += 19;
      doc.font('Helvetica').fontSize(5.5).fillColor('black');
    };
    drawHeader();

    ptData.forEach((item, index) => {
      if (yPos > 545) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 15 });
        yPos = 15;
        drawHeader();
      }

      const bg = index % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      doc.rect(15, yPos, tableWidth, 15).fillAndStroke(bg, '#E2E8F0');
      doc.fillColor('black');

      const fixedVals = [
        index + 1,
        item.company?.name || 'N/A',
        item.employee.employeeCode,
        item.employee.firstName || '',
        item.fatherHusbandName,
        item.employee.providentFundNumber || 'N/A',
        item.employee.designation?.name || 'N/A',
        item.employee.mobileNumber || 'N/A',
        item.employee.officialEmail || 'N/A',
        item.panNumber,
        item.actualGross.toFixed(2)
      ];

      fixedCols.forEach((col, i) => {
        const align = i === 10 ? 'right' : 'left';
        doc.text(String(fixedVals[i]), col.x + 1, yPos + 5, { width: col.w - 2, align });
      });
      monthCols.forEach(col => {
        doc.text((item.monthlyGross[col.key] || 0).toFixed(2), col.x + 1, yPos + 5, { width: col.w - 2, align: 'right' });
      });
      doc.text(item.sixMonthTotal.toFixed(2), finalCols[0].x + 1, yPos + 5, { width: finalCols[0].w - 2, align: 'right' });
      doc.text(item.profTax.toFixed(2),        finalCols[1].x + 1, yPos + 5, { width: finalCols[1].w - 2, align: 'right' });

      yPos += 15;
    });

    // Total row
    yPos += 5;
    doc.rect(15, yPos, tableWidth, 18).fillAndStroke('#EBF4FF', '#4A5568');
    doc.font('Helvetica-Bold').fontSize(5.5).fillColor('black');
    doc.text('TOTAL', 17, yPos + 6);
    const totSix = ptData.reduce((s, i) => s + i.sixMonthTotal, 0);
    const totPT  = ptData.reduce((s, i) => s + i.profTax, 0);
    doc.text(totSix.toFixed(2), finalCols[0].x + 1, yPos + 6, { width: finalCols[0].w - 2, align: 'right' });
    doc.text(totPT.toFixed(2),  finalCols[1].x + 1, yPos + 6, { width: finalCols[1].w - 2, align: 'right' });

    doc.moveDown(1.5);
    doc.fontSize(7).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}   |   Total Employees: ${ptData.length}`, 15);
    doc.end();

  } catch (error) {
    console.error('PT PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PT PDF', error: error.message });
  }
};

// ==========================================
// 9. DOWNLOAD STATUTORY REPORTS AS EXCEL
// ==========================================

exports.downloadStatutoryReportsExcel = async (req, res) => {
  try {
    const { companyId, month, year, reportType } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    // Validate PT period
    if (reportType === 'pt' && parseInt(month) !== 2 && parseInt(month) !== 8) {
      return res.status(400).json({ success: false, message: 'PT report Excel only for February and August' });
    }

    const workbook = new ExcelJS.Workbook();

    const hdrStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5568' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { bottom: { style: 'thin', color: { argb: 'FF2D3748' } } }
    };
    const altFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
    const numFmt  = '₹#,##0.00';

    // ------------------------------------------
    // EPF SHEET
    // ------------------------------------------
    if (!reportType || reportType === 'pf') {
      const salaryData = await SalaryGeneration.findAll({
        where: { salaryMonth: month, salaryYear: year, status: 'paid', ...(companyId && { companyId }) },
        include: [
          {
            model: Employee, as: 'employee',
            include: [{ model: Department, as: 'department', attributes: ['departmentName'] }]
          },
          { model: Company, as: 'company' }
        ],
        order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
      });

      const pfSheet = workbook.addWorksheet('EPF Report');
      pfSheet.mergeCells('A1:M1');
      const t1 = pfSheet.getCell('A1');
      t1.value = salaryData[0]?.company?.name || 'Company';
      t1.font = { size: 14, bold: true }; t1.alignment = { horizontal: 'center' };

      pfSheet.mergeCells('A2:M2');
      const t2 = pfSheet.getCell('A2');
      t2.value = `EPF Report - ${getMonthName(month)} ${year}`;
      t2.font = { size: 11 }; t2.alignment = { horizontal: 'center' };

      pfSheet.getRow(4).height = 30;
      const hdrRow = pfSheet.getRow(4);
      hdrRow.values = ['S.No','Staff Code','Staff Name','EPF Number','UAN Number',
        'Gross Wages','EPF Wages','EPS Wages','EDLI Wages',
        'Employee PF 12%','Employer EPS 8.33%','Employer EPF 3.67%','NCP Days'];
      hdrRow.eachCell(cell => Object.assign(cell, hdrStyle));

      pfSheet.columns = [
        { key:'sno',w:8 },{ key:'code',width:12 },{ key:'name',width:25 },
        { key:'epf',width:16 },{ key:'uan',width:16 },
        { key:'gross',width:14 },{ key:'epfW',width:12 },{ key:'epsW',width:12 },{ key:'edli',width:12 },
        { key:'empPF',width:14 },{ key:'erEPS',width:15 },{ key:'erEPF',width:15 },{ key:'ncp',width:10 }
      ];

      let rn = 5;
      salaryData.forEach((record, idx) => {
        const earnings  = record.earningsBreakdown || {};
        const epfWage   = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
        const epsWage   = Math.min(epfWage, 15000);
        const edliWage  = Math.min(epfWage, 15000);
        const empPF     = epfWage * 0.12;
        const erEPS     = epsWage * 0.0833;
        const erEPF     = empPF - erEPS;
        const ncpDays   = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));

        const row = pfSheet.getRow(rn);
        row.values = [
          idx + 1, record.employee.employeeCode,
          record.employee.firstName || '',
          record.employee.epfNumber || 'N/A', record.employee.uanNumber || 'N/A',
          parseFloat(record.grossPay || 0), epfWage, epsWage, edliWage,
          empPF, erEPS, erEPF, ncpDays
        ];
        for (let c = 6; c <= 12; c++) row.getCell(c).numFmt = numFmt;
        if (idx % 2 === 0) for (let c = 1; c <= 13; c++) row.getCell(c).fill = altFill;
        rn++;
      });

      // Total row
      const tr = pfSheet.getRow(rn);
      tr.values = ['','','TOTAL','','',
        { formula: `SUM(F5:F${rn-1})` },{ formula: `SUM(G5:G${rn-1})` },{ formula: `SUM(H5:H${rn-1})` },
        { formula: `SUM(I5:I${rn-1})` },{ formula: `SUM(J5:J${rn-1})` },{ formula: `SUM(K5:K${rn-1})` },
        { formula: `SUM(L5:L${rn-1})` },''
      ];
      tr.font = { bold: true };
      tr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
      for (let c = 6; c <= 12; c++) tr.getCell(c).numFmt = numFmt;
    }

    // ------------------------------------------
    // ESI SHEET
    // ------------------------------------------
    if (!reportType || reportType === 'esi') {
      const salaryData = await SalaryGeneration.findAll({
        where: { salaryMonth: month, salaryYear: year, status: 'paid', ...(companyId && { companyId }) },
        include: [
          {
            model: Employee, as: 'employee',
            include: [{ model: Department, as: 'department', attributes: ['departmentName'] }]
          },
          { model: Company, as: 'company' }
        ],
        order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
      });

      const esiSheet = workbook.addWorksheet('ESI Report');
      esiSheet.mergeCells('A1:K1');
      const t1 = esiSheet.getCell('A1');
      t1.value = salaryData[0]?.company?.name || 'Company';
      t1.font = { size: 14, bold: true }; t1.alignment = { horizontal: 'center' };

      esiSheet.mergeCells('A2:K2');
      const t2 = esiSheet.getCell('A2');
      t2.value = `ESI Report - ${getMonthName(month)} ${year}`;
      t2.font = { size: 11 }; t2.alignment = { horizontal: 'center' };

      esiSheet.getRow(4).height = 30;
      const hdrRow = esiSheet.getRow(4);
      hdrRow.values = ['S.No','Staff Code','Staff Name','ESI Number',
        'Basic Pay','SA','Total Wages','LLP Days',
        'Employee ESI (0.75%)','Employer ESI (3.25%)','Total ESI'];
      hdrRow.eachCell(cell => Object.assign(cell, hdrStyle));

      esiSheet.columns = [
        { key:'sno',width:8 },{ key:'code',width:12 },{ key:'name',width:25 },{ key:'esi',width:16 },
        { key:'basic',width:13 },{ key:'sa',width:13 },{ key:'wages',width:13 },{ key:'llp',width:10 },
        { key:'empESI',width:18 },{ key:'erESI',width:18 },{ key:'tot',width:13 }
      ];

      let rn = 5;
      salaryData.forEach((record, idx) => {
        const earnings   = record.earningsBreakdown || {};
        const totalWages = parseFloat(record.grossPay || 0);
        const basicPay   = parseFloat(earnings.basicSalary || 0);
        const sa         = parseFloat(earnings.specialAllowance || 0);
        const llpDays    = Math.max(0, (record.workingDays || 0) - (record.presentDays || 0));
        const empESI     = totalWages * 0.0075;
        const erESI      = totalWages * 0.0325;

        const row = esiSheet.getRow(rn);
        row.values = [
          idx + 1, record.employee.employeeCode,
          record.employee.firstName || '',
          record.employee.esiNumber || 'N/A',
          basicPay, sa, totalWages, llpDays,
          empESI, erESI, empESI + erESI
        ];
        for (let c = 5; c <= 7; c++) row.getCell(c).numFmt = numFmt;
        for (let c = 9; c <= 11; c++) row.getCell(c).numFmt = numFmt;
        if (idx % 2 === 0) for (let c = 1; c <= 11; c++) row.getCell(c).fill = altFill;
        rn++;
      });

      const tr = esiSheet.getRow(rn);
      tr.values = ['','','TOTAL','',
        { formula: `SUM(E5:E${rn-1})` },{ formula: `SUM(F5:F${rn-1})` },{ formula: `SUM(G5:G${rn-1})` },'',
        { formula: `SUM(I5:I${rn-1})` },{ formula: `SUM(J5:J${rn-1})` },{ formula: `SUM(K5:K${rn-1})` }
      ];
      tr.font = { bold: true };
      tr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
      for (let c of [5,6,7,9,10,11]) tr.getCell(c).numFmt = numFmt;
    }

    // ------------------------------------------
    // PT SHEET
    // ------------------------------------------
    if (!reportType || reportType === 'pt') {
      if (parseInt(month) === 2 || parseInt(month) === 8) {
        const period = getPTPeriod(month, year);
        const ptSalary = await SalaryGeneration.findAll({
          where: {
            [Op.or]: period.map(p => ({ salaryMonth: p.month, salaryYear: String(p.year) })),
            status: 'paid', ...(companyId && { companyId })
          },
          include: [
            {
              model: Employee, as: 'employee',
              attributes: ['id','employeeCode','firstName','lastName','mobileNumber','officialEmail','providentFundNumber'],
              include: [
                { model: Department, as: 'department', attributes: ['departmentName'] },
                { model: Relation, as: 'relations', attributes: ['name','relation'], required: false },
                { model: EmployeeDocument, as: 'documents', attributes: ['panNumber'], required: false },
            { model: Designation, as: 'designation', attributes: ['name'], required: false }
              ]
            },
            { model: Company, as: 'company', attributes: ['name'] }
          ],
          order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
        });

        const empMap = {};
        ptSalary.forEach(record => {
          const empId = record.employeeId;
          if (!empMap[empId]) empMap[empId] = { employee: record.employee, company: record.company, months: {}, actualGross: 0 };
          const key = `${record.salaryMonth}-${record.salaryYear}`;
          empMap[empId].months[key] = parseFloat(record.grossPay || 0);
          if (parseInt(record.salaryMonth) === period[5].month && parseInt(record.salaryYear) === period[5].year) {
            empMap[empId].actualGross = parseFloat(record.grossPay || 0);
          }
        });

        const ptData = Object.values(empMap).map(emp => {
          let sixMonthTotal = 0;
          const monthlyGross = {};
          period.forEach(p => {
            const key = `${p.month}-${p.year}`;
            monthlyGross[key] = emp.months[key] || 0;
            sixMonthTotal += monthlyGross[key];
          });
          const relations = emp.employee.relations || [];
          const rel = relations.find(r => r.relation === 'Father' || r.relation === 'Spouse');
          return {
            employee: emp.employee, company: emp.company,
            fatherHusbandName: rel?.name || 'N/A',
            panNumber: emp.employee.documents?.panNumber || 'N/A',
            actualGross: emp.actualGross,
            monthlyGross, sixMonthTotal,
            profTax: calculateProfessionalTax(sixMonthTotal)
          };
        });

        const ptSheet = workbook.addWorksheet('PT Report');
        const numPeriodCols = 10 + period.length + 2; // fixed + months + gross + pt
        const lastCol = String.fromCharCode(64 + numPeriodCols);

        ptSheet.mergeCells(`A1:${lastCol}1`);
        const t1 = ptSheet.getCell('A1');
        t1.value = ptSalary[0]?.company?.name || 'Company';
        t1.font = { size: 14, bold: true }; t1.alignment = { horizontal: 'center' };

        ptSheet.mergeCells(`A2:${lastCol}2`);
        const t2 = ptSheet.getCell('A2');
        t2.value = `Professional Tax Report - ${getMonthName(month)} ${year}`;
        t2.font = { size: 11 }; t2.alignment = { horizontal: 'center' };

        ptSheet.getRow(4).height = 35;
        const hdrRow = ptSheet.getRow(4);
        const periodLabels = period.map(p => `${getMonthShort(p.month)}-${String(p.year).slice(-2)}`);
        hdrRow.values = [
          'S.No','Company','Staff Code','Staff Name','Father/Husband Name',
          'Category','Designation','Mobile','Email','PAN','Actual Gross',
          ...periodLabels,
          'Gross (6 Months)','Prof Tax'
        ];
        hdrRow.eachCell(cell => Object.assign(cell, hdrStyle));

        const colDefs = [
          { width: 8 }, { width: 18 }, { width: 12 }, { width: 22 }, { width: 20 },
          { width: 10 }, { width: 15 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 14 },
          ...period.map(() => ({ width: 13 })),
          { width: 16 }, { width: 12 }
        ];
        ptSheet.columns = colDefs;

        let rn = 5;
        ptData.forEach((item, idx) => {
          const row = ptSheet.getRow(rn);
          const monthVals = period.map(p => item.monthlyGross[`${p.month}-${p.year}`] || 0);
          row.values = [
            idx + 1, item.company?.name || 'N/A',
            item.employee.employeeCode,
            item.employee.firstName || '',
            item.fatherHusbandName,
            item.employee.providentFundNumber || 'N/A',
            item.employee.designation?.name || 'N/A',
            item.employee.mobileNumber || 'N/A',
            item.employee.officialEmail || 'N/A',
            item.panNumber,
            item.actualGross,
            ...monthVals,
            item.sixMonthTotal,
            item.profTax
          ];
          // Format numeric cols: actualGross (col 11), monthVals, sixMonthTotal, profTax
          for (let c = 11; c <= 11 + period.length + 1; c++) row.getCell(c).numFmt = numFmt;
          if (idx % 2 === 0) for (let c = 1; c <= colDefs.length; c++) row.getCell(c).fill = altFill;
          rn++;
        });

        // PT Slab info sheet
        const slabSheet = workbook.addWorksheet('PT Slab');
        slabSheet.getRow(1).values = ['6-Month Gross Range', 'Professional Tax'];
        slabSheet.getRow(1).font = { bold: true };
        slabSheet.columns = [{ width: 30 }, { width: 20 }];
        [
          ['Up to ₹20,000', '₹0'],
          ['₹20,001 – ₹30,000', '₹135'],
          ['₹30,001 – ₹45,000', '₹315'],
          ['₹45,001 – ₹60,000', '₹690'],
          ['₹60,001 – ₹75,000', '₹1,025'],
          ['Above ₹75,000', '₹1,250']
        ].forEach((vals, i) => slabSheet.getRow(i + 2).values = vals);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=statutory-reports-${month}-${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel', error: error.message });
  }
};

module.exports = exports;
