const mysql = require('mysql2/promise');

const mapping = [
  { curr: '4016', next: '7915', name: 'KARTHIKRAJA S', origId: 334, dupId: 589 },
  { curr: '4017', next: '7906', name: 'MARIMUTHU T', origId: 335, dupId: 588 },
  { curr: '4018', next: '7881', name: 'AYYAMMAL P', origId: 336, dupId: 579 },
  { curr: '4019', next: '7921', name: 'RAJA P', origId: 337, dupId: 590 },
  { curr: '4020', next: '7837', name: 'YUVARANI V', origId: 338, dupId: 569 },
  { curr: '4021', next: '7802', name: 'MATHAVI V', origId: 339, dupId: 568 },
  { curr: '4022', next: '7904', name: 'MANIDURAICHI K', origId: 340, dupId: 587 },
  { curr: '4023', next: '7888', name: 'THANNASI M', origId: 341, dupId: 582 },
  { curr: '4024', next: '7855', name: 'SEETHALAKSHMI P', origId: 342, dupId: 570 },
  { curr: '4025', next: '7822', name: 'MUTHUPRIYA A', origId: 343, dupId: 571 },
  { curr: '4026', next: '7817', name: 'ABINAYA K', origId: 344, dupId: 573 },
  { curr: '4027', next: '7715', name: 'MUNIYAMMAL M', origId: 345, dupId: 574 },
  { curr: '4028', next: '7858', name: 'KALAIYARASI V', origId: 346, dupId: 577 },
  { curr: '4029', next: '7766', name: 'SANMUGALAKSHMI S', origId: 347, dupId: 575 },
  { curr: '4030', next: '7857', name: 'KARPAGALAKSHMI S', origId: 348, dupId: 572 }
];

async function runMigration(isDryRun = true) {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'har123', database: 'pay_sep' });
  await db.beginTransaction();

  try {
    console.log(`=== STARTING ${isDryRun ? 'DRY RUN' : 'ACTUAL EXECUTION'} ===`);

    for (const m of mapping) {
      console.log(`\nProcessing: ${m.curr} -> ${m.next} (${m.name})`);
      console.log(`  Orig ID: ${m.origId}, Dup ID: ${m.dupId}`);

      // 1. Update original employee with newEmployeeCode & newBiometricEnrollmentId
      await db.query(
        'UPDATE employees SET newEmployeeCode = ?, newBiometricEnrollmentId = ? WHERE id = ?',
        [m.next, m.next, m.origId]
      );
      console.log(`  ✓ Updated employee #${m.origId} with newEmployeeCode = '${m.next}', newBiometricEnrollmentId = '${m.next}'`);

      // 2. Handle attendances carefully
      const [dupAtts] = await db.query('SELECT * FROM attendances WHERE employeeId = ?', [m.dupId]);
      let repointedAttCount = 0;
      let mergedAttCount = 0;

      for (const da of dupAtts) {
        // Check if orig already has attendance for this date
        const [origAtt] = await db.query(
          'SELECT * FROM attendances WHERE employeeId = ? AND attendanceDate = ?',
          [m.origId, da.attendanceDate]
        );

        if (origAtt.length > 0) {
          const oa = origAtt[0];
          // If dup has actual punch/present and orig was absent, copy dup's values to orig
          if (da.status === 'Present' || (da.totalCheckIns > 0 && oa.totalCheckIns === 0)) {
            await db.query(
              `UPDATE attendances SET
                status = ?,
                firstCheckIn = ?,
                lastCheckOut = ?,
                totalCheckIns = ?,
                totalCheckOuts = ?,
                workingHours = ?,
                overtimeHours = ?,
                isLate = ?,
                lateByMinutes = ?,
                isEarlyExit = ?,
                earlyExitMinutes = ?,
                shiftName = ?
              WHERE id = ?`,
              [
                da.status,
                da.firstCheckIn,
                da.lastCheckOut,
                da.totalCheckIns,
                da.totalCheckOuts,
                da.workingHours,
                da.overtimeHours,
                da.isLate,
                da.lateByMinutes,
                da.isEarlyExit,
                da.earlyExitMinutes,
                da.shiftName,
                oa.id
              ]
            );
          }
          // Delete duplicate row
          await db.query('DELETE FROM attendances WHERE id = ?', [da.id]);
          mergedAttCount++;
        } else {
          // Repoint to origId
          await db.query('UPDATE attendances SET employeeId = ? WHERE id = ?', [m.origId, da.id]);
          repointedAttCount++;
        }
      }
      console.log(`  ✓ Attendances: ${repointedAttCount} transferred, ${mergedAttCount} merged`);

      // 3. Repoint biometric punches
      const [bioRes] = await db.query(
        'UPDATE biometric_punches SET employeeId = ? WHERE employeeId = ?',
        [m.origId, m.dupId]
      );
      console.log(`  ✓ Biometric punches: ${bioRes.affectedRows} transferred`);

      // 4. Repoint eight_eight_entries
      const [dupEE] = await db.query('SELECT * FROM eight_eight_entries WHERE employeeId = ?', [m.dupId]);
      for (const ee of dupEE) {
        const [existing] = await db.query(
          'SELECT id FROM eight_eight_entries WHERE employeeId = ? AND date = ? AND entryType = ?',
          [m.origId, ee.date, ee.entryType]
        );
        if (existing.length > 0) {
          await db.query('DELETE FROM eight_eight_entries WHERE id = ?', [ee.id]);
        } else {
          await db.query('UPDATE eight_eight_entries SET employeeId = ? WHERE id = ?', [m.origId, ee.id]);
        }
      }
      console.log(`  ✓ Eight-eight entries: ${dupEE.length} handled`);

      // 5. Merge/Repoint employee_shifts
      const [dupShifts] = await db.query('SELECT * FROM employee_shifts WHERE employeeId = ?', [m.dupId]);
      for (const ds of dupShifts) {
        const [origShifts] = await db.query(
          'SELECT * FROM employee_shifts WHERE employeeId = ? AND companyId = ? AND shiftName = ? AND month = ? AND year = ?',
          [m.origId, ds.companyId, ds.shiftName, ds.month, ds.year]
        );

        if (origShifts.length > 0) {
          const os = origShifts[0];
          await db.query(
            `UPDATE employee_shifts SET 
              totalDays = totalDays + ?, 
              presentDays = presentDays + ?,
              presentWithPermissionDays = presentWithPermissionDays + ?,
              absentDays = absentDays + ?,
              leaveDays = leaveDays + ?,
              lateDays = lateDays + ?,
              earlyExitDays = earlyExitDays + ?,
              totalWorkingHours = totalWorkingHours + ?,
              totalOvertimeHours = totalOvertimeHours + ?,
              totalPermissionMinutes = totalPermissionMinutes + ?
            WHERE id = ?`,
            [
              ds.totalDays || 0,
              ds.presentDays || 0,
              ds.presentWithPermissionDays || 0,
              ds.absentDays || 0,
              ds.leaveDays || 0,
              ds.lateDays || 0,
              ds.earlyExitDays || 0,
              ds.totalWorkingHours || 0,
              ds.totalOvertimeHours || 0,
              ds.totalPermissionMinutes || 0,
              os.id
            ]
          );
          await db.query('DELETE FROM employee_shifts WHERE id = ?', [ds.id]);
        } else {
          await db.query('UPDATE employee_shifts SET employeeId = ? WHERE id = ?', [m.origId, ds.id]);
        }
      }
      console.log(`  ✓ Employee shifts: ${dupShifts.length} handled`);

      // 6. Delete the duplicate employee record
      const [delEmp] = await db.query('DELETE FROM employees WHERE id = ?', [m.dupId]);
      console.log(`  ✓ Removed duplicate employee #${m.dupId} (code '${m.next}')`);
    }

    if (isDryRun) {
      console.log('\n======================================================');
      console.log('DRY RUN FINISHED WITH ZERO ERRORS! Rolling back...');
      console.log('======================================================');
      await db.rollback();
    } else {
      console.log('\n======================================================');
      console.log('MIGRATION COMMITTED SUCCESSFULLY!');
      console.log('======================================================');
      await db.commit();
    }
  } catch (err) {
    console.error('Error during migration, rolling back:', err);
    await db.rollback();
    throw err;
  } finally {
    await db.end();
  }
}

const isActual = process.argv.includes('--execute');
runMigration(!isActual).catch(console.error);
