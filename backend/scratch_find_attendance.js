const fs = require('fs');
const path = require('path');

const controllersDir = path.resolve(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir);

console.log("Searching for 'getAttendanceReport' in controllers...");
files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
    if (content.includes('getAttendanceReport')) {
      console.log(`Found in: ${file}`);
      
      // Let's print the line numbers and matching lines
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('getAttendanceReport')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
