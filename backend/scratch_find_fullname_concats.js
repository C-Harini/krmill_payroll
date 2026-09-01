const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const rootDir = path.resolve(__dirname, '..'); // workspace root
console.log("Scanning workspace root:", rootDir);

walk(rootDir, (err, files) => {
  if (err) throw err;
  
  const matches = [];
  files.forEach(file => {
    const ext = path.extname(file);
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return;
    if (file.includes('node_modules') || file.includes('.git') || file.includes('.agents') || file.includes('.gemini') || file.includes('scratch_')) return;

    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Look for occurrences where both firstName and lastName are present on the same line
        if (line.includes('firstName') && line.includes('lastName')) {
          matches.push({
            file: path.relative(rootDir, file),
            lineNum: idx + 1,
            content: line.trim()
          });
        }
      });
    } catch (readErr) {
      // Ignore
    }
  });

  console.log(`\nFound ${matches.length} occurrences:`);
  matches.forEach(m => {
    console.log(`${m.file}:${m.lineNum}: ${m.content}`);
  });
});
