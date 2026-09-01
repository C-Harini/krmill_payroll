require("dotenv").config();
const db = require("./models");


async function populate() {
  try {
    console.log("Checking and altering designations table if columns are missing...");
    try {
      await db.sequelize.query("ALTER TABLE designations ADD COLUMN createdBy INT DEFAULT 1;");
      console.log("Added createdBy to designations");
    } catch(e) {
      console.log("createdBy already exists or designations table is fine:", e.message);
    }
    try {
      await db.sequelize.query("ALTER TABLE designations ADD COLUMN updatedBy INT DEFAULT 1;");
      console.log("Added updatedBy to designations");
    } catch(e) {
      console.log("updatedBy already exists or designations table is fine:", e.message);
    }

    console.log("Checking and dropping orphaned foreign key departments_ibfk_8...");
    try {
      await db.sequelize.query("ALTER TABLE departments DROP FOREIGN KEY departments_ibfk_8;");
      console.log("Dropped departments_ibfk_8 constraint");
    } catch(e) {
      console.log("Constraint departments_ibfk_8 does not exist or already dropped:", e.message);
    }

    console.log("Populating database...");

    // Create Company
    const [company] = await db.Company.findOrCreate({
      where: { name: "Kayaar Exports Pvt Ltd.," },
      defaults: {
        status: "Active",
      }
    });
    const companyId = company.id;
    console.log(`Company created/found: ${company.name} (ID: ${companyId})`);

    // Create Designation
    const [designation] = await db.Designation.findOrCreate({
      where: { name: "Worker", companyId },
      defaults: { acronym: "WRK" }
    });

    // Create Employment Type
    const [employmentType] = await db.EmploymentType.findOrCreate({
      where: { name: "worker", companyId }
    });

    // Create Categories
    const categoriesData = [
      { categoryName: "PREPARATORY", categoryCode: "PREP" },
      { categoryName: "SPINNING", categoryCode: "SPIN" },
      { categoryName: "AUTOCONER", categoryCode: "AUTO" },
      { categoryName: "Others", categoryCode: "OTH" },
    ];

    const categoriesMap = {};
    for (const cat of categoriesData) {
      const [category] = await db.Category.findOrCreate({
        where: { categoryName: cat.categoryName, companyId },
        defaults: {
          categoryCode: cat.categoryCode,
          status: "Active",
        }
      });
      categoriesMap[cat.categoryName] = category.id;
    }
    console.log("Categories created:", categoriesMap);

    // Create Departments
    const deptsData = [
      // PREPARATORY
      { departmentname: "BLOW ROOM", acronym: "BR", strengthRequired: 4, slno: 1, categoryName: "PREPARATORY" },
      { departmentname: "CARDING", acronym: "CRD", strengthRequired: 6, slno: 2, categoryName: "PREPARATORY" },
      { departmentname: "FINISHER DRAWING", acronym: "FD", strengthRequired: 8, slno: 3, categoryName: "PREPARATORY" },
      { departmentname: "LAP FORMER", acronym: "LF", strengthRequired: 4, slno: 4, categoryName: "PREPARATORY" },
      { departmentname: "COMBER", acronym: "CMB", strengthRequired: 4, slno: 5, categoryName: "PREPARATORY" },
      { departmentname: "SIMPLEX", acronym: "SMP", strengthRequired: 14, slno: 6, categoryName: "PREPARATORY" },
      { departmentname: "PRE SEMI CLEANING", acronym: "PSC", strengthRequired: 8, slno: 7, categoryName: "PREPARATORY" },
      // SPINNING
      { departmentname: "SPINNING MAISTRY", acronym: "SPM", strengthRequired: 3, slno: 8, categoryName: "SPINNING" },
      { departmentname: "SPG SIDER", acronym: "SPS", strengthRequired: 42, slno: 9, categoryName: "SPINNING" },
      // AUTOCONER
      { departmentname: "AUTOCONER", acronym: "ATC", strengthRequired: 28, slno: 10, categoryName: "AUTOCONER" },
      { departmentname: "EMPTIES CONE CARRIER", acronym: "ECC", strengthRequired: 14, slno: 11, categoryName: "AUTOCONER" },
      // Others
      { departmentname: "WORKER TEACHER", acronym: "WT", strengthRequired: 8, slno: 12, categoryName: "Others" },
      { departmentname: "PACKING", acronym: "PKG", strengthRequired: 8, slno: 13, categoryName: "Others" },
      { departmentname: "QUALITY ASSURANCE DEPARTM", acronym: "QA", strengthRequired: 3, slno: 14, categoryName: "Others" },
      { departmentname: "FITTER", acronym: "FTR", strengthRequired: 4, slno: 15, categoryName: "Others" },
      { departmentname: "FITTER HELPER", acronym: "FTH", strengthRequired: 21, slno: 16, categoryName: "Others" },
      { departmentname: "CLEANING", acronym: "CLN", strengthRequired: 7, slno: 17, categoryName: "Others" },
      { departmentname: "SEMI CLG", acronym: "SCG", strengthRequired: 14, slno: 18, categoryName: "Others" },
      { departmentname: "ELECTRICAL", acronym: "ELEC", strengthRequired: 8, slno: 19, categoryName: "Others" },
      { departmentname: "PLANT CLEANING", acronym: "PCLN", strengthRequired: 4, slno: 20, categoryName: "Others" },
      { departmentname: "ROOF CLG", acronym: "RCLG", strengthRequired: 1, slno: 21, categoryName: "Others" },
      { departmentname: "WORKSHOP", acronym: "WSH", strengthRequired: 2, slno: 22, categoryName: "Others" },
      { departmentname: "T ECC", acronym: "TECC", strengthRequired: 4, slno: 23, categoryName: "Others" },
      { departmentname: "T QAD", acronym: "TQAD", strengthRequired: 1, slno: 24, categoryName: "Others" },
      { departmentname: "T S CLG", acronym: "TSCLG", strengthRequired: 1, slno: 25, categoryName: "Others" },
      { departmentname: "T PACKING", acronym: "TPKG", strengthRequired: 2, slno: 26, categoryName: "Others" },
      { departmentname: "SWEEPER", acronym: "SWPR", strengthRequired: 1, slno: 27, categoryName: "Others" },
      { departmentname: "TCARDING", acronym: "TCRD", strengthRequired: 1, slno: 28, categoryName: "Others" },
      { departmentname: "TFDRG", acronym: "TFD", strengthRequired: 1, slno: 29, categoryName: "Others" },
      { departmentname: "TLFORMERBD", acronym: "TLF", strengthRequired: 6, slno: 30, categoryName: "Others" },
      { departmentname: "TCOMBER", acronym: "TCMB", strengthRequired: 4, slno: 31, categoryName: "Others" },
      { departmentname: "TSIMPLEX", acronym: "TSMP", strengthRequired: 6, slno: 32, categoryName: "Others" },
      { departmentname: "TAUTOCONER", acronym: "TATC", strengthRequired: 6, slno: 33, categoryName: "Others" },
      { departmentname: "T CLEANING", acronym: "TCLN", strengthRequired: 12, slno: 34, categoryName: "Others" },
      { departmentname: "TSPG SIDER", acronym: "TSPS", strengthRequired: 15, slno: 35, categoryName: "Others" },
      { departmentname: "STAFF", acronym: "STF", strengthRequired: 3, slno: 36, categoryName: "Others" },
      { departmentname: "SCAVENGER", acronym: "SCAV", strengthRequired: 3, slno: 37, categoryName: "Others" },

      // "8 to 8 Spinning" category
      { departmentname: "8 to 8 Spinning", acronym: "8TO8", strengthRequired: 2, slno: 38, categoryName: "Others" },
      { departmentname: "Mixing Male", acronym: "MMLE", strengthRequired: 19, slno: 39, categoryName: "Others" },
      { departmentname: "Mixing Female", acronym: "MFEM", strengthRequired: 20, slno: 40, categoryName: "Others" },
      { departmentname: "Recuritment", acronym: "RECT", strengthRequired: 1, slno: 41, categoryName: "Others" },
      { departmentname: "Canteen", acronym: "CANT", strengthRequired: 2, slno: 42, categoryName: "Others" },
    ];

    const deptsMap = {};
    for (const d of deptsData) {
      const [dept] = await db.Department.findOrCreate({
        where: { departmentname: d.departmentname, companyId },
        defaults: {
          acronym: d.acronym,
          slno: d.slno,
          strengthRequired: d.strengthRequired,
          isTrain: d.departmentname.startsWith("T ") || d.departmentname.startsWith("T") || false,
          categoryId: categoriesMap[d.categoryName],
        }
      });
      deptsMap[d.departmentname] = dept.id;
    }
    console.log("Departments created!");

    // Helper to create employee
    let codeIndex = 1000;
    const createEmployee = (name, deptName, isTrainee, employeeType = "Worker", workingType = "Regular") => {
      const code = `EMP${codeIndex++}`;
      return db.Employee.create({
        employeeCode: code,
        firstName: name.split(" ")[0],
        lastName: name.split(" ")[1] || "Kumar",
        dateOfBirth: "1995-05-15",
        gender: "Male",
        employmentStatus: "Active",
        isTrainee,
        employeeType,
        workingType,
        companyId,
        departmentId: deptsMap[deptName],
        // Required fields
        personalEmail: `${code.toLowerCase()}@test.com`,
        mobileNumber: `987654${codeIndex}`,
        currentAddressLine1: "123 Test Street",
        currentCity: "Coimbatore",
        currentState: "Tamil Nadu",
        currentPincode: "641001",
        currentCountry: "India",
        designationId: designation.id,
        employmentTypeId: employmentType.id,
        dateOfJoining: "2020-01-01",
      });
    };

    // Delete existing attendances and employees to avoid duplication
    await db.Attendance.destroy({ where: { companyId } });
    await db.Employee.destroy({ where: { companyId } });

    console.log("Adding employees and attendances according to the image...");

    const date = "2025-12-15";

    const createAttendance = async (emp, shift, status, ot = 0) => {
      return await db.Attendance.create({
        employeeId: emp.id,
        companyId,
        attendanceDate: date,
        shiftName: shift,
        status,
        overtimeHours: ot,
      });
    };

    const addDeptSample = async (deptName, config) => {
      for (const shift of ["A", "B", "C"]) {
        const shConf = config[shift] || {};
        const strCount = shConf.str || 0;
        const ot8Count = shConf.ot8 || 0;
        const otHValue = shConf.otH || 0;

        for (let i = 0; i < strCount; i++) {
          const emp = await createEmployee(`${deptName.replace(/\s+/g, "")}${shift}${i}`, deptName, false);
          let ot = 0;
          if (i < ot8Count) {
            ot = 8;
          } else if (i === strCount - 1 && otHValue > 0) {
            ot = otHValue;
          }
          await createAttendance(emp, shift, "Present", ot);
        }

        if (strCount === 0 && (ot8Count > 0 || otHValue > 0)) {
          const emp = await createEmployee(`${deptName.replace(/\s+/g, "")}${shift}OTOnly`, deptName, false);
          let ot = 0;
          if (ot8Count > 0) ot = 8;
          else ot = otHValue;
          await createAttendance(emp, shift, "Present", ot);
        }
      }
    };

    // BLOW ROOM: B: 1.0, C: 1.0, C S OT: 1
    await addDeptSample("BLOW ROOM", {
      B: { str: 1 },
      C: { str: 1, ot8: 1 }
    });

    // CARDING: A: 2.0, B: 3.0
    await addDeptSample("CARDING", {
      A: { str: 2 },
      B: { str: 3 }
    });

    // FINISHER DRAWING: A: 3.0, B: 4.0, C: 1.0
    await addDeptSample("FINISHER DRAWING", {
      A: { str: 3 },
      B: { str: 4 },
      C: { str: 1 }
    });

    // LAP FORMER: A: 1.0, C: 3.0
    await addDeptSample("LAP FORMER", {
      A: { str: 1 },
      C: { str: 3 }
    });

    // COMBER: A: 2.0, B: 2.0
    await addDeptSample("COMBER", {
      A: { str: 2 },
      B: { str: 2 }
    });

    // SIMPLEX: A: 6.0, A H OT: 3.0. B: 2.0, B S OT: 1. C: 3.0, C S OT: 2.
    await addDeptSample("SIMPLEX", {
      A: { str: 6, otH: 3.0 },
      B: { str: 2, ot8: 1 },
      C: { str: 3, ot8: 2 }
    });

    // PRE SEMI CLEANING: A: 2.0, B: 3.0, C: 3.0
    await addDeptSample("PRE SEMI CLEANING", {
      A: { str: 2 },
      B: { str: 3 },
      C: { str: 3 }
    });

    // SPINNING MAISTRY: A: 1.0, B: 1.0, C: 1.0
    await addDeptSample("SPINNING MAISTRY", {
      A: { str: 1 },
      B: { str: 1 },
      C: { str: 1 }
    });

    // SPG SIDER: A: 9.0, A S OT: 2. B: 13.0, B S OT: 1. C: 15.0, C S OT: 2.
    await addDeptSample("SPG SIDER", {
      A: { str: 9, ot8: 2 },
      B: { str: 13, ot8: 1 },
      C: { str: 15, ot8: 2 }
    });

    // AUTOCONER: A: 13.0, B: 7.0, C: 7.0, C S OT: 1.
    await addDeptSample("AUTOCONER", {
      A: { str: 13 },
      B: { str: 7 },
      C: { str: 7, ot8: 1 }
    });

    // EMPTIES CONE CARRIER: A: 4.0, B: 6.0, C: 4.0, C H OT: 8.0.
    await addDeptSample("EMPTIES CONE CARRIER", {
      A: { str: 4 },
      B: { str: 6 },
      C: { str: 4, otH: 8.0 }
    });

    // WORKER TEACHER: A: 4.0, B: 2.0, B H OT: 8.5, C: 2.0.
    await addDeptSample("WORKER TEACHER", {
      A: { str: 4 },
      B: { str: 2, otH: 8.5 },
      C: { str: 2 }
    });

    // FITTER: A: 4.0, B H OT: 3.0.
    await addDeptSample("FITTER", {
      A: { str: 4 },
      B: { str: 0, otH: 3.0 }
    });

    // FITTER HELPER: A: 19.0, B: 1.0, B H OT: 13.0, C: 1.0.
    await addDeptSample("FITTER HELPER", {
      A: { str: 19 },
      B: { str: 1, otH: 13.0 },
      C: { str: 1 }
    });

    // CLEANING: A: 7.0, B H OT: 3.5.
    await addDeptSample("CLEANING", {
      A: { str: 7 },
      B: { str: 0, otH: 3.5 }
    });

    // SEMI CLG: A: 13.5, A S OT: 1.
    const scEmp1 = await createEmployee("SC1", "SEMI CLG", false);
    await createAttendance(scEmp1, "A", "Half Day");
    const scEmp2 = await createEmployee("SC2", "SEMI CLG", false);
    await createAttendance(scEmp2, "A", "Present", 8);
    for (let i = 3; i <= 14; i++) {
      const emp = await createEmployee(`SC${i}`, "SEMI CLG", false);
      await createAttendance(emp, "A", "Present");
    }

    // ELECTRICAL: A: 6.0, B: 1.0, B H OT: 2.0, C: 1.0.
    await addDeptSample("ELECTRICAL", {
      A: { str: 6 },
      B: { str: 1, otH: 2.0 },
      C: { str: 1 }
    });

    // ROOF CLG: A: 1.0, C H OT: 2.0
    await addDeptSample("ROOF CLG", {
      A: { str: 1 },
      C: { str: 0, otH: 2.0 }
    });

    // TSIMPLEX: A S OT: 1. B: 4.0, C: 1.0.
    await addDeptSample("TSIMPLEX", {
      A: { str: 0, ot8: 1 },
      B: { str: 4 },
      C: { str: 1 }
    });

    // TSPG SIDER: A: 6.0, A S OT: 1. B: 5.0, C: 2.0, C S OT: 1.
    await addDeptSample("TSPG SIDER", {
      A: { str: 6, ot8: 1 },
      B: { str: 5 },
      C: { str: 2, ot8: 1 }
    });

    // Mixing Male: A: 10.0, B: 5.0, B H OT: 7.0, C: 4.0, C H OT: 8.0.
    await addDeptSample("Mixing Male", {
      A: { str: 10 },
      B: { str: 5, otH: 7.0 },
      C: { str: 4, otH: 8.0 }
    });

    // Mixing Female: A: 18.0, B: 2.0, B H OT: 4.0.
    await addDeptSample("Mixing Female", {
      A: { str: 18 },
      B: { str: 2, otH: 4.0 }
    });

    console.log("Data population complete!");

  } catch (err) {
    console.error("Error populating data:", err);
  } finally {
    process.exit();
  }
}

populate();
