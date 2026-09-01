const { SalaryComponent, Company } = require('../models');
const { Op } = require('sequelize');
const formulaEvaluator = require('./formulaEvaluator');

// @desc    Get all salary components for a specific company
// @route   GET /api/salary-components?companyId=1&type=Earning&status=Active
// @access  Private
exports.getSalaryComponentsByCompany = async (req, res) => {
    const { companyId, type, status } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        // Build where clause dynamically
        const whereClause = { companyId };
        
        if (type) {
            whereClause.type = type;
        }
        
        if (status) {
            whereClause.status = status;
        }

        const salaryComponents = await SalaryComponent.findAll({
            where: whereClause,
            include: [{ model: Company, attributes: ['name'] }],
            order: [['displayOrder', 'ASC'], ['name', 'ASC']]
        });
        
        res.status(200).json(salaryComponents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single salary component by ID
// @route   GET /api/salary-components/:id
// @access  Private
exports.getSalaryComponentById = async (req, res) => {
    const { id } = req.params;

    try {
        const salaryComponent = await SalaryComponent.findByPk(id, {
            include: [{ model: Company, attributes: ['name'] }]
        });

        if (!salaryComponent) {
            return res.status(404).json({ message: 'Salary component not found' });
        }

        res.status(200).json(salaryComponent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new salary component
// @route   POST /api/salary-components
// @access  Private
exports.createSalaryComponent = async (req, res) => {
    const { 
        name, 
        code, 
        type, 
        calculationType, 
        percentage,
        formula,
        affectsGrossSalary,
        affectsNetSalary,
        isTaxable,
        isStatutory,
        displayOrder,
        status, 
        companyId 
    } = req.body;

    if (!name || !code || !type || !calculationType || !companyId) {
        return res.status(400).json({ 
            message: 'Missing required fields: name, code, type, calculationType, or companyId' 
        });
    }

    // Validate percentage for Percentage calculation type
    if (calculationType === 'Percentage' && !percentage) {
        return res.status(400).json({ 
            message: 'Percentage value is required for Percentage calculation type' 
        });
    }

    // Validate formula for Formula calculation type
    if (calculationType === 'Formula' && !formula) {
        return res.status(400).json({ 
            message: 'Formula expression is required for Formula calculation type' 
        });
    }

    // Validate and sanitize formula if provided
    if (calculationType === 'Formula' && formula) {
        try {
            // Get all existing components for this company to set allowed variables
            const existingComponents = await SalaryComponent.findAll({
                where: { companyId },
                attributes: ['code']
            });
            
            // Set allowed salary component codes
            formulaEvaluator.setAllowedComponents(existingComponents);
            
            // Validate the formula
            const validation = formulaEvaluator.validateFormula(formula);
            if (!validation.valid) {
                return res.status(400).json({ 
                    message: 'Invalid formula: ' + validation.error 
                });
            }
        } catch (error) {
            return res.status(400).json({ 
                message: 'Formula validation error: ' + error.message 
            });
        }
    }

    try {
        // Check if code already exists for this company
        const existingComponent = await SalaryComponent.findOne({
            where: { code, companyId }
        });

        if (existingComponent) {
            return res.status(409).json({ 
                message: 'Salary component with this code already exists for this company' 
            });
        }

        const newSalaryComponent = await SalaryComponent.create({
            name,
            code,
            type,
            calculationType,
            percentage: calculationType === 'Percentage' ? percentage : null,
            formula: calculationType === 'Formula' ? formula : null,
            affectsGrossSalary: affectsGrossSalary !== undefined ? affectsGrossSalary : true,
            affectsNetSalary: affectsNetSalary !== undefined ? affectsNetSalary : true,
            isTaxable: isTaxable !== undefined ? isTaxable : true,
            isStatutory: isStatutory !== undefined ? isStatutory : false,
            displayOrder: displayOrder || 0,
            status: status || 'Active',
            companyId,
        });
        
        res.status(201).json(newSalaryComponent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a salary component
// @route   PUT /api/salary-components/:id
// @access  Private
exports.updateSalaryComponent = async (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        code, 
        type, 
        calculationType, 
        percentage,
        formula,
        affectsGrossSalary,
        affectsNetSalary,
        isTaxable,
        isStatutory,
        displayOrder,
        status
        // companyId removed - should not be updatable
    } = req.body;

    try {
        const salaryComponent = await SalaryComponent.findByPk(id);
        
        if (!salaryComponent) {
            return res.status(404).json({ message: 'Salary component not found' });
        }

        // Optional: Add authorization check
        // if (salaryComponent.companyId !== req.user.companyId) {
        //     return res.status(403).json({ message: 'Forbidden' });
        // }

        // Check if code is being changed and if new code already exists
        if (code && code !== salaryComponent.code) {
            const existingComponent = await SalaryComponent.findOne({
                where: { 
                    code, 
                    companyId: salaryComponent.companyId,
                    id: { [Op.ne]: id }
                }
            });

            if (existingComponent) {
                return res.status(409).json({ 
                    message: 'Salary component with this code already exists for this company' 
                });
            }
        }

        // Determine the effective calculationType (use new value if provided, otherwise keep existing)
        const effectiveCalculationType = calculationType || salaryComponent.calculationType;

        // Validate percentage for Percentage calculation type
        if (effectiveCalculationType === 'Percentage') {
            const effectivePercentage = percentage !== undefined ? percentage : salaryComponent.percentage;
            if (!effectivePercentage) {
                return res.status(400).json({ 
                    message: 'Percentage value is required for Percentage calculation type' 
                });
            }
        }

        // Validate formula for Formula calculation type
        if (effectiveCalculationType === 'Formula') {
            const effectiveFormula = formula !== undefined ? formula : salaryComponent.formula;
            if (!effectiveFormula) {
                return res.status(400).json({ 
                    message: 'Formula expression is required for Formula calculation type' 
                });
            }
            
            // Validate the formula
            try {
                // Get all existing components for this company
                const existingComponents = await SalaryComponent.findAll({
                    where: { companyId: salaryComponent.companyId },
                    attributes: ['code']
                });
                
                // Set allowed salary component codes
                formulaEvaluator.setAllowedComponents(existingComponents);
                
                // Validate the formula
                const validation = formulaEvaluator.validateFormula(effectiveFormula);
                if (!validation.valid) {
                    return res.status(400).json({ 
                        message: 'Invalid formula: ' + validation.error 
                    });
                }
            } catch (error) {
                return res.status(400).json({ 
                    message: 'Formula validation error: ' + error.message 
                });
            }
        }

        // Prepare update data - only include fields that are provided
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (code !== undefined) updateData.code = code;
        if (type !== undefined) updateData.type = type;
        if (calculationType !== undefined) {
            updateData.calculationType = calculationType;
            // Set percentage/formula based on new calculationType
            updateData.percentage = calculationType === 'Percentage' ? percentage : null;
            updateData.formula = calculationType === 'Formula' ? formula : null;
        } else {
            // If calculationType not changed, update percentage/formula if provided
            if (percentage !== undefined) updateData.percentage = percentage;
            if (formula !== undefined) updateData.formula = formula;
        }
        if (affectsGrossSalary !== undefined) updateData.affectsGrossSalary = affectsGrossSalary;
        if (affectsNetSalary !== undefined) updateData.affectsNetSalary = affectsNetSalary;
        if (isTaxable !== undefined) updateData.isTaxable = isTaxable;
        if (isStatutory !== undefined) updateData.isStatutory = isStatutory;
        if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
        if (status !== undefined) updateData.status = status;
        // companyId is intentionally NOT included - should never be updated

        await salaryComponent.update(updateData);
        
        res.status(200).json(salaryComponent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a salary component
// @route   DELETE /api/salary-components/:id
// @access  Private
exports.deleteSalaryComponent = async (req, res) => {
    const { id } = req.params;

    try {
        const salaryComponent = await SalaryComponent.findByPk(id);
        
        if (!salaryComponent) {
            return res.status(404).json({ message: 'Salary component not found' });
        }

        // Optional: Add authorization check
        // if (salaryComponent.companyId !== req.user.companyId) {
        //     return res.status(403).json({ message: 'Forbidden' });
        // }

        // Optional: Check if component is being used in any salary structures
        // before allowing deletion

        await salaryComponent.destroy();
        res.status(200).json({ message: 'Salary component deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Validate a formula expression
// @route   POST /api/salary-components/validate-formula
// @access  Private
exports.validateFormula = async (req, res) => {
    const { formula, companyId } = req.body;

    if (!formula) {
        return res.status(400).json({ message: 'Formula is required' });
    }

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        // Get all existing components for this company
        const existingComponents = await SalaryComponent.findAll({
            where: { companyId },
            attributes: ['code', 'name']
        });
        
        // Set allowed salary component codes
        formulaEvaluator.setAllowedComponents(existingComponents);
        
        // Validate the formula
        const validation = formulaEvaluator.validateFormula(formula);
        
        if (validation.valid) {
            res.status(200).json({ 
                valid: true, 
                message: 'Formula is valid',
                availableVariables: formulaEvaluator.getFormulaHelp()
            });
        } else {
            res.status(400).json({ 
                valid: false, 
                error: validation.error 
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            message: 'Validation error', 
            error: error.message 
        });
    }
};

// @desc    Get formula help (available variables and examples)
// @route   GET /api/salary-components/formula-help?companyId=1
// @access  Private
exports.getFormulaHelp = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        // Get all existing components for this company
        const existingComponents = await SalaryComponent.findAll({
            where: { companyId, status: 'Active' },
            attributes: ['code', 'name', 'type'],
            order: [['name', 'ASC']]
        });
        
        // Set allowed salary component codes
        formulaEvaluator.setAllowedComponents(existingComponents);
        
        // Get formula help
        const help = formulaEvaluator.getFormulaHelp();
        
        // Add component details
        help.availableComponents = existingComponents.map(c => ({
            code: c.code,
            name: c.name,
            type: c.type
        }));
        
        res.status(200).json(help);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};