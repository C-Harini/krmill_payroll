import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const BulkLeaveAllocationModal = ({ companyId, companyName, defaultPeriodId, masterData, onClose, onSave }) => {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploading, setUploading] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [previewData, setPreviewData] = useState([]);

    // Generate Excel template
    const downloadTemplate = () => {
        const templateData = [
            {
                'Employee Code': 'EMP001',
                'Leave Type': 'Annual Leave',
                'Leave Period': '2025',
                'Allocated Leaves': 12,
                'Effective From': '2025-01-01',
                'Effective To': '2025-12-31',
                'Apply Carry Forward': 'Yes',
                'Apply Pro Rating': 'Yes',
                'Allow Negative Balance': 'No',
                'Max Negative Limit': 0,
                'Enable Monthly Accrual': 'No',
                'Monthly Accrual Rate': 1,
                'Max Carry Forward Limit': '',
                'Carry Forward Expiry Date': '',
                'Notes': ''
            },
            {
                'Employee Code': 'EMP002',
                'Leave Type': 'Sick Leave',
                'Leave Period': '2025',
                'Allocated Leaves': 10,
                'Effective From': '2025-01-01',
                'Effective To': '2025-12-31',
                'Apply Carry Forward': 'No',
                'Apply Pro Rating': 'Yes',
                'Allow Negative Balance': 'No',
                'Max Negative Limit': 0,
                'Enable Monthly Accrual': 'No',
                'Monthly Accrual Rate': 1,
                'Max Carry Forward Limit': '',
                'Carry Forward Expiry Date': '',
                'Notes': ''
            }
        ];

        const instructions = [
            ['BULK LEAVE ALLOCATION TEMPLATE - INSTRUCTIONS'],
            [''],
            ['COLUMN DESCRIPTIONS:'],
            ['1. Employee Code', 'Required - Enter the unique employee code (e.g., EMP001)'],
            ['2. Leave Type', 'Required - Enter leave type name (e.g., Annual Leave, Sick Leave, CL, EL)'],
            ['3. Leave Period', 'Required - Enter leave period name (e.g., 2025, FY 2024-25)'],
            ['4. Allocated Leaves', 'Required - Number of leaves to allocate (can include decimals like 12.5)'],
            ['5. Effective From', 'Optional - Start date for this allocation (YYYY-MM-DD). Useful for vacation leaves that start mid-year'],
            ['6. Effective To', 'Optional - End date for this allocation (YYYY-MM-DD). Useful for leaves that expire after certain period'],
            ['7. Apply Carry Forward', 'Yes/No - Automatically add previous period unused balance'],
            ['8. Apply Pro Rating', 'Yes/No - Pro-rate leaves for mid-year joiners'],
            ['9. Allow Negative Balance', 'Yes/No - Allow employees to take advance leave'],
            ['10. Max Negative Limit', 'Number - Maximum negative balance allowed (if negative balance enabled)'],
            ['11. Enable Monthly Accrual', 'Yes/No - Enable monthly accrual of leaves'],
            ['12. Monthly Accrual Rate', 'Number - Leaves accrued per month (if accrual enabled)'],
            ['13. Max Carry Forward Limit', 'Optional - Maximum days that can be carried forward'],
            ['14. Carry Forward Expiry Date', 'Optional - Date format: YYYY-MM-DD (e.g., 2025-03-31)'],
            ['15. Notes', 'Optional - Any additional remarks'],
            [''],
            ['IMPORTANT NOTES:'],
            ['• Employee Code, Leave Type, Leave Period, and Allocated Leaves are REQUIRED'],
            ['• Leave Type and Period names are CASE-INSENSITIVE (CL = cl = Cl)'],
            ['• Use exact names for Leave Type and Leave Period as they appear in the system'],
            ['• For Yes/No fields, use only "Yes" or "No" (case-insensitive)'],
            ['• All dates should be in YYYY-MM-DD format (e.g., 2025-06-15)'],
            ['• Effective From/To dates are useful for vacation leaves that are available only during specific periods'],
            ['• Example: Vacation leave from June 1 to August 31 - set Effective From: 2025-06-01, Effective To: 2025-08-31'],
            ['• If Effective From/To are empty, system will use Leave Period start/end dates'],
            ['• Duplicate allocations (same employee + leave type + period) will be rejected'],
            ['• Delete the sample rows before uploading your data'],
            [''],
            ['AVAILABLE LEAVE TYPES:'],
            ...(masterData?.leaveTypes || []).map(lt => [`• ${lt.name} (${lt.code || 'N/A'})`]),
            [''],
            ['AVAILABLE LEAVE PERIODS:'],
            ...(masterData?.leavePeriods || []).map(lp => [`• ${lp.name} (${lp.startDate} to ${lp.endDate})`])
        ];

        const wb = XLSX.utils.book_new();
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        wsInstructions['!cols'] = [{ wch: 30 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
        
        const wsTemplate = XLSX.utils.json_to_sheet(templateData);
        wsTemplate['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 18 },
            { wch: 22 }, { wch: 20 }, { wch: 25 }, { wch: 28 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsTemplate, 'Leave Allocations');

        XLSX.writeFile(wb, `Leave_Allocation_Template_${companyName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadStatus('');
            setValidationErrors([]);
            setPreviewData([]);
            previewFile(selectedFile);
        }
    };

    const previewFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames.find(name => name !== 'Instructions') || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setPreviewData(jsonData.slice(0, 5));
            } catch (error) {
                setUploadStatus('Error reading file. Please ensure it is a valid Excel file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const validateData = (data) => {
        const errors = [];
        
        console.log('=== MASTER DATA DEBUG ===');
        console.log('Leave Types:', masterData?.leaveTypes);
        console.log('Leave Periods:', masterData?.leavePeriods);
        
        const leaveTypeMap = {};
        (masterData?.leaveTypes || []).forEach(lt => {
            const key = String(lt.name).toLowerCase().trim();
            leaveTypeMap[key] = lt;
            console.log(`Leave Type Map: "${key}" => ${lt.name} (ID: ${lt.id})`);
        });
        
        const leavePeriodMap = {};
        (masterData?.leavePeriods || []).forEach(lp => {
            const key = String(lp.name).toLowerCase().trim();
            leavePeriodMap[key] = lp;
            console.log(`Leave Period Map: "${key}" => ${lp.name} (ID: ${lp.id})`);
        });
        
        console.log('=== VALIDATING DATA ===');

        data.forEach((row, index) => {
            const rowNum = index + 2;

            console.log(`\nValidating Row ${rowNum}:`, row);

            if (!row['Employee Code']) {
                errors.push(`Row ${rowNum}: Employee Code is required`);
            }
            if (!row['Leave Type']) {
                errors.push(`Row ${rowNum}: Leave Type is required`);
            } else {
                const lookupKey = String(row['Leave Type']).toLowerCase().trim();
                console.log(`  Looking up Leave Type: "${row['Leave Type']}" => key: "${lookupKey}"`);
                if (!leaveTypeMap[lookupKey]) {
                    const available = Object.keys(leaveTypeMap).map(k => `"${k}"`).join(', ');
                    errors.push(`Row ${rowNum}: Leave Type "${row['Leave Type']}" not found. Available: ${available}`);
                    console.log(`  ❌ Not found! Available: ${available}`);
                } else {
                    console.log(`  ✅ Found: ${leaveTypeMap[lookupKey].name}`);
                }
            }
            if (!row['Leave Period']) {
                errors.push(`Row ${rowNum}: Leave Period is required`);
            } else {
                const lookupKey = String(row['Leave Period']).toLowerCase().trim();
                console.log(`  Looking up Leave Period: "${row['Leave Period']}" => key: "${lookupKey}"`);
                if (!leavePeriodMap[lookupKey]) {
                    const available = Object.keys(leavePeriodMap).map(k => `"${k}"`).join(', ');
                    errors.push(`Row ${rowNum}: Leave Period "${row['Leave Period']}" not found. Available: ${available}`);
                    console.log(`  ❌ Not found! Available: ${available}`);
                } else {
                    console.log(`  ✅ Found: ${leavePeriodMap[lookupKey].name}`);
                }
            }
            if (!row['Allocated Leaves'] || isNaN(row['Allocated Leaves'])) {
                errors.push(`Row ${rowNum}: Allocated Leaves must be a valid number`);
            }

            const yesNoFields = ['Apply Carry Forward', 'Apply Pro Rating', 'Allow Negative Balance', 'Enable Monthly Accrual'];
            yesNoFields.forEach(field => {
                if (row[field] && !['yes', 'no'].includes(String(row[field]).toLowerCase())) {
                    errors.push(`Row ${rowNum}: ${field} must be "Yes" or "No"`);
                }
            });

            if (row['Carry Forward Expiry Date']) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(row['Carry Forward Expiry Date'])) {
                    errors.push(`Row ${rowNum}: Carry Forward Expiry Date must be in YYYY-MM-DD format`);
                }
            }
        });

        return errors;
    };

    const convertToPayload = (data) => {
        const leaveTypeMap = {};
        (masterData?.leaveTypes || []).forEach(lt => {
            leaveTypeMap[lt.name.toLowerCase().trim()] = lt;
        });
        
        const leavePeriodMap = {};
        (masterData?.leavePeriods || []).forEach(lp => {
            leavePeriodMap[lp.name.toLowerCase().trim()] = lp;
        });
        
        const employeeMap = {};
        (masterData?.employees || []).forEach(emp => {
            employeeMap[emp.employeeCode] = emp;
        });

        return data.map(row => {
            const leaveType = leaveTypeMap[String(row['Leave Type']).toLowerCase().trim()];
            const leavePeriod = leavePeriodMap[String(row['Leave Period']).toLowerCase().trim()];
            const employee = employeeMap[row['Employee Code']];

            const yesToBool = (val) => String(val).toLowerCase() === 'yes';

            return {
                employeeCode: row['Employee Code'],
                employeeId: employee?.id,
                leaveTypeId: leaveType?.id,
                leavePeriodId: leavePeriod?.id,
                allocatedLeaves: parseFloat(row['Allocated Leaves']),
                applyCarryForward: yesToBool(row['Apply Carry Forward']),
                applyProRating: yesToBool(row['Apply Pro Rating']),
                allowNegativeBalance: yesToBool(row['Allow Negative Balance']),
                maxNegativeLimit: parseFloat(row['Max Negative Limit']) || 0,
                enableMonthlyAccrual: yesToBool(row['Enable Monthly Accrual']),
                monthlyAccrualRate: parseFloat(row['Monthly Accrual Rate']) || null,
                maxCarryForwardLimit: row['Max Carry Forward Limit'] ? parseFloat(row['Max Carry Forward Limit']) : null,
                carryForwardExpiryDate: row['Carry Forward Expiry Date'] || null,
                effectiveFrom: row['Effective From'] || null,
                effectiveTo: row['Effective To'] || null,
                notes: row['Notes'] || null
            };
        });
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus('Please select a file first');
            return;
        }

        setUploading(true);
        setUploadStatus('Reading file...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames.find(name => name !== 'Instructions') || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    setUploadStatus('Error: File is empty or invalid');
                    setUploading(false);
                    return;
                }

                setUploadStatus('Validating data...');
                const errors = validateData(jsonData);
                
                if (errors.length > 0) {
                    setValidationErrors(errors);
                    setUploadStatus(`Validation failed: ${errors.length} error(s) found`);
                    setUploading(false);
                    return;
                }

                const allocations = convertToPayload(jsonData);

                setUploadStatus('Uploading to server...');
                const token = localStorage.getItem('authToken');
                
                const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/leave-allocations/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        companyId,
                        allocations
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Upload failed');
                }

                const result = await response.json();
                
                if (result.results.failed.length > 0) {
                    setUploadStatus(`Completed with errors:\n\nSuccessful: ${result.results.success.length}\nFailed: ${result.results.failed.length}`);
                    setValidationErrors(result.results.failed.map(f => `${f.employeeCode}: ${f.error}`));
                } else {
                    setUploadStatus(`✅ Success! Allocated leaves to ${result.results.success.length} employee(s)`);
                }

                if (onSave) {
                    await onSave();
                }

            } catch (error) {
                console.error('Upload error:', error);
                setUploadStatus('Error: ' + error.message);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6 rounded-t-xl">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span>📊</span> Bulk Leave Allocation Upload
                    </h2>
                    <p className="text-blue-100 text-sm mt-2">
                        {companyName} - Upload Excel file with leave allocations
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Step 1: Download Template */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-3">
                            <span>📥</span> Step 1: Download Template
                        </h3>
                        <p className="text-blue-800 text-sm mb-4">
                            Download the Excel template, fill in the employee leave allocation details, and upload it back.
                        </p>
                        <button
                            onClick={downloadTemplate}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 active:scale-95"
                        >
                            <span>⬇️</span>
                            Download Excel Template
                        </button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5">
                        <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-3">
                            <span>📤</span> Step 2: Upload Filled Template
                        </h3>
                        <label className="block mb-4">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="w-full px-4 py-3 border-2 border-dashed border-amber-400 rounded-lg cursor-pointer bg-white text-sm text-gray-600 file:hidden hover:bg-amber-100 transition-colors"
                            />
                        </label>
                        {file && (
                            <div className="bg-white border border-amber-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                    </svg>
                                    <div>
                                        <strong className="text-gray-800">{file.name}</strong>
                                        <span className="text-gray-500 ml-2">({(file.size / 1024).toFixed(2)} KB)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className={`px-5 py-2.5 font-semibold rounded-lg transition-colors flex items-center gap-2 active:scale-95 ${
                                file && !uploading
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <span>✅</span>
                                    Upload & Process
                                </>
                            )}
                        </button>
                    </div>

                    {/* Preview Data */}
                    {previewData.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <span>👀</span> Preview (First 5 rows)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-700 text-white">
                                            <th className="px-4 py-3 text-left">Employee Code</th>
                                            <th className="px-4 py-3 text-left">Leave Type</th>
                                            <th className="px-4 py-3 text-left">Period</th>
                                            <th className="px-4 py-3 text-right">Allocated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, idx) => (
                                            <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100`}>
                                                <td className="px-4 py-3">{row['Employee Code']}</td>
                                                <td className="px-4 py-3">{row['Leave Type']}</td>
                                                <td className="px-4 py-3">{row['Leave Period']}</td>
                                                <td className="px-4 py-3 text-right font-medium">{row['Allocated Leaves']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Upload Status */}
                    {uploadStatus && (
                        <div className={`rounded-lg p-4 border-l-4 ${
                            uploadStatus.includes('Error') || uploadStatus.includes('failed')
                                ? 'bg-red-50 border-red-500 text-red-800'
                                : uploadStatus.includes('Success')
                                ? 'bg-green-50 border-green-500 text-green-800'
                                : 'bg-amber-50 border-amber-500 text-amber-800'
                        }`}>
                            <p className="font-semibold text-sm whitespace-pre-wrap">{uploadStatus}</p>
                        </div>
                    )}

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                            <h4 className="text-lg font-bold text-red-900 flex items-center gap-2 mb-3">
                                <span>❌</span> Validation Errors ({validationErrors.length})
                            </h4>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {validationErrors.map((error, idx) => (
                                    <div key={idx} className="text-sm text-red-800 flex items-start gap-2">
                                        <span className="text-red-500 mt-1">•</span>
                                        <span>{error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkLeaveAllocationModal;