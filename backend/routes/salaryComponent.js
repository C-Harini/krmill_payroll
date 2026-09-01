const express = require('express');
const router = express.Router();
const salaryComponentController = require('../controllers/salaryComponentController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all routes
//router.use(authMiddleware);

// Optional: Add company authorization middleware
// This ensures users can only access their own company's data
const validateCompanyAccess = (req, res, next) => {
    const requestedCompanyId = req.query.companyId || req.body.companyId;
    
    // If no companyId in request, let controller handle it
    if (!requestedCompanyId) {
        return next();
    }
    
    // Check if user's company matches requested company
    // Adjust based on your auth structure (req.user.companyId, req.user.company.id, etc.)
    if (req.user && req.user.companyId && req.user.companyId !== parseInt(requestedCompanyId)) {
        return res.status(403).json({ 
            message: 'Forbidden: You can only access your own company\'s data' 
        });
    }
    
    next();
};

// Apply company validation to routes that need it
router.get('/', validateCompanyAccess, salaryComponentController.getSalaryComponentsByCompany);
router.get('/:id', salaryComponentController.getSalaryComponentById);
router.post('/', validateCompanyAccess, salaryComponentController.createSalaryComponent);
router.put('/:id', salaryComponentController.updateSalaryComponent);
router.delete('/:id', salaryComponentController.deleteSalaryComponent);

// routes/salaryComponent.js
router.post('/validate-formula', salaryComponentController.validateFormula);
router.get('/formula-help', salaryComponentController.getFormulaHelp);

module.exports = router;