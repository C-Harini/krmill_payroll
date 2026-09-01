const http = require('http');

const url = 'http://localhost:8000/api/employee-shifts/shift-report?companyId=1&startDate=2026-07-01&endDate=2026-07-31&reportType=monthly_attendance';
console.log("Fetching from:", url);

http.get(url, (res) => {
  let data = '';
  console.log("Response status:", res.statusCode);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log("Data sample:", data.substring(0, 500));
  });
}).on('error', (err) => {
  console.error("Fetch error:", err.message);
});
