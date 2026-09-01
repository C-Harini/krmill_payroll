require("dotenv").config();
const { pool } = require('./config/db');

(async () => {
  try {
    console.log("=== Timezone Variables ===");
    const [tzRes] = await pool.query("SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz, NOW() as current_db_time, UTC_TIMESTAMP() as current_utc_time");
    console.log(tzRes[0]);

    console.log("\n=== Sample Biometric Punches ===");
    const [punches] = await pool.query("SELECT id, employeeId, punchTime, punchDate, punchType, isManual, createdAt FROM biometric_punches ORDER BY id DESC LIMIT 5");
    punches.forEach(p => {
      console.log(`Punch ID: ${p.id}, Employee: ${p.employeeId}, PunchTime: ${p.punchTime} (type: ${typeof p.punchTime}), PunchDate: ${p.punchDate}, PunchType: ${p.punchType}, CreatedAt: ${p.createdAt}`);
    });

    console.log("\n=== Sample Attendances ===");
    const [attendances] = await pool.query("SELECT id, employeeId, attendanceDate, firstCheckIn, lastCheckOut, shiftName, status FROM attendances WHERE firstCheckIn IS NOT NULL ORDER BY id DESC LIMIT 5");
    attendances.forEach(a => {
      console.log(`Att ID: ${a.id}, Employee: ${a.employeeId}, Date: ${a.attendanceDate}, CheckIn: ${a.firstCheckIn} (type: ${typeof a.firstCheckIn}), CheckOut: ${a.lastCheckOut}, Status: ${a.status}`);
    });
  } catch (e) {
    console.error("Error executing query:", e);
  } finally {
    await pool.end();
  }
})();
