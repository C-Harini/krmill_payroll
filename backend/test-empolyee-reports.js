// test-employee-reports.js
// Place this file in your backend folder and run: node test-employee-reports.js

console.log('🔍 Testing Employee Reports Controller...\n');

try {
  // Test 1: Load the controller
  console.log('Test 1: Loading controller...');
  const controller = require('./controllers/employeeReportsController');
  console.log('✅ Controller loaded successfully!\n');

  // Test 2: Check available functions
  console.log('Test 2: Checking available functions...');
  const functions = Object.keys(controller);
  console.log('Found functions:', functions);
  console.log('Total functions:', functions.length, '\n');

  // Test 3: Verify each function is actually a function
  console.log('Test 3: Verifying function types...');
  const expectedFunctions = [
    'getEmployeeDetails',
    'getLeaveBalance',
    'getLeaveTaken',
    'getAttendanceReport',
    'getBiometricReport',
    'getComprehensiveReport',
    'exportEmployeeDetailsPDF'
  ];

  let allGood = true;
  expectedFunctions.forEach(funcName => {
    const exists = typeof controller[funcName] === 'function';
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${funcName}: ${typeof controller[funcName]}`);
    if (!exists) allGood = false;
  });

  console.log('\n');

  if (allGood) {
    console.log('🎉 SUCCESS! All functions are properly exported!\n');
    console.log('You can now use these routes:');
    console.log('  GET /api/employee-reports/employee-details');
    console.log('  GET /api/employee-reports/leave-balance');
    console.log('  GET /api/employee-reports/leave-taken');
    console.log('  GET /api/employee-reports/attendance');
    console.log('  GET /api/employee-reports/biometric');
    console.log('  GET /api/employee-reports/comprehensive');
    console.log('  GET /api/employee-reports/export/employee-details-pdf');
  } else {
    console.log('❌ ERROR: Some functions are missing or not exported correctly!');
    console.log('Please check your employeeReportsController.js file.');
  }

} catch (error) {
  console.error('❌ ERROR loading controller:', error.message);
  console.error('\nPossible causes:');
  console.error('1. File path is wrong');
  console.error('2. Syntax error in the controller file');
  console.error('3. Missing dependencies');
  console.error('\nFull error:');
  console.error(error);
}

console.log('\n--- Test Complete ---\n');