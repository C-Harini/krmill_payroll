const { finalizeAttendance } = require('./services/attendanceProcessor');
const { Employee, Attendance } = require('./models');

(async () => {
  try {
    const emp = await Employee.findOne({ where: { employeeCode: '1011' } });
    if (!emp) {
      console.error('Employee 1011 not found');
      return;
    }

    console.log('Current Employee shiftTypeId:', emp.shiftTypeId);

    const result = await finalizeAttendance({
      companyId: 1,
      dateStr: '2026-07-23',
      employeeIds: [emp.id],
      force: true
    });

    console.log('Finalize result:', result);

    const att = await Attendance.findOne({
      where: { employeeId: emp.id, attendanceDate: '2026-07-23' }
    });

    console.log('Updated Attendance Record:');
    console.log({
      shiftName: att.shiftName,
      scheduledStartTime: att.scheduledStartTime,
      scheduledEndTime: att.scheduledEndTime,
      firstCheckIn: att.firstCheckIn,
      lastCheckOut: att.lastCheckOut,
      isFinalized: att.isFinalized,
      isLate: att.isLate,
      lateByMinutes: att.lateByMinutes,
      status: att.status,
      remarks: att.remarks
    });

  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
})();
