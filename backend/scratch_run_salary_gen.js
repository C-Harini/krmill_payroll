const http = require("http");

const data = JSON.stringify({
  companyId: 1,
  month: 7,
  year: 2026
});

const options = {
  hostname: "localhost",
  port: 8000,
  path: "/api/salary-generation/generate",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

console.log("Triggering salary generation for July 2026...");
const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Response Status Code:", res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log("Response Body Summary:", {
        message: parsed.message,
        summary: parsed.summary,
        months: parsed.months,
        resultsErrorCount: parsed.results?.errors?.length
      });
      if (parsed.results?.errors && parsed.results.errors.length > 0) {
        console.log("Errors encountered during generation:", parsed.results.errors.slice(0, 5));
      }
    } catch (e) {
      console.log("Raw Response Body:", body.slice(0, 500));
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.write(data);
req.end();
