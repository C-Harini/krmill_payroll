import React, { useState } from 'react';

const BulkUploadModal = ({ companyId, onClose, onUploadComplete }) => {
    const [csvFile, setCsvFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                setCsvFile(file);
                setUploadResults(null);
            } else {
                window.alert('Please select a valid CSV file');
                e.target.value = '';
            }
        }
    };

    const handleBulkUpload = async () => {
        if (!csvFile) {
            window.alert('Please select a CSV file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadResults(null);

        try {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const csvData = e.target.result;
                
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (prev >= 90) {
                            clearInterval(progressInterval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 300);

                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/employees/bulk-upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ csvData, companyId })
                    });

                    clearInterval(progressInterval);
                    
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.message || 'Upload failed');
                    }

                    const result = await response.json();
                    setUploadProgress(100);
                    setUploadResults(result.results);
                    
                    if (onUploadComplete) {
                        onUploadComplete();
                    }
                    
                    setTimeout(() => {
                        setIsUploading(false);
                    }, 500);
                } catch (err) {
                    clearInterval(progressInterval);
                    setIsUploading(false);
                    setUploadProgress(0);
                    window.alert('Upload error: ' + err.message);
                }
            };

            reader.onerror = () => {
                setIsUploading(false);
                window.alert('Error reading file');
            };

            reader.readAsText(csvFile);
        } catch (err) {
            setIsUploading(false);
            setUploadProgress(0);
            window.alert('Error: ' + err.message);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/employees/download-template', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to download template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'employee_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            window.alert('Error downloading template: ' + err.message);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span>📤</span> Bulk Upload Employees
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {!uploadResults ? (
                        <div className="space-y-5">
                            <p className="text-slate-600 text-sm">
                                Upload a CSV file with employee data. Make sure your CSV follows the template format.
                            </p>

                            {/* Download Template Button */}
                            <button 
                                onClick={handleDownloadTemplate}
                                className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <span>📥</span>
                                Download Template
                            </button>

                            {/* File Input */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                                    Select CSV File <span className="text-red-500">*</span>
                                </label>
                                <label className="block">
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                        className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 text-sm text-slate-600 file:hidden hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </label>
                                {csvFile && (
                                    <div className="mt-2 flex items-center gap-2 text-green-700 text-sm font-medium">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Selected: {csvFile.name}
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {isUploading && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-slate-700">Uploading...</span>
                                        <span className="text-sm font-bold text-blue-600">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <h3 className="text-lg font-bold text-slate-900">Upload Results</h3>
                            
                            {/* Results Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-100 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-slate-900">{uploadResults.total}</div>
                                    <div className="text-xs text-slate-600 mt-1 font-medium">Total</div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-700">{uploadResults.success}</div>
                                    <div className="text-xs text-green-600 mt-1 font-medium">Success</div>
                                </div>
                                <div className="bg-red-100 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-red-700">{uploadResults.failed}</div>
                                    <div className="text-xs text-red-600 mt-1 font-medium">Failed</div>
                                </div>
                            </div>

                            {/* Error Details */}
                            {uploadResults.errors && uploadResults.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        Error Details
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {uploadResults.errors.map((err, idx) => (
                                            <div key={idx} className="text-xs text-red-800 bg-white p-2 rounded border border-red-100">
                                                <strong>Row {err.row}</strong> ({err.employeeCode}): {err.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl flex gap-3">
                    <button 
                        type="button" 
                        onClick={handleClose}
                        disabled={isUploading}
                        className="flex-1 px-4 py-2.5 border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploadResults ? 'Close' : 'Cancel'}
                    </button>
                    {!uploadResults && (
                        <button 
                            type="button"
                            onClick={handleBulkUpload}
                            disabled={!csvFile || isUploading}
                            className={`flex-1 px-4 py-2.5 font-semibold rounded-lg transition-all active:scale-95 ${
                                csvFile && !isUploading
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkUploadModal;