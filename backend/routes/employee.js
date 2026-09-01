const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const upload = require('../middleware/upload');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

// Define the fields for multiple file uploads
const uploadFields = upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'panDocument', maxCount: 1 },
    { name: 'aadhaarDocument', maxCount: 1 },
    { name: 'passportDocument', maxCount: 1 },
    { name: 'drivingLicenseDocument', maxCount: 1 },
    { name: 'voterIdDocument', maxCount: 1 },
    { name: 'adolescenceCertificate', maxCount: 1 }
]);
const documentUploadFields = upload.fields([
    { name: 'aadhaarDocument', maxCount: 1 },
    { name: 'passportDocument', maxCount: 1 },
    { name: 'voterIdDocument', maxCount: 1 },
    { name: 'drivingLicenseDocument', maxCount: 1 },
    { name: 'panDocument', maxCount: 1 }
]);

router.get('/', employeeController.getEmployeesByCompany);
router.get('/count/active', employeeController.getActiveEmployeeCount);
router.get('/download-template', employeeController.downloadTemplate);
router.get('/download-workload-template', employeeController.downloadWorkloadTemplate);
router.put('/bulk-workload', employeeController.bulkUpdateWorkloads);
router.post('/bulk-upload-workload', employeeController.bulkUploadWorkload);
router.put('/:id/workload', employeeController.updateEmployeeWorkload);
router.get('/:id', employeeController.getEmployeeById);

// Use uploadFields instead of upload.single for create/update
router.post('/', uploadFields, employeeController.createEmployee);
router.post('/bulk-upload', employeeController.bulkUploadEmployees);
router.put('/:id', uploadFields, employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.put('/:id/documents', documentUploadFields, employeeController.updateEmployeeDocuments);
router.put('/:id/relations', employeeController.updateEmployeeRelations); 

module.exports = router;