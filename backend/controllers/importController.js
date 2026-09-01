const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Holiday } = require('../models');
const { addJob, updateJob, completeJob, getJobStatus } = require('../utils/importJobStore');

// --- FUNCTION DEFINITION ---
exports.uploadAndProcessHolidays = (req, res) => {
    if (req.multerError) {
        return res.status(500).json({ message: 'File upload failed', error: req.multerError.message });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const jobId = `job_${Date.now()}`;
    const { holidayListId } = req.body;
    addJob(jobId);
    res.status(202).json({ jobId });
    processFile(req.file.path, holidayListId, jobId, req.file.originalname);
};

// --- FUNCTION DEFINITION ---
exports.getImportStatus = (req, res) => {
    const { jobId } = req.params;
    const status = getJobStatus(jobId);
    if (!status) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json(status);
};

// --- HELPER FUNCTIONS ---
async function processFile(filePath, holidayListId, jobId, originalname) {
    const fileExtension = path.extname(originalname).toLowerCase();
    let holidays = [];
    try {
        console.log(`Processing file: ${originalname} with extension: ${fileExtension}`);
        if (fileExtension === '.csv') {
            holidays = await processCsv(filePath);
        } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            holidays = await processExcel(filePath);
        } else {
            throw new Error(`Unsupported file type: ${fileExtension}. Please upload a .csv or .xlsx file.`);
        }
        console.log(`Successfully parsed ${holidays.length} holidays from file.`);
        
        // --- NEW: Pre-fetch existing holidays to handle duplicates ---
        const existingHolidays = await Holiday.findAll({
            where: { holidayListId },
            attributes: ['date'], // Only fetch the date column
        });
        const existingDates = new Set(existingHolidays.map(h => h.date));
        console.log(`Found ${existingDates.size} existing holidays in the database.`);

        // --- NEW: Loop through file data and save only new holidays ---
        for (let i = 0; i < holidays.length; i++) {
            const { date, description } = holidays[i];
            const progress = Math.round(((i + 1) / holidays.length) * 100);
            updateJob(jobId, progress, `Processing row ${i + 1} of ${holidays.length}...`);
            
            // Check if the date already exists
            if (existingDates.has(date)) {
                console.warn(`SKIPPED: Holiday for date '${date}' already exists. Skipping.`);
                continue; // Skip to the next row
            }

            try {
                await Holiday.create({
                    date,
                    description,
                    type: 'Holiday',
                    holidayListId
                });
                console.log(`SUCCESS: Created holiday for date '${date}'.`);
            } catch (e) {
                console.error(`Failed to save holiday for date '${date}':`, e);
            }
        }
        completeJob(jobId, true);
    } catch (error) {
        console.error('--- ERROR IN PROCESS FILE ---');
        console.error(error);
        completeJob(jobId, false, error.message);
    } finally {
        fs.unlinkSync(filePath);
    }
}

function processCsv(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({ headers: false }))
            .on('data', (data) => {
                results.push({ date: data[0], description: data[1] });
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// --- UPDATED HELPER FUNCTION ---
// --- FINAL HELPER FUNCTION ---
// --- FINAL HELPER FUNCTION ---
// --- FINAL HELPER FUNCTION ---
function processExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    return jsonData
        .map((row, index) => {
            // Skip the first row if it looks like a header
            if (index === 0 && (String(row[0]).toLowerCase() === 'date' || String(row[1]).toLowerCase() === 'description')) {
                console.log(`INFO: Skipping header row ${index + 1}.`);
                return null;
            }

            // --- NEW: Clean the raw date string ---
            // Trim whitespace and convert non-printable characters to a space
            const rawDateValue = String(row[0]).trim().replace(/[\x00-\x1F\x7F]/g, '');
            let formattedDate = null;

            if (rawDateValue) {
                console.log(`Attempting to parse row ${index + 1}. Cleaned raw date: "${rawDateValue}"`); // Debug log
                
                const dateObj = XLSX.SSF.parse_date_code(rawDateValue, 'yyyy-mm-dd', { dateNF: 'dd/mm/yyyy' });
                if (dateObj && !isNaN(dateObj)) {
                    formattedDate = dateObj;
                } else {
                    // Fallback for other formats
                    const fallbackDate = new Date(rawDateValue);
                    if (!isNaN(fallbackDate.getTime())) {
                        const year = fallbackDate.getFullYear();
                        const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
                        const day = String(fallbackDate.getDate()).padStart(2, '0');
                        formattedDate = `${year}-${month}-${day}`;
                    }
                }
            }

            if (!formattedDate) {
                console.error(`!!! PARSING FAILED for row ${index + 1}. Raw date: "${rawDateValue}". This row will be skipped.`);
            } else {
                console.log(`SUCCESS: Parsed row ${index + 1}. Raw date: "${rawDateValue}" -> Formatted: "${formattedDate}"`);
            }

            return {
                date: formattedDate,
                description: row[1]
            };
        })
        .filter(row => row !== null && row.date && row.description);
}