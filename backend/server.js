require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./models");
const path = require("path");
const { initAttendanceCrons } = require("./services/attendenceCron");
const attendanceRoutes = require("./routes/attendanceRoutes");
const routes = require("./routes");
const importRoutes = require("./routes/import");
const autoSyncService = require("./services/BiometricAutoSyncService");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ Removed global express.text({ type: "*/*" }) — was consuming multipart/form-data streams

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================
// BIOMETRIC DEVICE ROUTES (before API routes)
// ============================================

// ✅ STEP 1: Device GETs config first — must return proper format
app.get("/iclock/cdata", (req, res) => {
  const sn = req.query.SN;
  console.log("🔧 Device config request, SN:", sn);
  const response = [
    `GET OPTION FROM: ${sn}`,
    `Stamp=9999`,
    `OpStamp=9999`,
    `ErrorDelay=60`,
    `Delay=30`,
    `TransTimes=00:00;14:05`,
    `TransInterval=1`,
    `TransFlag=1111000000`,
    `Realtime=1`,
    `Encrypt=0`,
  ].join("\n");
  res.status(200).send(response);
});

// ✅ STEP 2: Device POSTs punch data here
// express.text scoped only to this route — won't affect multipart/form-data elsewhere
app.post("/iclock/cdata", express.text({ type: "*/*" }), (req, res) => {
  const { SN, table } = req.query;
  console.log("📡 Punch data received, SN:", SN, "Table:", table);
  console.log("Body:", req.body);

  if (table === "ATTLOG" && req.body) {
    const lines = req.body.trim().split("\r\n");
    lines.forEach((line) => {
      const [pin, datetime, status, verify] = line.split("\t");
      console.log(`👤 PIN: ${pin} | Time: ${datetime} | Status: ${status}`);
      // TODO: Save to DB
    });
  }
  res.status(200).send("OK");
});

// ✅ STEP 3: Device heartbeat/polls for commands
app.get("/iclock/getrequest", (req, res) => {
  console.log("📶 Device heartbeat, SN:", req.query.SN);
  res.status(200).send("OK");
});

// ✅ Device posts command results
app.post("/iclock/devicecmd", express.text({ type: "*/*" }), (req, res) => {
  console.log("📲 Device cmd result:", req.body);
  res.status(200).send("OK");
});

// ============================================
// API ROUTES
// ============================================
app.use("/api", routes);
app.use("/api/import", importRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.send("Payroll API is running...");
});

// ============================================
// START SERVER — only once!
// ============================================
const PORT = process.env.PORT || 8000;

async function seedDefaultUser() {
  try {
    const bcrypt = require("bcryptjs");
    const [company] = await db.Company.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        name: "Kayaar Exports Pvt Ltd.,",
        status: "Active"
      }
    });

    const defaultEmail = process.env.DEFAULT_USER_EMAIL || "admin@kayaar.com";
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "password123";

    try {
      const existingUser = await db.User.findOne({ where: { email: defaultEmail } });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await db.User.create({
          email: defaultEmail,
          password: hashedPassword,
          phoneNumber: "9999999999",
          role: "Admin",
          status: "Active",
          companyId: company.id,
          firstName: "System",
          lastName: "Admin"
        });
        console.log(`\n==========================================`);
        console.log(`✅ Default admin user created successfully!`);
        console.log(`📧 Email: ${defaultEmail}`);
        console.log(`🔑 Password: ${defaultPassword}`);
        console.log(`==========================================\n`);
      } else {
        console.log("ℹ️ Default admin user already exists.");
      }
    } catch (err) {
      console.warn("⚠️ Warning seeding default admin user:", err.message);
    }

    try {
      // Seed default HR User
      const hrEmail = "hr@kayaar.com";
      const hrPassword = "password123";
      const existingHR = await db.User.findOne({ where: { email: hrEmail } });
      if (!existingHR) {
        const hashedHRPassword = await bcrypt.hash(hrPassword, 10);
        await db.User.create({
          email: hrEmail,
          password: hashedHRPassword,
          phoneNumber: "8888888888",
          role: "HR",
          status: "Active",
          companyId: company.id,
          firstName: "HR",
          lastName: "Manager"
        });
        console.log(`\n==========================================`);
        console.log(`✅ Default HR user created successfully!`);
        console.log(`📧 Email: ${hrEmail}`);
        console.log(`🔑 Password: ${hrPassword}`);
        console.log(`==========================================\n`);
      } else {
        console.log("ℹ️ Default HR user already exists.");
      }
    } catch (err) {
      console.warn("⚠️ Warning seeding default HR user:", err.message);
    }

    // Seed employment types
    const employmentTypesToSeed = ["staff", "worker", "staff-per-day", "supervisor"];
    for (const name of employmentTypesToSeed) {
      const [empTypeRow, created] = await db.EmploymentType.findOrCreate({
        where: { name, companyId: company.id },
        defaults: { status: "Active" }
      });
      if (created) {
        console.log(`✅ Seeded employment type: ${name}`);
      }
    }

    // Seed supervisor shifts (SUP_A, SUP_B, SUP_C)
    const supervisorShiftsToSeed = [
      { name: "SUP_A", startTime: "07:20:00", endTime: "17:00:00", beginCheckInBefore: 15, allowCheckOutAfter: 15, companyId: company.id, status: "Active" },
      { name: "SUP_B", startTime: "16:00:00", endTime: "01:00:00", beginCheckInBefore: 15, allowCheckOutAfter: 15, companyId: company.id, status: "Active" },
      { name: "SUP_C", startTime: "00:20:00", endTime: "08:00:00", beginCheckInBefore: 15, allowCheckOutAfter: 15, companyId: company.id, status: "Active" }
    ];

    for (const shift of supervisorShiftsToSeed) {
      const existingShift = await db.ShiftType.findOne({ where: { name: shift.name, companyId: company.id } });
      if (!existingShift) {
        await db.ShiftType.create(shift);
        console.log(`✅ Seeded supervisor shift: ${shift.name}`);
      }
    }
  } catch (err) {
    console.error("❌ Error seeding default user:", err);
  }
}

async function syncDbChanges() {
  try {
    await db.DepartmentAttendance.sync();
    console.log("✅ hr_department_attendance table verified/synced successfully");
  } catch (err) {
    console.log("ℹ️ hr_department_attendance table sync status:", err.message);
  }

  try {
    await db.DiscrepancyApproval.sync({ alter: true });
    console.log("✅ discrepancy_approvals table verified/synced successfully");
  } catch (err) {
    console.log("ℹ️ discrepancy_approvals table sync status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE users MODIFY COLUMN role ENUM('Staff', 'Admin', 'Department Admin', 'Super Admin', 'HR') NOT NULL DEFAULT 'Staff';");
    console.log("✅ Users table role ENUM updated successfully with 'HR'");
  } catch (err) {
    console.log("ℹ️ Users table role ENUM update details:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE attendances ADD COLUMN departmentId INT NULL;");
    console.log("✅ Added departmentId column to attendances");
  } catch (err) {
    console.log("ℹ️ DepartmentId column in attendances status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE attendances ADD COLUMN workedDeptId INT NULL;");
    console.log("✅ Added workedDeptId column to attendances");
  } catch (err) {
    console.log("ℹ️ WorkedDeptId column in attendances status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE attendances ADD COLUMN shiftId INT NULL;");
    console.log("✅ Added shiftId column to attendances");
  } catch (err) {
    console.log("ℹ️ ShiftId column in attendances status:", err.message);
  }

  // --- OTHours Table Alterations ---
  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN workedDeptId INT NULL;");
    console.log("✅ Added workedDeptId column to ot_hours");
  } catch (err) {
    console.log("ℹ️ WorkedDeptId column in ot_hours status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN shiftId INT NULL;");
    console.log("✅ Added shiftId column to ot_hours");
  } catch (err) {
    console.log("ℹ️ ShiftId column in ot_hours status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN otTypeId INT NULL;");
    console.log("✅ Added otTypeId column to ot_hours");
  } catch (err) {
    console.log("ℹ️ OtTypeId column in ot_hours status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN createdBy INT NULL;");
    console.log("✅ Added createdBy column to ot_hours");
  } catch (err) {
    console.log("ℹ️ CreatedBy column in ot_hours status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN updatedBy INT NULL;");
    console.log("✅ Added updatedBy column to ot_hours");
  } catch (err) {
    console.log("ℹ️ UpdatedBy column in ot_hours status:", err.message);
  }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN fromTime VARCHAR(50) NULL;");
  } catch (err) { }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN toTime VARCHAR(50) NULL;");
  } catch (err) { }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN otType VARCHAR(50) NULL;");
  } catch (err) { }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN ticketNo VARCHAR(50) NULL;");
  } catch (err) { }

  try {
    await db.sequelize.query("ALTER TABLE ot_hours ADD COLUMN empName VARCHAR(150) NULL;");
  } catch (err) { }
}

db.sequelize
  .sync({ alter: false })
  .then(async () => {
    await seedDefaultUser();
    await syncDbChanges();
    initAttendanceCrons();

    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log("🔄 Starting Biometric Auto-Sync Service...");
      autoSyncService.start();
      console.log("✅ Auto-sync started — syncing every 5 minutes");
    });

    // ✅ Graceful shutdown
    process.on("SIGTERM", () => {
      autoSyncService.stop();
      server.close(() => console.log("HTTP server closed"));
    });

    process.on("SIGINT", () => {
      autoSyncService.stop();
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error("❌ Unable to connect to the database:", err);
  });
