// // // // const { Formula, SalaryComponent, Company } = require('../models');
// // // // const { Op } = require('sequelize');

// // // // // @desc    Get all formulas for a specific company
// // // // // @route   GET /api/formulas?companyId=1&isActive=true
// // // // // @access  Private
// // // // exports.getFormulasByCompany = async (req, res) => {
// // // //     const { companyId, isActive } = req.query;

// // // //     if (!companyId) {
// // // //         return res.status(400).json({ message: 'Company ID is required' });
// // // //     }

// // // //     try {
// // // //         const whereClause = { companyId };
        
// // // //         if (isActive !== undefined) {
// // // //             whereClause.isActive = isActive === 'true';
// // // //         }

// // // //         const formulas = await Formula.findAll({
// // // //             where: whereClause,
// // // //             include: [
// // // //                 { 
// // // //                     model: Company, 
// // // //                     attributes: ['name'] 
// // // //                 },
// // // //                 { 
// // // //                     model: SalaryComponent, 
// // // //                     as: 'targetComponent',
// // // //                     attributes: ['id', 'name', 'code', 'type'] 
// // // //                 }
// // // //             ],
// // // //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// // // //         });
        
// // // //         res.status(200).json(formulas);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Get a single formula by ID
// // // // // @route   GET /api/formulas/:id
// // // // // @access  Private
// // // // exports.getFormulaById = async (req, res) => {
// // // //     const { id } = req.params;

// // // //     try {
// // // //         const formula = await Formula.findByPk(id, {
// // // //             include: [
// // // //                 { model: Company, attributes: ['name'] },
// // // //                 { 
// // // //                     model: SalaryComponent, 
// // // //                     as: 'targetComponent',
// // // //                     attributes: ['id', 'name', 'code', 'type'] 
// // // //                 }
// // // //             ]
// // // //         });

// // // //         if (!formula) {
// // // //             return res.status(404).json({ message: 'Formula not found' });
// // // //         }

// // // //         res.status(200).json(formula);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Create a new formula
// // // // // @route   POST /api/formulas
// // // // // @access  Private
// // // // exports.createFormula = async (req, res) => {
// // // //     const { 
// // // //         name, 
// // // //         description,
// // // //         formulaType,
// // // //         formulaExpression,
// // // //         formulaJson,
// // // //         variables,
// // // //         targetComponentId,
// // // //         isActive,
// // // //         validFrom,
// // // //         validTo,
// // // //         priority,
// // // //         companyId,
// // // //         createdBy
// // // //     } = req.body;

// // // //     if (!name || !formulaExpression || !formulaJson || !companyId) {
// // // //         return res.status(400).json({ 
// // // //             message: 'Missing required fields: name, formulaExpression, formulaJson, or companyId' 
// // // //         });
// // // //     }

// // // //     try {
// // // //         // Validate formula expression
// // // //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// // // //         if (!validationResult.valid) {
// // // //             return res.status(400).json({ 
// // // //                 message: 'Formula validation failed', 
// // // //                 errors: validationResult.errors 
// // // //             });
// // // //         }

// // // //         // Check if target component exists and belongs to the same company
// // // //         if (targetComponentId) {
// // // //             const targetComponent = await SalaryComponent.findOne({
// // // //                 where: { id: targetComponentId, companyId }
// // // //             });

// // // //             if (!targetComponent) {
// // // //                 return res.status(400).json({ 
// // // //                     message: 'Target component not found or does not belong to this company' 
// // // //                 });
// // // //             }
// // // //         }

// // // //         const newFormula = await Formula.create({
// // // //             name,
// // // //             description,
// // // //             formulaType: formulaType || 'Simple',
// // // //             formulaExpression,
// // // //             formulaJson,
// // // //             variables: variables || [],
// // // //             targetComponentId,
// // // //             isActive: isActive !== undefined ? isActive : true,
// // // //             validFrom,
// // // //             validTo,
// // // //             priority: priority || 0,
// // // //             companyId,
// // // //             createdBy
// // // //         });
        
// // // //         res.status(201).json(newFormula);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Update a formula
// // // // // @route   PUT /api/formulas/:id
// // // // // @access  Private
// // // // exports.updateFormula = async (req, res) => {
// // // //     const { id } = req.params;
// // // //     const { 
// // // //         name, 
// // // //         description,
// // // //         formulaType,
// // // //         formulaExpression,
// // // //         formulaJson,
// // // //         variables,
// // // //         targetComponentId,
// // // //         isActive,
// // // //         validFrom,
// // // //         validTo,
// // // //         priority,
// // // //         companyId,
// // // //         updatedBy
// // // //     } = req.body;

// // // //     try {
// // // //         const formula = await Formula.findByPk(id);
        
// // // //         if (!formula) {
// // // //             return res.status(404).json({ message: 'Formula not found' });
// // // //         }

// // // //         // Optional: Add authorization check
// // // //         // if (formula.companyId !== req.user.companyId) {
// // // //         //     return res.status(403).json({ message: 'Forbidden' });
// // // //         // }

// // // //         // Validate formula if expression or JSON changed
// // // //         if (formulaExpression || formulaJson) {
// // // //             const validationResult = validateFormula(
// // // //                 formulaExpression || formula.formulaExpression,
// // // //                 formulaJson || formula.formulaJson,
// // // //                 variables || formula.variables
// // // //             );
            
// // // //             if (!validationResult.valid) {
// // // //                 return res.status(400).json({ 
// // // //                     message: 'Formula validation failed', 
// // // //                     errors: validationResult.errors 
// // // //                 });
// // // //             }
// // // //         }

// // // //         // Check target component if changed
// // // //         if (targetComponentId && targetComponentId !== formula.targetComponentId) {
// // // //             const targetComponent = await SalaryComponent.findOne({
// // // //                 where: { 
// // // //                     id: targetComponentId, 
// // // //                     companyId: formula.companyId 
// // // //                 }
// // // //             });

// // // //             if (!targetComponent) {
// // // //                 return res.status(400).json({ 
// // // //                     message: 'Target component not found or does not belong to this company' 
// // // //                 });
// // // //             }
// // // //         }

// // // //         await formula.update({ 
// // // //             name, 
// // // //             description,
// // // //             formulaType,
// // // //             formulaExpression,
// // // //             formulaJson,
// // // //             variables,
// // // //             targetComponentId,
// // // //             isActive,
// // // //             validFrom,
// // // //             validTo,
// // // //             priority,
// // // //             companyId,
// // // //             updatedBy
// // // //         });
        
// // // //         res.status(200).json(formula);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Delete a formula
// // // // // @route   DELETE /api/formulas/:id
// // // // // @access  Private
// // // // exports.deleteFormula = async (req, res) => {
// // // //     const { id } = req.params;

// // // //     try {
// // // //         const formula = await Formula.findByPk(id);
        
// // // //         if (!formula) {
// // // //             return res.status(404).json({ message: 'Formula not found' });
// // // //         }

// // // //         // Optional: Add authorization check
// // // //         // if (formula.companyId !== req.user.companyId) {
// // // //         //     return res.status(403).json({ message: 'Forbidden' });
// // // //         // }

// // // //         await formula.destroy();
// // // //         res.status(200).json({ message: 'Formula deleted successfully' });
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Validate a formula
// // // // // @route   POST /api/formulas/validate
// // // // // @access  Private
// // // // exports.validateFormulaEndpoint = async (req, res) => {
// // // //     const { formulaExpression, formulaJson, variables, companyId } = req.body;

// // // //     if (!formulaExpression || !formulaJson) {
// // // //         return res.status(400).json({ 
// // // //             message: 'Formula expression and JSON are required' 
// // // //         });
// // // //     }

// // // //     try {
// // // //         // Verify all variables exist as salary components in the company
// // // //         if (variables && variables.length > 0 && companyId) {
// // // //             const components = await SalaryComponent.findAll({
// // // //                 where: { 
// // // //                     companyId,
// // // //                     code: { [Op.in]: variables }
// // // //                 }
// // // //             });

// // // //             const foundCodes = components.map(c => c.code);
// // // //             const missingVariables = variables.filter(v => !foundCodes.includes(v));

// // // //             if (missingVariables.length > 0) {
// // // //                 return res.status(400).json({
// // // //                     valid: false,
// // // //                     errors: [`Components not found: ${missingVariables.join(', ')}`]
// // // //                 });
// // // //             }
// // // //         }

// // // //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// // // //         res.status(200).json(validationResult);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Test formula with sample data
// // // // // @route   POST /api/formulas/test
// // // // // @access  Private
// // // // exports.testFormula = async (req, res) => {
// // // //     const { formulaExpression, sampleData } = req.body;

// // // //     if (!formulaExpression || !sampleData) {
// // // //         return res.status(400).json({ 
// // // //             message: 'Formula expression and sample data are required' 
// // // //         });
// // // //     }

// // // //     try {
// // // //         const result = evaluateFormula(formulaExpression, sampleData);
// // // //         res.status(200).json({ 
// // // //             success: true, 
// // // //             result,
// // // //             formula: formulaExpression,
// // // //             sampleData
// // // //         });
// // // //     } catch (error) {
// // // //         res.status(400).json({ 
// // // //             success: false, 
// // // //             message: 'Formula evaluation failed', 
// // // //             error: error.message 
// // // //         });
// // // //     }
// // // // };

// // // // // @desc    Get available components for formula building
// // // // // @route   GET /api/formulas/components/:companyId
// // // // // @access  Private
// // // // exports.getAvailableComponents = async (req, res) => {
// // // //     const { companyId } = req.params;

// // // //     try {
// // // //         const components = await SalaryComponent.findAll({
// // // //             where: { 
// // // //                 companyId,
// // // //                 status: 'Active'
// // // //             },
// // // //             attributes: ['id', 'name', 'code', 'type', 'calculationType'],
// // // //             order: [['name', 'ASC']]
// // // //         });

// // // //         res.status(200).json(components);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // Helper function to validate formula
// // // // function validateFormula(expression, json, variables) {
// // // //     const errors = [];

// // // //     // Check if expression is not empty
// // // //     if (!expression || expression.trim() === '') {
// // // //         errors.push('Formula expression cannot be empty');
// // // //     }

// // // //     // Check if JSON structure is valid
// // // //     if (!json || typeof json !== 'object') {
// // // //         errors.push('Formula JSON structure is invalid');
// // // //     }

// // // //     // Check for balanced parentheses
// // // //     if (expression) {
// // // //         let balance = 0;
// // // //         for (let char of expression) {
// // // //             if (char === '(') balance++;
// // // //             if (char === ')') balance--;
// // // //             if (balance < 0) {
// // // //                 errors.push('Unbalanced parentheses in formula');
// // // //                 break;
// // // //             }
// // // //         }
// // // //         if (balance !== 0) {
// // // //             errors.push('Unbalanced parentheses in formula');
// // // //         }
// // // //     }

// // // //     // Check for valid operators
// // // //     const validOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
// // // //     const operators = expression.match(/[+\-*/><=!&|()]/g) || [];
    
// // // //     // Check for division by zero pattern
// // // //     if (expression.includes('/0') || expression.includes('/ 0')) {
// // // //         errors.push('Formula contains division by zero');
// // // //     }

// // // //     // Validate that all variables are defined
// // // //     if (variables && variables.length > 0) {
// // // //         for (let variable of variables) {
// // // //             if (!expression.includes(variable)) {
// // // //                 errors.push(`Variable ${variable} is declared but not used in formula`);
// // // //             }
// // // //         }
// // // //     }

// // // //     return {
// // // //         valid: errors.length === 0,
// // // //         errors: errors.length > 0 ? errors : null
// // // //     };
// // // // }

// // // // // Helper function to evaluate formula (for testing)
// // // // function evaluateFormula(expression, data) {
// // // //     try {
// // // //         // Replace variable names with their values
// // // //         let evaluableExpression = expression;
        
// // // //         for (let [key, value] of Object.entries(data)) {
// // // //             const regex = new RegExp(`\\b${key}\\b`, 'g');
// // // //             evaluableExpression = evaluableExpression.replace(regex, value);
// // // //         }

// // // //         // Use Function constructor for safe evaluation (better than eval)
// // // //         // In production, consider using a proper expression parser library
// // // //         const result = new Function(`return ${evaluableExpression}`)();
        
// // // //         return result;
// // // //     } catch (error) {
// // // //         throw new Error(`Formula evaluation failed: ${error.message}`);
// // // //     }
// // // // }


// // // const { Formula, SalaryComponent, Company, Designation, EmploymentType } = require('../models');
// // // const { Op } = require('sequelize');

// // // // // @desc    Get all formulas for a specific company
// // // // // @route   GET /api/formulas?companyId=1&isActive=true
// // // // // @access  Private
// // // // exports.getFormulasByCompany = async (req, res) => {
// // // //     const { companyId, isActive } = req.query;

// // // //     if (!companyId) {
// // // //         return res.status(400).json({ message: 'Company ID is required' });
// // // //     }

// // // //     try {
// // // //         const whereClause = { companyId };
        
// // // //         if (isActive !== undefined) {
// // // //             whereClause.isActive = isActive === 'true';
// // // //         }

// // // //         const formulas = await Formula.findAll({
// // // //             where: whereClause,
// // // //             include: [
// // // //                 { 
// // // //                     model: Company, 
// // // //                     attributes: ['name'] 
// // // //                 },
// // // //                 { 
// // // //                     model: SalaryComponent, 
// // // //                     as: 'targetComponent',
// // // //                     attributes: ['id', 'name', 'code', 'type'] 
// // // //                 }
// // // //             ],
// // // //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// // // //         });
        
// // // //         res.status(200).json(formulas);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // @desc    Get all formulas for a specific company
// // // // @route   GET /api/formulas?companyId=1&isActive=true
// // // // @access  Private
// // // exports.getFormulasByCompany = async (req, res) => {
// // //     console.log('=== getFormulasByCompany called ===');
// // //     console.log('req.query:', req.query);
    
// // //     try {
// // //         const { companyId, isActive } = req.query;

// // //         if (!companyId) {
// // //             console.log('Missing companyId');
// // //             return res.status(400).json({ message: 'Company ID is required' });
// // //         }

// // //         console.log('CompanyId:', companyId);
// // //         const whereClause = { companyId: parseInt(companyId) };
        
// // //         if (isActive !== undefined) {
// // //             whereClause.isActive = isActive === 'true';
// // //         }

// // //         console.log('Where clause:', whereClause);
// // //         console.log('Fetching formulas...');

// // //         const formulas = await Formula.findAll({
// // //             where: whereClause,
// // //             include: [
// // //                 { 
// // //                     model: Company, 
// // //                     attributes: ['name'] 
// // //                 },
// // //                 { 
// // //                     model: SalaryComponent, 
// // //                     as: 'targetComponent',
// // //                     attributes: ['id', 'name', 'code', 'type'] 
// // //                 }
// // //             ],
// // //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// // //         });
        
// // //         console.log('Formulas found:', formulas.length);
// // //         res.status(200).json(formulas);
// // //     } catch (error) {
// // //         console.error('Error in getFormulasByCompany:', error);
// // //         console.error('Error stack:', error.stack);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };



// // // // @desc    Get a single formula by ID
// // // // @route   GET /api/formulas/:id
// // // // @access  Private
// // // exports.getFormulaById = async (req, res) => {
// // //     const { id } = req.params;

// // //     try {
// // //         const formula = await Formula.findByPk(id, {
// // //             include: [
// // //                 { model: Company, attributes: ['name'] },
// // //                 { 
// // //                     model: SalaryComponent, 
// // //                     as: 'targetComponent',
// // //                     attributes: ['id', 'name', 'code', 'type'] 
// // //                 }
// // //             ]
// // //         });

// // //         if (!formula) {
// // //             return res.status(404).json({ message: 'Formula not found' });
// // //         }

// // //         res.status(200).json(formula);
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Create a new formula
// // // // @route   POST /api/formulas
// // // // @access  Private
// // // exports.createFormula = async (req, res) => {
// // //     const { 
// // //         name, 
// // //         description,
// // //         formulaType,
// // //         formulaExpression,
// // //         formulaJson,
// // //         variables,
// // //         targetComponentId,
// // //         applicableDesignations,
// // //         applicableEmployeeTypes,
// // //         isActive,
// // //         validFrom,
// // //         validTo,
// // //         priority,
// // //         companyId,
// // //         createdBy
// // //     } = req.body;

// // //     if (!name || !formulaExpression || !formulaJson || !companyId) {
// // //         return res.status(400).json({ 
// // //             message: 'Missing required fields: name, formulaExpression, formulaJson, or companyId' 
// // //         });
// // //     }

// // //     try {
// // //         // Validate formula expression
// // //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// // //         if (!validationResult.valid) {
// // //             return res.status(400).json({ 
// // //                 message: 'Formula validation failed', 
// // //                 errors: validationResult.errors 
// // //             });
// // //         }

// // //         // Check if target component exists and belongs to the same company
// // //         if (targetComponentId) {
// // //             const targetComponent = await SalaryComponent.findOne({
// // //                 where: { id: targetComponentId, companyId }
// // //             });

// // //             if (!targetComponent) {
// // //                 return res.status(400).json({ 
// // //                     message: 'Target component not found or does not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         // Validate designations if provided
// // //         if (applicableDesignations && applicableDesignations.length > 0) {
// // //             const designations = await Designation.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableDesignations },
// // //                     companyId
// // //                 }
// // //             });

// // //             if (designations.length !== applicableDesignations.length) {
// // //                 return res.status(400).json({ 
// // //                     message: 'One or more designations not found or do not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         // Validate employee types if provided
// // //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
// // //             const employeeTypes = await EmploymentType.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableEmployeeTypes },
// // //                     companyId
// // //                 }
// // //             });

// // //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// // //                 return res.status(400).json({ 
// // //                     message: 'One or more employee types not found or do not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         const newFormula = await Formula.create({
// // //             name,
// // //             description,
// // //             formulaType: formulaType || 'Simple',
// // //             formulaExpression,
// // //             formulaJson,
// // //             variables: variables || [],
// // //             targetComponentId,
// // //             applicableDesignations: applicableDesignations || [],
// // //             applicableEmployeeTypes: applicableEmployeeTypes || [],
// // //             isActive: isActive !== undefined ? isActive : true,
// // //             validFrom,
// // //             validTo,
// // //             priority: priority || 0,
// // //             companyId,
// // //             createdBy
// // //         });
        
// // //         res.status(201).json(newFormula);
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Update a formula
// // // // @route   PUT /api/formulas/:id
// // // // @access  Private
// // // exports.updateFormula = async (req, res) => {
// // //     const { id } = req.params;
// // //     const { 
// // //         name, 
// // //         description,
// // //         formulaType,
// // //         formulaExpression,
// // //         formulaJson,
// // //         variables,
// // //         targetComponentId,
// // //         applicableDesignations,
// // //         applicableEmployeeTypes,
// // //         isActive,
// // //         validFrom,
// // //         validTo,
// // //         priority,
// // //         companyId,
// // //         updatedBy
// // //     } = req.body;

// // //     try {
// // //         const formula = await Formula.findByPk(id);
        
// // //         if (!formula) {
// // //             return res.status(404).json({ message: 'Formula not found' });
// // //         }

// // //         // Optional: Add authorization check
// // //         // if (formula.companyId !== req.user.companyId) {
// // //         //     return res.status(403).json({ message: 'Forbidden' });
// // //         // }

// // //         // Validate formula if expression or JSON changed
// // //         if (formulaExpression || formulaJson) {
// // //             const validationResult = validateFormula(
// // //                 formulaExpression || formula.formulaExpression,
// // //                 formulaJson || formula.formulaJson,
// // //                 variables || formula.variables
// // //             );
            
// // //             if (!validationResult.valid) {
// // //                 return res.status(400).json({ 
// // //                     message: 'Formula validation failed', 
// // //                     errors: validationResult.errors 
// // //                 });
// // //             }
// // //         }

// // //         // Check target component if changed
// // //         if (targetComponentId && targetComponentId !== formula.targetComponentId) {
// // //             const targetComponent = await SalaryComponent.findOne({
// // //                 where: { 
// // //                     id: targetComponentId, 
// // //                     companyId: formula.companyId 
// // //                 }
// // //             });

// // //             if (!targetComponent) {
// // //                 return res.status(400).json({ 
// // //                     message: 'Target component not found or does not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         // Validate designations if changed
// // //         if (applicableDesignations && applicableDesignations.length > 0) {
// // //             const designations = await Designation.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableDesignations },
// // //                     companyId: formula.companyId
// // //                 }
// // //             });

// // //             if (designations.length !== applicableDesignations.length) {
// // //                 return res.status(400).json({ 
// // //                     message: 'One or more designations not found or do not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         // Validate employee types if changed
// // //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
// // //             const employeeTypes = await EmploymentType.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableEmployeeTypes },
// // //                     companyId: formula.companyId
// // //                 }
// // //             });

// // //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// // //                 return res.status(400).json({ 
// // //                     message: 'One or more employee types not found or do not belong to this company' 
// // //                 });
// // //             }
// // //         }

// // //         await formula.update({ 
// // //             name, 
// // //             description,
// // //             formulaType,
// // //             formulaExpression,
// // //             formulaJson,
// // //             variables,
// // //             targetComponentId,
// // //             applicableDesignations,
// // //             applicableEmployeeTypes,
// // //             isActive,
// // //             validFrom,
// // //             validTo,
// // //             priority,
// // //             companyId,
// // //             updatedBy
// // //         });
        
// // //         res.status(200).json(formula);
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Delete a formula
// // // // @route   DELETE /api/formulas/:id
// // // // @access  Private
// // // exports.deleteFormula = async (req, res) => {
// // //     const { id } = req.params;

// // //     try {
// // //         const formula = await Formula.findByPk(id);
        
// // //         if (!formula) {
// // //             return res.status(404).json({ message: 'Formula not found' });
// // //         }

// // //         // Optional: Add authorization check
// // //         // if (formula.companyId !== req.user.companyId) {
// // //         //     return res.status(403).json({ message: 'Forbidden' });
// // //         // }

// // //         await formula.destroy();
// // //         res.status(200).json({ message: 'Formula deleted successfully' });
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Validate a formula
// // // // @route   POST /api/formulas/validate
// // // // @access  Private
// // // exports.validateFormulaEndpoint = async (req, res) => {
// // //     const { formulaExpression, formulaJson, variables, companyId, applicableDesignations, applicableEmployeeTypes } = req.body;

// // //     if (!formulaExpression || !formulaJson) {
// // //         return res.status(400).json({ 
// // //             message: 'Formula expression and JSON are required' 
// // //         });
// // //     }

// // //     try {
// // //         // Verify all variables exist as salary components in the company
// // //         if (variables && variables.length > 0 && companyId) {
// // //             const components = await SalaryComponent.findAll({
// // //                 where: { 
// // //                     companyId,
// // //                     code: { [Op.in]: variables }
// // //                 }
// // //             });

// // //             const foundCodes = components.map(c => c.code);
// // //             const missingVariables = variables.filter(v => !foundCodes.includes(v));

// // //             if (missingVariables.length > 0) {
// // //                 return res.status(400).json({
// // //                     valid: false,
// // //                     errors: [`Components not found: ${missingVariables.join(', ')}`]
// // //                 });
// // //             }
// // //         }

// // //         // Validate designations if provided
// // //         if (applicableDesignations && applicableDesignations.length > 0 && companyId) {
// // //             const designations = await Designation.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableDesignations },
// // //                     companyId
// // //                 }
// // //             });

// // //             if (designations.length !== applicableDesignations.length) {
// // //                 return res.status(400).json({
// // //                     valid: false,
// // //                     errors: ['One or more designations not found or do not belong to this company']
// // //                 });
// // //             }
// // //         }

// // //         // Validate employee types if provided
// // //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0 && companyId) {
// // //             const employeeTypes = await EmploymentType.findAll({
// // //                 where: { 
// // //                     id: { [Op.in]: applicableEmployeeTypes },
// // //                     companyId
// // //                 }
// // //             });

// // //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// // //                 return res.status(400).json({
// // //                     valid: false,
// // //                     errors: ['One or more employee types not found or do not belong to this company']
// // //                 });
// // //             }
// // //         }

// // //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// // //         res.status(200).json(validationResult);
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Test formula with sample data
// // // // @route   POST /api/formulas/test
// // // // @access  Private
// // // exports.testFormula = async (req, res) => {
// // //     const { formulaExpression, sampleData } = req.body;

// // //     if (!formulaExpression || !sampleData) {
// // //         return res.status(400).json({ 
// // //             message: 'Formula expression and sample data are required' 
// // //         });
// // //     }

// // //     try {
// // //         const result = evaluateFormula(formulaExpression, sampleData);
// // //         res.status(200).json({ 
// // //             success: true, 
// // //             result,
// // //             formula: formulaExpression,
// // //             sampleData
// // //         });
// // //     } catch (error) {
// // //         res.status(400).json({ 
// // //             success: false, 
// // //             message: 'Formula evaluation failed', 
// // //             error: error.message 
// // //         });
// // //     }
// // // };

// // // // // @desc    Get available components for formula building
// // // // // @route   GET /api/formulas/components/:companyId
// // // // // @access  Private
// // // // exports.getAvailableComponents = async (req, res) => {
// // // //     const { companyId } = req.params;

// // // //     try {
// // // //         const components = await SalaryComponent.findAll({
// // // //             where: { 
// // // //                 companyId,
// // // //                 status: 'Active'
// // // //             },
// // // //             attributes: ['id', 'name', 'code', 'type', 'calculationType'],
// // // //             order: [['name', 'ASC']]
// // // //         });

// // // //         res.status(200).json(components);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Get available designations for formula building
// // // // // @route   GET /api/formulas/designations/:companyId
// // // // // @access  Private
// // // // exports.getAvailableDesignations = async (req, res) => {
// // // //     const { companyId } = req.params;

// // // //     try {
// // // //         const designations = await Designation.findAll({
// // // //             where: { 
// // // //                 companyId,
// // // //                 status: 'Active'
// // // //             },
// // // //             attributes: ['id', 'name', 'code'],
// // // //             order: [['name', 'ASC']]
// // // //         });

// // // //         res.status(200).json(designations);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // // @desc    Get available employee types for formula building
// // // // // @route   GET /api/formulas/employee-types/:companyId
// // // // // @access  Private
// // // // exports.getAvailableEmployeeTypes = async (req, res) => {
// // // //     const { companyId } = req.params;

// // // //     try {
// // // //         const employeeTypes = await EmploymentType.findAll({
// // // //             where: { 
// // // //                 companyId,
// // // //                 status: 'Active'
// // // //             },
// // // //             attributes: ['id', 'name', 'code'],
// // // //             order: [['name', 'ASC']]
// // // //         });

// // // //         res.status(200).json(employeeTypes);
// // // //     } catch (error) {
// // // //         console.error(error);
// // // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // // //     }
// // // // };

// // // // @desc    Get available designations for formula building
// // // // @route   GET /api/formulas/designations/:companyId
// // // // @access  Private
// // // exports.getAvailableDesignations = async (req, res) => {
// // //     console.log('=== getAvailableDesignations called ===');
// // //     console.log('req.params:', req.params);
    
// // //     try {
// // //         const { companyId } = req.params;

// // //         if (!companyId) {
// // //             console.log('Missing companyId');
// // //             return res.status(400).json({ message: 'Company ID is required' });
// // //         }

// // //         console.log('CompanyId:', companyId);
// // //         console.log('Fetching designations...');

// // //         const designations = await Designation.findAll({
// // //             where: { 
// // //                 companyId: parseInt(companyId)
// // //             },
// // //             attributes: ['id', 'name', 'code'],
// // //             order: [['name', 'ASC']]
// // //         });

// // //         console.log('Designations found:', designations.length);
// // //         res.status(200).json(designations);
// // //     } catch (error) {
// // //         console.error('Error in getAvailableDesignations:', error);
// // //         console.error('Error stack:', error.stack);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };


// // // // @desc    Get available employee types for formula building
// // // // @route   GET /api/formulas/employee-types/:companyId
// // // // @access  Private
// // // exports.getAvailableEmployeeTypes = async (req, res) => {
// // //     console.log('=== getAvailableEmployeeTypes called ===');
// // //     console.log('req.params:', req.params);
    
// // //     try {
// // //         const { companyId } = req.params;

// // //         if (!companyId) {
// // //             console.log('Missing companyId');
// // //             return res.status(400).json({ message: 'Company ID is required' });
// // //         }

// // //         console.log('CompanyId:', companyId);
// // //         console.log('Fetching employee types...');

// // //         const employeeTypes = await EmploymentType.findAll({
// // //             where: { 
// // //                 companyId: parseInt(companyId)
// // //             },
// // //             attributes: ['id', 'name', 'code'],
// // //             order: [['name', 'ASC']]
// // //         });

// // //         console.log('Employee types found:', employeeTypes.length);
// // //         res.status(200).json(employeeTypes);
// // //     } catch (error) {
// // //         console.error('Error in getAvailableEmployeeTypes:', error);
// // //         console.error('Error stack:', error.stack);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // @desc    Get available components for formula building
// // // // @route   GET /api/formulas/components/:companyId
// // // // @access  Private
// // // exports.getAvailableComponents = async (req, res) => {
// // //     console.log('=== getAvailableComponents called ===');
// // //     console.log('req.params:', req.params);
    
// // //     try {
// // //         const { companyId } = req.params;

// // //         if (!companyId) {
// // //             console.log('Missing companyId');
// // //             return res.status(400).json({ message: 'Company ID is required' });
// // //         }

// // //         console.log('CompanyId:', companyId);
// // //         console.log('Fetching components...');

// // //         const components = await SalaryComponent.findAll({
// // //             where: { 
// // //                 companyId: parseInt(companyId)
// // //             },
// // //             attributes: ['id', 'name', 'code', 'type', 'calculationType'],
// // //             order: [['name', 'ASC']]
// // //         });

// // //         console.log('Components found:', components.length);
// // //         res.status(200).json(components);
// // //     } catch (error) {
// // //         console.error('Error in getAvailableComponents:', error);
// // //         console.error('Error stack:', error.stack);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }


// // // // @desc    Get formulas for specific employee
// // // // @route   GET /api/formulas/employee/:employeeId
// // // // @access  Private
// // // exports.getFormulasForEmployee = async (req, res) => {
// // //     const { employeeId } = req.params;

// // //     try {
// // //         // First get the employee details to find their designation and employee type
// // //         const { Employee } = require('../models');
// // //         const employee = await Employee.findByPk(employeeId, {
// // //             attributes: ['id', 'designationId', 'employmentTypeId', 'companyId']
// // //         });

// // //         if (!employee) {
// // //             return res.status(404).json({ message: 'Employee not found' });
// // //         }

// // //         // Find formulas that apply to this employee
// // //         const formulas = await Formula.findAll({
// // //             where: { 
// // //                 companyId: employee.companyId,
// // //                 isActive: true,
// // //                 [Op.or]: [
// // //                     { applicableDesignations: { [Op.contains]: [employee.designationId] } },
// // //                     { applicableDesignations: { [Op.eq]: [] } },
// // //                     { applicableDesignations: { [Op.is]: null } }
// // //                 ],
// // //                 [Op.or]: [
// // //                     { applicableEmployeeTypes: { [Op.contains]: [employee.employmentTypeId] } },
// // //                     { applicableEmployeeTypes: { [Op.eq]: [] } },
// // //                     { applicableEmployeeTypes: { [Op.is]: null } }
// // //                 ]
// // //             },
// // //             include: [
// // //                 { 
// // //                     model: Company, 
// // //                     attributes: ['name'] 
// // //                 },
// // //                 { 
// // //                     model: SalaryComponent, 
// // //                     as: 'targetComponent',
// // //                     attributes: ['id', 'name', 'code', 'type'] 
// // //                 }
// // //             ],
// // //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// // //         });

// // //         res.status(200).json(formulas);
// // //     } catch (error) {
// // //         console.error(error);
// // //         res.status(500).json({ message: 'Server Error', error: error.message });
// // //     }
// // // };

// // // // Helper function to validate formula
// // // function validateFormula(expression, json, variables) {
// // //     const errors = [];

// // //     // Check if expression is not empty
// // //     if (!expression || expression.trim() === '') {
// // //         errors.push('Formula expression cannot be empty');
// // //     }

// // //     // Check if JSON structure is valid
// // //     if (!json || typeof json !== 'object') {
// // //         errors.push('Formula JSON structure is invalid');
// // //     }

// // //     // Check for balanced parentheses
// // //     if (expression) {
// // //         let balance = 0;
// // //         for (let char of expression) {
// // //             if (char === '(') balance++;
// // //             if (char === ')') balance--;
// // //             if (balance < 0) {
// // //                 errors.push('Unbalanced parentheses in formula');
// // //                 break;
// // //             }
// // //         }
// // //         if (balance !== 0) {
// // //             errors.push('Unbalanced parentheses in formula');
// // //         }
// // //     }

// // //     // Check for valid operators
// // //     const validOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
// // //     const operators = expression.match(/[+\-*/><=!&|()]/g) || [];
    
// // //     // Check for division by zero pattern
// // //     if (expression.includes('/0') || expression.includes('/ 0')) {
// // //         errors.push('Formula contains division by zero');
// // //     }

// // //     // Validate that all variables are defined
// // //     if (variables && variables.length > 0) {
// // //         for (let variable of variables) {
// // //             if (!expression.includes(variable)) {
// // //                 errors.push(`Variable ${variable} is declared but not used in formula`);
// // //             }
// // //         }
// // //     }

// // //     return {
// // //         valid: errors.length === 0,
// // //         errors: errors.length > 0 ? errors : null
// // //     };
// // // }

// // // // Helper function to evaluate formula (for testing)
// // // function evaluateFormula(expression, data) {
// // //     try {
// // //         // Replace variable names with their values
// // //         let evaluableExpression = expression;
        
// // //         for (let [key, value] of Object.entries(data)) {
// // //             const regex = new RegExp(`\\b${key}\\b`, 'g');
// // //             evaluableExpression = evaluableExpression.replace(regex, value);
// // //         }

// // //         // Use Function constructor for safe evaluation (better than eval)
// // //         // In production, consider using a proper expression parser library
// // //         const result = new Function(`return ${evaluableExpression}`)();
        
// // //         return result;
// // //     } catch (error) {
// // //         throw new Error(`Formula evaluation failed: ${error.message}`);
// // //     }
// // // }

// // const { Formula, SalaryComponent, Company, Designation, EmploymentType } = require('../models');
// // const { Op } = require('sequelize');

// // console.log('Models imported:');
// // console.log('Formula:', typeof Formula);
// // console.log('SalaryComponent:', typeof SalaryComponent);
// // console.log('Company:', typeof Company);
// // console.log('Designation:', typeof Designation);
// // console.log('EmploymentType:', typeof EmploymentType);

// // // @desc    Get all formulas for a specific company
// // // @route   GET /api/formulas?companyId=1&isActive=true
// // // @access  Private
// // exports.getFormulasByCompany = async (req, res) => {
// //     console.log('=== getFormulasByCompany called ===');
// //     console.log('req.query:', req.query);
    
// //     try {
// //         const { companyId, isActive } = req.query;

// //         if (!companyId) {
// //             console.log('Missing companyId');
// //             return res.status(400).json({ message: 'Company ID is required' });
// //         }

// //         console.log('CompanyId:', companyId);
// //         const whereClause = { companyId: parseInt(companyId) };
        
// //         if (isActive !== undefined) {
// //             whereClause.isActive = isActive === 'true';
// //         }

// //         console.log('Where clause:', whereClause);
// //         console.log('Fetching formulas...');

// //         const formulas = await Formula.findAll({
// //             where: whereClause,
// //             include: [
// //                 { 
// //                     model: Company, 
// //                     attributes: ['name'] 
// //                 },
// //                 { 
// //                     model: SalaryComponent, 
// //                     as: 'targetComponent',
// //                     attributes: ['id', 'name', 'code', 'type'] 
// //                 }
// //             ],
// //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// //         });
        
// //         console.log('Formulas found:', formulas.length);
// //         res.status(200).json(formulas);
// //     } catch (error) {
// //         console.error('Error in getFormulasByCompany:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Get available designations for formula building
// // // @route   GET /api/formulas/designations/:companyId
// // // @access  Private
// // exports.getAvailableDesignations = async (req, res) => {
// //     console.log('=== getAvailableDesignations called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { companyId } = req.params;

// //         if (!companyId) {
// //             console.log('Missing companyId');
// //             return res.status(400).json({ message: 'Company ID is required' });
// //         }

// //         console.log('CompanyId:', companyId);
// //         console.log('Fetching designations...');

// //         const designations = await Designation.findAll({
// //             where: { 
// //                 companyId: parseInt(companyId)
// //             },
// //             attributes: ['id', 'name', 'code'],
// //             order: [['name', 'ASC']]
// //         });

// //         console.log('Designations found:', designations.length);
// //         res.status(200).json(designations);
// //     } catch (error) {
// //         console.error('Error in getAvailableDesignations:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Get available employee types for formula building
// // // @route   GET /api/formulas/employee-types/:companyId
// // // @access  Private
// // exports.getAvailableEmployeeTypes = async (req, res) => {
// //     console.log('=== getAvailableEmployeeTypes called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { companyId } = req.params;

// //         if (!companyId) {
// //             console.log('Missing companyId');
// //             return res.status(400).json({ message: 'Company ID is required' });
// //         }

// //         console.log('CompanyId:', companyId);
// //         console.log('Fetching employee types...');

// //         const employeeTypes = await EmploymentType.findAll({
// //             where: { 
// //                 companyId: parseInt(companyId)
// //             },
// //             attributes: ['id', 'name', 'code'],
// //             order: [['name', 'ASC']]
// //         });

// //         console.log('Employee types found:', employeeTypes.length);
// //         res.status(200).json(employeeTypes);
// //     } catch (error) {
// //         console.error('Error in getAvailableEmployeeTypes:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Get available components for formula building
// // // @route   GET /api/formulas/components/:companyId
// // // @access  Private
// // exports.getAvailableComponents = async (req, res) => {
// //     console.log('=== getAvailableComponents called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { companyId } = req.params;

// //         if (!companyId) {
// //             console.log('Missing companyId');
// //             return res.status(400).json({ message: 'Company ID is required' });
// //         }

// //         console.log('CompanyId:', companyId);
// //         console.log('Fetching components...');

// //         const components = await SalaryComponent.findAll({
// //             where: { 
// //                 companyId: parseInt(companyId)
// //             },
// //             attributes: ['id', 'name', 'code', 'type', 'calculationType'],
// //             order: [['name', 'ASC']]
// //         });

// //         console.log('Components found:', components.length);
// //         res.status(200).json(components);
// //     } catch (error) {
// //         console.error('Error in getAvailableComponents:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Get formulas for specific employee
// // // @route   GET /api/formulas/employee/:employeeId
// // // @access  Private
// // exports.getFormulasForEmployee = async (req, res) => {
// //     console.log('=== getFormulasForEmployee called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { employeeId } = req.params;

// //         if (!employeeId) {
// //             console.log('Missing employeeId');
// //             return res.status(400).json({ message: 'Employee ID is required' });
// //         }

// //         console.log('EmployeeId:', employeeId);
// //         console.log('Fetching employee details...');

// //         // First get the employee details to find their designation and employee type
// //         const { Employee } = require('../models');
// //         const employee = await Employee.findByPk(employeeId, {
// //             attributes: ['id', 'designationId', 'employmentTypeId', 'companyId']
// //         });

// //         if (!employee) {
// //             console.log('Employee not found');
// //             return res.status(404).json({ message: 'Employee not found' });
// //         }

// //         console.log('Employee found:', employee.dataValues);

// //         // Find formulas that apply to this employee
// //         const formulas = await Formula.findAll({
// //             where: { 
// //                 companyId: employee.companyId,
// //                 isActive: true,
// //                 [Op.or]: [
// //                     { applicableDesignations: { [Op.contains]: [employee.designationId] } },
// //                     { applicableDesignations: { [Op.eq]: [] } },
// //                     { applicableDesignations: { [Op.is]: null } }
// //                 ],
// //                 [Op.or]: [
// //                     { applicableEmployeeTypes: { [Op.contains]: [employee.employmentTypeId] } },
// //                     { applicableEmployeeTypes: { [Op.eq]: [] } },
// //                     { applicableEmployeeTypes: { [Op.is]: null } }
// //                 ]
// //             },
// //             include: [
// //                 { 
// //                     model: Company, 
// //                     attributes: ['name'] 
// //                 },
// //                 { 
// //                     model: SalaryComponent, 
// //                     as: 'targetComponent',
// //                     attributes: ['id', 'name', 'code', 'type'] 
// //                 }
// //             ],
// //             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
// //         });

// //         console.log('Formulas found for employee:', formulas.length);
// //         res.status(200).json(formulas);
// //     } catch (error) {
// //         console.error('Error in getFormulasForEmployee:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Validate a formula
// // // @route   POST /api/formulas/validate
// // // @access  Private
// // exports.validateFormulaEndpoint = async (req, res) => {
// //     console.log('=== validateFormulaEndpoint called ===');
// //     console.log('req.body:', req.body);
    
// //     try {
// //         const { formulaExpression, formulaJson, variables, companyId, applicableDesignations, applicableEmployeeTypes } = req.body;

// //         if (!formulaExpression || !formulaJson) {
// //             return res.status(400).json({ 
// //                 message: 'Formula expression and JSON are required' 
// //             });
// //         }

// //         // Verify all variables exist as salary components in the company
// //         if (variables && variables.length > 0 && companyId) {
// //             const components = await SalaryComponent.findAll({
// //                 where: { 
// //                     companyId,
// //                     code: { [Op.in]: variables }
// //                 }
// //             });

// //             const foundCodes = components.map(c => c.code);
// //             const missingVariables = variables.filter(v => !foundCodes.includes(v));

// //             if (missingVariables.length > 0) {
// //                 return res.status(400).json({
// //                     valid: false,
// //                     errors: [`Components not found: ${missingVariables.join(', ')}`]
// //                 });
// //             }
// //         }

// //         // Validate designations if provided
// //         if (applicableDesignations && applicableDesignations.length > 0 && companyId) {
// //             const designations = await Designation.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableDesignations },
// //                     companyId
// //                 }
// //             });

// //             if (designations.length !== applicableDesignations.length) {
// //                 return res.status(400).json({
// //                     valid: false,
// //                     errors: ['One or more designations not found or do not belong to this company']
// //                 });
// //             }
// //         }

// //         // Validate employee types if provided
// //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0 && companyId) {
// //             const employeeTypes = await EmploymentType.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableEmployeeTypes },
// //                     companyId
// //                 }
// //             });

// //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// //                 return res.status(400).json({
// //                     valid: false,
// //                     errors: ['One or more employee types not found or do not belong to this company']
// //                 });
// //             }
// //         }

// //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// //         console.log('Validation result:', validationResult);
// //         res.status(200).json(validationResult);
// //     } catch (error) {
// //         console.error('Error in validateFormulaEndpoint:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Test formula with sample data
// // // @route   POST /api/formulas/test
// // // @access  Private
// // exports.testFormula = async (req, res) => {
// //     console.log('=== testFormula called ===');
// //     console.log('req.body:', req.body);
    
// //     try {
// //         const { formulaExpression, sampleData } = req.body;

// //         if (!formulaExpression || !sampleData) {
// //             return res.status(400).json({ 
// //                 message: 'Formula expression and sample data are required' 
// //             });
// //         }

// //         const result = evaluateFormula(formulaExpression, sampleData);
// //         console.log('Formula test result:', result);
// //         res.status(200).json({ 
// //             success: true, 
// //             result,
// //             formula: formulaExpression,
// //             sampleData
// //         });
// //     } catch (error) {
// //         console.error('Error in testFormula:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(400).json({ 
// //             success: false, 
// //             message: 'Formula evaluation failed', 
// //             error: error.message 
// //         });
// //     }
// // };

// // // @desc    Create a new formula
// // // @route   POST /api/formulas
// // // @access  Private
// // exports.createFormula = async (req, res) => {
// //     console.log('=== createFormula called ===');
// //     console.log('req.body:', req.body);
    
// //     try {
// //         const { 
// //             name, 
// //             description,
// //             formulaType,
// //             formulaExpression,
// //             formulaJson,
// //             variables,
// //             targetComponentId,
// //             applicableDesignations,
// //             applicableEmployeeTypes,
// //             isActive,
// //             validFrom,
// //             validTo,
// //             priority,
// //             companyId,
// //             createdBy
// //         } = req.body;

// //         if (!name || !formulaExpression || !formulaJson || !companyId) {
// //             return res.status(400).json({ 
// //                 message: 'Missing required fields: name, formulaExpression, formulaJson, or companyId' 
// //             });
// //         }

// //         // Validate formula expression
// //         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
// //         if (!validationResult.valid) {
// //             return res.status(400).json({ 
// //                 message: 'Formula validation failed', 
// //                 errors: validationResult.errors 
// //             });
// //         }

// //         // Check if target component exists and belongs to the same company
// //         if (targetComponentId) {
// //             const targetComponent = await SalaryComponent.findOne({
// //                 where: { id: targetComponentId, companyId }
// //             });

// //             if (!targetComponent) {
// //                 return res.status(400).json({ 
// //                     message: 'Target component not found or does not belong to this company' 
// //                 });
// //             }
// //         }

// //         // Validate designations if provided
// //         if (applicableDesignations && applicableDesignations.length > 0) {
// //             const designations = await Designation.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableDesignations },
// //                     companyId
// //                 }
// //             });

// //             if (designations.length !== applicableDesignations.length) {
// //                 return res.status(400).json({ 
// //                     message: 'One or more designations not found or do not belong to this company' 
// //                 });
// //             }
// //         }

// //         // Validate employee types if provided
// //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
// //             const employeeTypes = await EmploymentType.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableEmployeeTypes },
// //                     companyId
// //                 }
// //             });

// //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// //                 return res.status(400).json({ 
// //                     message: 'One or more employee types not found or do not belong to this company' 
// //                 });
// //             }
// //         }

// //         const newFormula = await Formula.create({
// //             name,
// //             description,
// //             formulaType: formulaType || 'Simple',
// //             formulaExpression,
// //             formulaJson,
// //             variables: variables || [],
// //             targetComponentId,
// //             applicableDesignations: applicableDesignations || [],
// //             applicableEmployeeTypes: applicableEmployeeTypes || [],
// //             isActive: isActive !== undefined ? isActive : true,
// //             validFrom,
// //             validTo,
// //             priority: priority || 0,
// //             companyId,
// //             createdBy
// //         });
        
// //         console.log('Formula created:', newFormula.dataValues);
// //         res.status(201).json(newFormula);
// //     } catch (error) {
// //         console.error('Error in createFormula:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Get a single formula by ID
// // // @route   GET /api/formulas/:id
// // // @access  Private
// // exports.getFormulaById = async (req, res) => {
// //     console.log('=== getFormulaById called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { id } = req.params;

// //         const formula = await Formula.findByPk(id, {
// //             include: [
// //                 { model: Company, attributes: ['name'] },
// //                 { 
// //                     model: SalaryComponent, 
// //                     as: 'targetComponent',
// //                     attributes: ['id', 'name', 'code', 'type'] 
// //                 }
// //             ]
// //         });

// //         if (!formula) {
// //             return res.status(404).json({ message: 'Formula not found' });
// //         }

// //         console.log('Formula found:', formula.dataValues);
// //         res.status(200).json(formula);
// //     } catch (error) {
// //         console.error('Error in getFormulaById:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Update a formula
// // // @route   PUT /api/formulas/:id
// // // @access  Private
// // exports.updateFormula = async (req, res) => {
// //     console.log('=== updateFormula called ===');
// //     console.log('req.params:', req.params);
// //     console.log('req.body:', req.body);
    
// //     try {
// //         const { id } = req.params;
// //         const { 
// //             name, 
// //             description,
// //             formulaType,
// //             formulaExpression,
// //             formulaJson,
// //             variables,
// //             targetComponentId,
// //             applicableDesignations,
// //             applicableEmployeeTypes,
// //             isActive,
// //             validFrom,
// //             validTo,
// //             priority,
// //             companyId,
// //             updatedBy
// //         } = req.body;

// //         const formula = await Formula.findByPk(id);
        
// //         if (!formula) {
// //             return res.status(404).json({ message: 'Formula not found' });
// //         }

// //         // Validate formula if expression or JSON changed
// //         if (formulaExpression || formulaJson) {
// //             const validationResult = validateFormula(
// //                 formulaExpression || formula.formulaExpression,
// //                 formulaJson || formula.formulaJson,
// //                 variables || formula.variables
// //             );
            
// //             if (!validationResult.valid) {
// //                 return res.status(400).json({ 
// //                     message: 'Formula validation failed', 
// //                     errors: validationResult.errors 
// //                 });
// //             }
// //         }

// //         // Check target component if changed
// //         if (targetComponentId && targetComponentId !== formula.targetComponentId) {
// //             const targetComponent = await SalaryComponent.findOne({
// //                 where: { 
// //                     id: targetComponentId, 
// //                     companyId: formula.companyId 
// //                 }
// //             });

// //             if (!targetComponent) {
// //                 return res.status(400).json({ 
// //                     message: 'Target component not found or does not belong to this company' 
// //                 });
// //             }
// //         }

// //         // Validate designations if changed
// //         if (applicableDesignations && applicableDesignations.length > 0) {
// //             const designations = await Designation.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableDesignations },
// //                     companyId: formula.companyId
// //                 }
// //             });

// //             if (designations.length !== applicableDesignations.length) {
// //                 return res.status(400).json({ 
// //                     message: 'One or more designations not found or do not belong to this company' 
// //                 });
// //             }
// //         }

// //         // Validate employee types if changed
// //         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
// //             const employeeTypes = await EmploymentType.findAll({
// //                 where: { 
// //                     id: { [Op.in]: applicableEmployeeTypes },
// //                     companyId: formula.companyId
// //                 }
// //             });

// //             if (employeeTypes.length !== applicableEmployeeTypes.length) {
// //                 return res.status(400).json({ 
// //                     message: 'One or more employee types not found or do not belong to this company' 
// //                 });
// //             }
// //         }

// //         await formula.update({ 
// //             name, 
// //             description,
// //             formulaType,
// //             formulaExpression,
// //             formulaJson,
// //             variables,
// //             targetComponentId,
// //             applicableDesignations,
// //             applicableEmployeeTypes,
// //             isActive,
// //             validFrom,
// //             validTo,
// //             priority,
// //             companyId,
// //             updatedBy
// //         });
        
// //         console.log('Formula updated:', formula.dataValues);
// //         res.status(200).json(formula);
// //     } catch (error) {
// //         console.error('Error in updateFormula:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // @desc    Delete a formula
// // // @route   DELETE /api/formulas/:id
// // // @access  Private
// // exports.deleteFormula = async (req, res) => {
// //     console.log('=== deleteFormula called ===');
// //     console.log('req.params:', req.params);
    
// //     try {
// //         const { id } = req.params;

// //         const formula = await Formula.findByPk(id);
        
// //         if (!formula) {
// //             return res.status(404).json({ message: 'Formula not found' });
// //         }

// //         await formula.destroy();
// //         console.log('Formula deleted:', id);
// //         res.status(200).json({ message: 'Formula deleted successfully' });
// //     } catch (error) {
// //         console.error('Error in deleteFormula:', error);
// //         console.error('Error stack:', error.stack);
// //         res.status(500).json({ message: 'Server Error', error: error.message });
// //     }
// // };

// // // Helper function to validate formula
// // function validateFormula(expression, json, variables) {
// //     const errors = [];

// //     // Check if expression is not empty
// //     if (!expression || expression.trim() === '') {
// //         errors.push('Formula expression cannot be empty');
// //     }

// //     // Check if JSON structure is valid
// //     if (!json || typeof json !== 'object') {
// //         errors.push('Formula JSON structure is invalid');
// //     }

// //     // Check for balanced parentheses
// //     if (expression) {
// //         let balance = 0;
// //         for (let char of expression) {
// //             if (char === '(') balance++;
// //             if (char === ')') balance--;
// //             if (balance < 0) {
// //                 errors.push('Unbalanced parentheses in formula');
// //                 break;
// //             }
// //         }
// //         if (balance !== 0) {
// //             errors.push('Unbalanced parentheses in formula');
// //         }
// //     }

// //     // Check for valid operators
// //     const validOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
// //     const operators = expression.match(/[+\-*/><=!&|()]/g) || [];
    
// //     // Check for division by zero pattern
// //     if (expression.includes('/0') || expression.includes('/ 0')) {
// //         errors.push('Formula contains division by zero');
// //     }

// //     // Validate that all variables are defined
// //     if (variables && variables.length > 0) {
// //         for (let variable of variables) {
// //             if (!expression.includes(variable)) {
// //                 errors.push(`Variable ${variable} is declared but not used in formula`);
// //             }
// //         }
// //     }

// //     return {
// //         valid: errors.length === 0,
// //         errors: errors.length > 0 ? errors : null
// //     };
// // }

// // // Helper function to evaluate formula (for testing)
// // function evaluateFormula(expression, data) {
// //     try {
// //         // Replace variable names with their values
// //         let evaluableExpression = expression;
        
// //         for (let [key, value] of Object.entries(data)) {
// //             const regex = new RegExp(`\\b${key}\\b`, 'g');
// //             evaluableExpression = evaluableExpression.replace(regex, value);
// //         }

// //         // Use Function constructor for safe evaluation (better than eval)
// //         // In production, consider using a proper expression parser library
// //         const result = new Function(`return ${evaluableExpression}`)();
        
// //         return result;
// //     } catch (error) {
// //         throw new Error(`Formula evaluation failed: ${error.message}`);
// //     }
// // }

// const { Formula, SalaryComponent, Company, Designation, EmploymentType } = require('../models');
// const { Op } = require('sequelize');

// console.log('Models imported:');
// console.log('Formula:', typeof Formula);
// console.log('SalaryComponent:', typeof SalaryComponent);
// console.log('Company:', typeof Company);
// console.log('Designation:', typeof Designation);
// console.log('EmploymentType:', typeof EmploymentType);

// // @desc    Get all formulas for a specific company
// // @route   GET /api/formulas?companyId=1&isActive=true
// // @access  Private
// exports.getFormulasByCompany = async (req, res) => {
//     console.log('=== getFormulasByCompany called ===');
//     console.log('req.query:', req.query);
    
//     try {
//         const { companyId, isActive } = req.query;

//         if (!companyId) {
//             console.log('Missing companyId');
//             return res.status(400).json({ message: 'Company ID is required' });
//         }

//         console.log('CompanyId:', companyId);
//         const whereClause = { companyId: parseInt(companyId) };
        
//         if (isActive !== undefined) {
//             whereClause.isActive = isActive === 'true';
//         }

//         console.log('Where clause:', whereClause);
//         console.log('Fetching formulas...');

//         const formulas = await Formula.findAll({
//             where: whereClause,
//             include: [
//                 { 
//                     model: Company, 
//                     attributes: ['id', 'name'] 
//                 },
//                 { 
//                     model: SalaryComponent, 
//                     as: 'targetComponent',
//                     attributes: ['id', 'name'] // Removed 'code' and 'type' fields
//                 }
//             ],
//             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
//         });
        
//         console.log('Formulas found:', formulas.length);
//         res.status(200).json(formulas);
//     } catch (error) {
//         console.error('Error in getFormulasByCompany:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Get available designations for formula building
// // @route   GET /api/formulas/designations/:companyId
// // @access  Private
// exports.getAvailableDesignations = async (req, res) => {
//     console.log('=== getAvailableDesignations called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { companyId } = req.params;

//         if (!companyId) {
//             console.log('Missing companyId');
//             return res.status(400).json({ message: 'Company ID is required' });
//         }

//         console.log('CompanyId:', companyId);
//         console.log('Fetching designations...');

//         const designations = await Designation.findAll({
//             where: { 
//                 companyId: parseInt(companyId)
//             },
//             attributes: ['id', 'name'], // Removed 'code' field
//             order: [['name', 'ASC']]
//         });

//         console.log('Designations found:', designations.length);
//         res.status(200).json(designations);
//     } catch (error) {
//         console.error('Error in getAvailableDesignations:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Get available employee types for formula building
// // @route   GET /api/formulas/employee-types/:companyId
// // @access  Private
// exports.getAvailableEmployeeTypes = async (req, res) => {
//     console.log('=== getAvailableEmployeeTypes called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { companyId } = req.params;

//         if (!companyId) {
//             console.log('Missing companyId');
//             return res.status(400).json({ message: 'Company ID is required' });
//         }

//         console.log('CompanyId:', companyId);
//         console.log('Fetching employee types...');

//         const employeeTypes = await EmploymentType.findAll({
//             where: { 
//                 companyId: parseInt(companyId)
//             },
//             attributes: ['id', 'name'], // Removed 'code' field
//             order: [['name', 'ASC']]
//         });

//         console.log('Employee types found:', employeeTypes.length);
//         res.status(200).json(employeeTypes);
//     } catch (error) {
//         console.error('Error in getAvailableEmployeeTypes:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Get available components for formula building
// // @route   GET /api/formulas/components/:companyId
// // @access  Private
// exports.getAvailableComponents = async (req, res) => {
//     console.log('=== getAvailableComponents called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { companyId } = req.params;

//         if (!companyId) {
//             console.log('Missing companyId');
//             return res.status(400).json({ message: 'Company ID is required' });
//         }

//         console.log('CompanyId:', companyId);
//         console.log('Fetching components...');

//         const components = await SalaryComponent.findAll({
//             where: { 
//                 companyId: parseInt(companyId)
//             },
//             attributes: ['id', 'name'], // Removed 'code', 'type', and 'calculationType' fields
//             order: [['name', 'ASC']]
//         });

//         console.log('Components found:', components.length);
//         res.status(200).json(components);
//     } catch (error) {
//         console.error('Error in getAvailableComponents:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Get formulas for specific employee
// // @route   GET /api/formulas/employee/:employeeId
// // @access  Private
// exports.getFormulasForEmployee = async (req, res) => {
//     console.log('=== getFormulasForEmployee called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { employeeId } = req.params;

//         if (!employeeId) {
//             console.log('Missing employeeId');
//             return res.status(400).json({ message: 'Employee ID is required' });
//         }

//         console.log('EmployeeId:', employeeId);
//         console.log('Fetching employee details...');

//         // First get the employee details to find their designation and employee type
//         const { Employee } = require('../models');
//         const employee = await Employee.findByPk(employeeId, {
//             attributes: ['id', 'designationId', 'employmentTypeId', 'companyId']
//         });

//         if (!employee) {
//             console.log('Employee not found');
//             return res.status(404).json({ message: 'Employee not found' });
//         }

//         console.log('Employee found:', employee.dataValues);

//         // Find formulas that apply to this employee
//         const formulas = await Formula.findAll({
//             where: { 
//                 companyId: employee.companyId,
//                 isActive: true,
//                 [Op.or]: [
//                     { applicableDesignations: { [Op.contains]: [employee.designationId] } },
//                     { applicableDesignations: { [Op.eq]: [] } },
//                     { applicableDesignations: { [Op.is]: null } }
//                 ],
//                 [Op.or]: [
//                     { applicableEmployeeTypes: { [Op.contains]: [employee.employmentTypeId] } },
//                     { applicableEmployeeTypes: { [Op.eq]: [] } },
//                     { applicableEmployeeTypes: { [Op.is]: null } }
//                 ]
//             },
//             include: [
//                 { 
//                     model: Company, 
//                     attributes: ['id', 'name'] 
//                 },
//                 { 
//                     model: SalaryComponent, 
//                     as: 'targetComponent',
//                     attributes: ['id', 'name'] // Removed 'code' and 'type' fields
//                 }
//             ],
//             order: [['priority', 'ASC'], ['createdAt', 'DESC']]
//         });

//         console.log('Formulas found for employee:', formulas.length);
//         res.status(200).json(formulas);
//     } catch (error) {
//         console.error('Error in getFormulasForEmployee:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Validate a formula
// // @route   POST /api/formulas/validate
// // @access  Private
// exports.validateFormulaEndpoint = async (req, res) => {
//     console.log('=== validateFormulaEndpoint called ===');
//     console.log('req.body:', req.body);
    
//     try {
//         const { formulaExpression, formulaJson, variables, companyId, applicableDesignations, applicableEmployeeTypes } = req.body;

//         if (!formulaExpression || !formulaJson) {
//             return res.status(400).json({ 
//                 message: 'Formula expression and JSON are required' 
//             });
//         }

//         // Verify all variables exist as salary components in the company
//         if (variables && variables.length > 0 && companyId) {
//             const components = await SalaryComponent.findAll({
//                 where: { 
//                     companyId,
//                     name: { [Op.in]: variables } // Changed from 'code' to 'name'
//                 }
//             });

//             const foundNames = components.map(c => c.name);
//             const missingVariables = variables.filter(v => !foundNames.includes(v));

//             if (missingVariables.length > 0) {
//                 return res.status(400).json({
//                     valid: false,
//                     errors: [`Components not found: ${missingVariables.join(', ')}`]
//                 });
//             }
//         }

//         // Validate designations if provided
//         if (applicableDesignations && applicableDesignations.length > 0 && companyId) {
//             const designations = await Designation.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableDesignations },
//                     companyId
//                 }
//             });

//             if (designations.length !== applicableDesignations.length) {
//                 return res.status(400).json({
//                     valid: false,
//                     errors: ['One or more designations not found or do not belong to this company']
//                 });
//             }
//         }

//         // Validate employee types if provided
//         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0 && companyId) {
//             const employeeTypes = await EmploymentType.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableEmployeeTypes },
//                     companyId
//                 }
//             });

//             if (employeeTypes.length !== applicableEmployeeTypes.length) {
//                 return res.status(400).json({
//                     valid: false,
//                     errors: ['One or more employee types not found or do not belong to this company']
//                 });
//             }
//         }

//         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
//         console.log('Validation result:', validationResult);
//         res.status(200).json(validationResult);
//     } catch (error) {
//         console.error('Error in validateFormulaEndpoint:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Test formula with sample data
// // @route   POST /api/formulas/test
// // @access  Private
// exports.testFormula = async (req, res) => {
//     console.log('=== testFormula called ===');
//     console.log('req.body:', req.body);
    
//     try {
//         const { formulaExpression, sampleData } = req.body;

//         if (!formulaExpression || !sampleData) {
//             return res.status(400).json({ 
//                 message: 'Formula expression and sample data are required' 
//             });
//         }

//         const result = evaluateFormula(formulaExpression, sampleData);
//         console.log('Formula test result:', result);
//         res.status(200).json({ 
//             success: true, 
//             result,
//             formula: formulaExpression,
//             sampleData
//         });
//     } catch (error) {
//         console.error('Error in testFormula:', error);
//         console.error('Error stack:', error.stack);
//         res.status(400).json({ 
//             success: false, 
//             message: 'Formula evaluation failed', 
//             error: error.message 
//         });
//     }
// };

// // @desc    Create a new formula
// // @route   POST /api/formulas
// // @access  Private
// exports.createFormula = async (req, res) => {
//     console.log('=== createFormula called ===');
//     console.log('req.body:', req.body);
    
//     try {
//         const { 
//             name, 
//             description,
//             formulaType,
//             formulaExpression,
//             formulaJson,
//             variables,
//             targetComponentId,
//             applicableDesignations,
//             applicableEmployeeTypes,
//             isActive,
//             validFrom,
//             validTo,
//             priority,
//             companyId,
//             createdBy
//         } = req.body;

//         if (!name || !formulaExpression || !formulaJson || !companyId) {
//             return res.status(400).json({ 
//                 message: 'Missing required fields: name, formulaExpression, formulaJson, or companyId' 
//             });
//         }

//         // Validate formula expression
//         const validationResult = validateFormula(formulaExpression, formulaJson, variables);
//         if (!validationResult.valid) {
//             return res.status(400).json({ 
//                 message: 'Formula validation failed', 
//                 errors: validationResult.errors 
//             });
//         }

//         // Check if target component exists and belongs to the same company
//         if (targetComponentId) {
//             const targetComponent = await SalaryComponent.findOne({
//                 where: { id: targetComponentId, companyId }
//             });

//             if (!targetComponent) {
//                 return res.status(400).json({ 
//                     message: 'Target component not found or does not belong to this company' 
//                 });
//             }
//         }

//         // Validate designations if provided
//         if (applicableDesignations && applicableDesignations.length > 0) {
//             const designations = await Designation.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableDesignations },
//                     companyId
//                 }
//             });

//             if (designations.length !== applicableDesignations.length) {
//                 return res.status(400).json({ 
//                     message: 'One or more designations not found or do not belong to this company' 
//                 });
//             }
//         }

//         // Validate employee types if provided
//         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
//             const employeeTypes = await EmploymentType.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableEmployeeTypes },
//                     companyId
//                 }
//             });

//             if (employeeTypes.length !== applicableEmployeeTypes.length) {
//                 return res.status(400).json({ 
//                     message: 'One or more employee types not found or do not belong to this company' 
//                 });
//             }
//         }

//         const newFormula = await Formula.create({
//             name,
//             description,
//             formulaType: formulaType || 'Simple',
//             formulaExpression,
//             formulaJson,
//             variables: variables || [],
//             targetComponentId,
//             applicableDesignations: applicableDesignations || [],
//             applicableEmployeeTypes: applicableEmployeeTypes || [],
//             isActive: isActive !== undefined ? isActive : true,
//             validFrom,
//             validTo,
//             priority: priority || 0,
//             companyId,
//             createdBy
//         });
        
//         console.log('Formula created:', newFormula.dataValues);
//         res.status(201).json(newFormula);
//     } catch (error) {
//         console.error('Error in createFormula:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Get a single formula by ID
// // @route   GET /api/formulas/:id
// // @access  Private
// exports.getFormulaById = async (req, res) => {
//     console.log('=== getFormulaById called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { id } = req.params;

//         const formula = await Formula.findByPk(id, {
//             include: [
//                 { model: Company, attributes: ['id', 'name'] },
//                 { 
//                     model: SalaryComponent, 
//                     as: 'targetComponent',
//                     attributes: ['id', 'name'] // Removed 'code' and 'type' fields
//                 }
//             ]
//         });

//         if (!formula) {
//             return res.status(404).json({ message: 'Formula not found' });
//         }

//         console.log('Formula found:', formula.dataValues);
//         res.status(200).json(formula);
//     } catch (error) {
//         console.error('Error in getFormulaById:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Update a formula
// // @route   PUT /api/formulas/:id
// // @access  Private
// exports.updateFormula = async (req, res) => {
//     console.log('=== updateFormula called ===');
//     console.log('req.params:', req.params);
//     console.log('req.body:', req.body);
    
//     try {
//         const { id } = req.params;
//         const { 
//             name, 
//             description,
//             formulaType,
//             formulaExpression,
//             formulaJson,
//             variables,
//             targetComponentId,
//             applicableDesignations,
//             applicableEmployeeTypes,
//             isActive,
//             validFrom,
//             validTo,
//             priority,
//             companyId,
//             updatedBy
//         } = req.body;

//         const formula = await Formula.findByPk(id);
        
//         if (!formula) {
//             return res.status(404).json({ message: 'Formula not found' });
//         }

//         // Validate formula if expression or JSON changed
//         if (formulaExpression || formulaJson) {
//             const validationResult = validateFormula(
//                 formulaExpression || formula.formulaExpression,
//                 formulaJson || formula.formulaJson,
//                 variables || formula.variables
//             );
            
//             if (!validationResult.valid) {
//                 return res.status(400).json({ 
//                     message: 'Formula validation failed', 
//                     errors: validationResult.errors 
//                 });
//             }
//         }

//         // Check target component if changed
//         if (targetComponentId && targetComponentId !== formula.targetComponentId) {
//             const targetComponent = await SalaryComponent.findOne({
//                 where: { 
//                     id: targetComponentId, 
//                     companyId: formula.companyId 
//                 }
//             });

//             if (!targetComponent) {
//                 return res.status(400).json({ 
//                     message: 'Target component not found or does not belong to this company' 
//                 });
//             }
//         }

//         // Validate designations if changed
//         if (applicableDesignations && applicableDesignations.length > 0) {
//             const designations = await Designation.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableDesignations },
//                     companyId: formula.companyId
//                 }
//             });

//             if (designations.length !== applicableDesignations.length) {
//                 return res.status(400).json({ 
//                     message: 'One or more designations not found or do not belong to this company' 
//                 });
//             }
//         }

//         // Validate employee types if changed
//         if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
//             const employeeTypes = await EmploymentType.findAll({
//                 where: { 
//                     id: { [Op.in]: applicableEmployeeTypes },
//                     companyId: formula.companyId
//                 }
//             });

//             if (employeeTypes.length !== applicableEmployeeTypes.length) {
//                 return res.status(400).json({ 
//                     message: 'One or more employee types not found or do not belong to this company' 
//                 });
//             }
//         }

//         await formula.update({ 
//             name, 
//             description,
//             formulaType,
//             formulaExpression,
//             formulaJson,
//             variables,
//             targetComponentId,
//             applicableDesignations,
//             applicableEmployeeTypes,
//             isActive,
//             validFrom,
//             validTo,
//             priority,
//             companyId,
//             updatedBy
//         });
        
//         console.log('Formula updated:', formula.dataValues);
//         res.status(200).json(formula);
//     } catch (error) {
//         console.error('Error in updateFormula:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // @desc    Delete a formula
// // @route   DELETE /api/formulas/:id
// // @access  Private
// exports.deleteFormula = async (req, res) => {
//     console.log('=== deleteFormula called ===');
//     console.log('req.params:', req.params);
    
//     try {
//         const { id } = req.params;

//         const formula = await Formula.findByPk(id);
        
//         if (!formula) {
//             return res.status(404).json({ message: 'Formula not found' });
//         }

//         await formula.destroy();
//         console.log('Formula deleted:', id);
//         res.status(200).json({ message: 'Formula deleted successfully' });
//     } catch (error) {
//         console.error('Error in deleteFormula:', error);
//         console.error('Error stack:', error.stack);
//         res.status(500).json({ message: 'Server Error', error: error.message });
//     }
// };

// // Helper function to validate formula
// function validateFormula(expression, json, variables) {
//     const errors = [];

//     // Check if expression is not empty
//     if (!expression || expression.trim() === '') {
//         errors.push('Formula expression cannot be empty');
//     }

//     // Check if JSON structure is valid
//     if (!json || typeof json !== 'object') {
//         errors.push('Formula JSON structure is invalid');
//     }

//     // Check for balanced parentheses
//     if (expression) {
//         let balance = 0;
//         for (let char of expression) {
//             if (char === '(') balance++;
//             if (char === ')') balance--;
//             if (balance < 0) {
//                 errors.push('Unbalanced parentheses in formula');
//                 break;
//             }
//         }
//         if (balance !== 0) {
//             errors.push('Unbalanced parentheses in formula');
//         }
//     }

//     // Check for valid operators
//     const validOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
//     const operators = expression.match(/[+\-*/><=!&|()]/g) || [];
    
//     // Check for division by zero pattern
//     if (expression.includes('/0') || expression.includes('/ 0')) {
//         errors.push('Formula contains division by zero');
//     }

//     // Validate that all variables are defined
//     if (variables && variables.length > 0) {
//         for (let variable of variables) {
//             if (!expression.includes(variable)) {
//                 errors.push(`Variable ${variable} is declared but not used in formula`);
//             }
//         }
//     }

//     return {
//         valid: errors.length === 0,
//         errors: errors.length > 0 ? errors : null
//     };
// }

// // Helper function to evaluate formula (for testing)
// function evaluateFormula(expression, data) {
//     try {
//         // Replace variable names with their values
//         let evaluableExpression = expression;
        
//         for (let [key, value] of Object.entries(data)) {
//             const regex = new RegExp(`\\b${key}\\b`, 'g');
//             evaluableExpression = evaluableExpression.replace(regex, value);
//         }

//         // Use Function constructor for safe evaluation (better than eval)
//         // In production, consider using a proper expression parser library
//         const result = new Function(`return ${evaluableExpression}`)();
        
//         return result;
//     } catch (error) {
//         throw new Error(`Formula evaluation failed: ${error.message}`);
//     }
// }

const { Formula, SalaryComponent, Company, Designation, EmploymentType } = require('../models');
const { Op } = require('sequelize');

console.log('Models imported:');
console.log('Formula:', typeof Formula);
console.log('SalaryComponent:', typeof SalaryComponent);
console.log('Company:', typeof Company);
console.log('Designation:', typeof Designation);
console.log('EmploymentType:', typeof EmploymentType);

// @desc    Get all formulas for a specific company
// @route   GET /api/formulas?companyId=1&isActive=true
// @access  Private
exports.getFormulasByCompany = async (req, res) => {
    console.log('=== getFormulasByCompany called ===');
    console.log('req.query:', req.query);
    
    try {
        const { companyId, isActive } = req.query;

        if (!companyId) {
            console.log('Missing companyId');
            return res.status(400).json({ message: 'Company ID is required' });
        }

        console.log('CompanyId:', companyId);
        const whereClause = { companyId: parseInt(companyId) };
        
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true';
        }

        console.log('Where clause:', whereClause);
        console.log('Fetching formulas...');

        const formulas = await Formula.findAll({
            where: whereClause,
            include: [
                { 
                    model: Company, 
                    attributes: ['id', 'name'] 
                },
                { 
                    model: SalaryComponent, 
                    as: 'targetComponent',
                    attributes: ['id', 'name'] 
                }
            ],
            order: [['priority', 'ASC'], ['createdAt', 'DESC']]
        });
        
        console.log('Formulas found:', formulas.length);
        res.status(200).json(formulas);
    } catch (error) {
        console.error('Error in getFormulasByCompany:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get available designations for formula building
// @route   GET /api/formulas/designations/:companyId
// @access  Private
exports.getAvailableDesignations = async (req, res) => {
    console.log('=== getAvailableDesignations called ===');
    console.log('req.params:', req.params);
    
    try {
        const { companyId } = req.params;

        if (!companyId) {
            console.log('Missing companyId');
            return res.status(400).json({ message: 'Company ID is required' });
        }

        console.log('CompanyId:', companyId);
        console.log('Fetching designations...');

        const designations = await Designation.findAll({
            where: { companyId: parseInt(companyId) },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        console.log('Designations found:', designations.length);
        res.status(200).json(designations);
    } catch (error) {
        console.error('Error in getAvailableDesignations:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get available employee types for formula building
// @route   GET /api/formulas/employee-types/:companyId
// @access  Private
exports.getAvailableEmployeeTypes = async (req, res) => {
    console.log('=== getAvailableEmployeeTypes called ===');
    console.log('req.params:', req.params);
    
    try {
        const { companyId } = req.params;

        if (!companyId) {
            console.log('Missing companyId');
            return res.status(400).json({ message: 'Company ID is required' });
        }

        console.log('CompanyId:', companyId);
        console.log('Fetching employee types...');

        const employeeTypes = await EmploymentType.findAll({
            where: { companyId: parseInt(companyId) },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        console.log('Employee types found:', employeeTypes.length);
        res.status(200).json(employeeTypes);
    } catch (error) {
        console.error('Error in getAvailableEmployeeTypes:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get available components for formula building
// @route   GET /api/formulas/components/:companyId
// @access  Private
exports.getAvailableComponents = async (req, res) => {
    console.log('=== getAvailableComponents called ===');
    console.log('req.params:', req.params);
    
    try {
        const { companyId } = req.params;

        if (!companyId) {
            console.log('Missing companyId');
            return res.status(400).json({ message: 'Company ID is required' });
        }

        console.log('CompanyId:', companyId);
        console.log('Fetching components...');

        const components = await SalaryComponent.findAll({
            where: { companyId: parseInt(companyId) },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        console.log('Components found:', components.length);
        res.status(200).json(components);
    } catch (error) {
        console.error('Error in getAvailableComponents:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get formulas for specific employee
// @route   GET /api/formulas/employee/:employeeId
// @access  Private
exports.getFormulasForEmployee = async (req, res) => {
    console.log('=== getFormulasForEmployee called ===');
    console.log('req.params:', req.params);
    
    try {
        const { employeeId } = req.params;

        if (!employeeId) {
            console.log('Missing employeeId');
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        console.log('EmployeeId:', employeeId);
        console.log('Fetching employee details...');

        // First get the employee details to find their designation and employee type
        const { Employee } = require('../models');
        const employee = await Employee.findByPk(employeeId, {
            attributes: ['id', 'designationId', 'employmentTypeId', 'companyId']
        });

        if (!employee) {
            console.log('Employee not found');
            return res.status(404).json({ message: 'Employee not found' });
        }

        console.log('Employee found:', employee.dataValues);

        // Find formulas that apply to this employee
        const formulas = await Formula.findAll({
            where: { 
                companyId: employee.companyId,
                isActive: true,
                [Op.or]: [
                    { applicableDesignations: { [Op.contains]: [employee.designationId] } },
                    { applicableDesignations: { [Op.eq]: [] } },
                    { applicableDesignations: { [Op.is]: null } }
                ],
                [Op.or]: [
                    { applicableEmployeeTypes: { [Op.contains]: [employee.employmentTypeId] } },
                    { applicableEmployeeTypes: { [Op.eq]: [] } },
                    { applicableEmployeeTypes: { [Op.is]: null } }
                ]
            },
            include: [
                { 
                    model: Company, 
                    attributes: ['id', 'name'] 
                },
                { 
                    model: SalaryComponent, 
                    as: 'targetComponent',
                    attributes: ['id', 'name'] 
                }
            ],
            order: [['priority', 'ASC'], ['createdAt', 'DESC']]
        });

        console.log('Formulas found for employee:', formulas.length);
        res.status(200).json(formulas);
    } catch (error) {
        console.error('Error in getFormulasForEmployee:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Validate a formula
// @route   POST /api/formulas/validate
// @access  Private
exports.validateFormulaEndpoint = async (req, res) => {
    console.log('=== validateFormulaEndpoint called ===');
    console.log('req.body:', req.body);
    
    try {
        const { formulaExpression, formulaJson, variables, companyId, applicableDesignations, applicableEmployeeTypes } = req.body;

        if (!formulaExpression || !formulaJson) {
            return res.status(400).json({ 
                message: 'Formula expression and JSON are required' 
            });
        }

        // Verify all variables exist as salary components in the company
        if (variables && variables.length > 0 && companyId) {
            const components = await SalaryComponent.findAll({
                where: { 
                    companyId,
                    name: { [Op.in]: variables }
                }
            });

            const foundNames = components.map(c => c.name);
            const missingVariables = variables.filter(v => !foundNames.includes(v));

            if (missingVariables.length > 0) {
                return res.status(400).json({
                    valid: false,
                    errors: [`Components not found: ${missingVariables.join(', ')}`]
                });
            }
        }

        // Validate designations if provided
        if (applicableDesignations && applicableDesignations.length > 0 && companyId) {
            const designations = await Designation.findAll({
                where: { 
                    id: { [Op.in]: applicableDesignations },
                    companyId
                }
            });

            if (designations.length !== applicableDesignations.length) {
                return res.status(400).json({
                    valid: false,
                    errors: ['One or more designations not found or do not belong to this company']
                });
            }
        }

        // Validate employee types if provided
        if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0 && companyId) {
            const employeeTypes = await EmploymentType.findAll({
                where: { 
                    id: { [Op.in]: applicableEmployeeTypes },
                    companyId
                }
            });

            if (employeeTypes.length !== applicableEmployeeTypes.length) {
                return res.status(400).json({
                    valid: false,
                    errors: ['One or more employee types not found or do not belong to this company']
                });
            }
        }

        const validationResult = validateFormula(formulaExpression, formulaJson, variables);
        console.log('Validation result:', validationResult);
        res.status(200).json(validationResult);
    } catch (error) {
        console.error('Error in validateFormulaEndpoint:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Test formula with sample data
// @route   POST /api/formulas/test
// @access  Private
exports.testFormula = async (req, res) => {
    console.log('=== testFormula called ===');
    console.log('req.body:', req.body);
    
    try {
        const { formulaExpression, sampleData } = req.body;

        if (!formulaExpression || !sampleData) {
            return res.status(400).json({ 
                message: 'Formula expression and sample data are required' 
            });
        }

        const result = evaluateFormula(formulaExpression, sampleData);
        console.log('Formula test result:', result);
        res.status(200).json({ 
            success: true, 
            result,
            formula: formulaExpression,
            sampleData
        });
    } catch (error) {
        console.error('Error in testFormula:', error);
        console.error('Error stack:', error.stack);
        res.status(400).json({ 
            success: false, 
            message: 'Formula evaluation failed', 
            error: error.message 
        });
    }
};

// @desc    Create a new formula
// @route   POST /api/formulas
// @access  Private
exports.createFormula = async (req, res) => {
    console.log('=== createFormula called ===');
    console.log('req.body:', req.body);
    
    try {
        const { 
            name, 
            description,
            formulaType,
            formulaExpression,
            formulaJson,
            variables,
            targetComponentId,
            applicableDesignations,
            applicableEmployeeTypes,
            isActive,
            validFrom,
            validTo,
            priority,
            companyId,
            createdBy
        } = req.body;

        if (!name || !formulaExpression || !formulaJson || !companyId) {
            return res.status(400).json({ 
                message: 'Missing required fields: name, formulaExpression, formulaJson, or companyId' 
            });
        }

        // Validate formula expression
        const validationResult = validateFormula(formulaExpression, formulaJson, variables);
        if (!validationResult.valid) {
            return res.status(400).json({ 
                message: 'Formula validation failed', 
                errors: validationResult.errors 
            });
        }

        // Check if target component exists and belongs to the same company
        if (targetComponentId) {
            const targetComponent = await SalaryComponent.findOne({
                where: { id: targetComponentId, companyId }
            });

            if (!targetComponent) {
                return res.status(400).json({ 
                    message: 'Target component not found or does not belong to this company' 
                });
            }
        }

        // Validate designations if provided
        if (applicableDesignations && applicableDesignations.length > 0) {
            const designations = await Designation.findAll({
                where: { 
                    id: { [Op.in]: applicableDesignations },
                    companyId
                }
            });

            if (designations.length !== applicableDesignations.length) {
                return res.status(400).json({ 
                    message: 'One or more designations not found or do not belong to this company' 
                });
            }
        }

        // Validate employee types if provided
        if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
            const employeeTypes = await EmploymentType.findAll({
                where: { 
                    id: { [Op.in]: applicableEmployeeTypes },
                    companyId
                }
            });

            if (employeeTypes.length !== applicableEmployeeTypes.length) {
                return res.status(400).json({ 
                    message: 'One or more employee types not found or do not belong to this company' 
                });
            }
        }

        const newFormula = await Formula.create({
            name,
            description,
            formulaType: formulaType || 'Simple',
            formulaExpression,
            formulaJson,
            variables: variables || [],
            targetComponentId,
            applicableDesignations: applicableDesignations || [],
            applicableEmployeeTypes: applicableEmployeeTypes || [],
            isActive: isActive !== undefined ? isActive : true,
            validFrom,
            validTo,
            priority: priority || 0,
            companyId,
            createdBy
        });
        
        console.log('Formula created:', newFormula.dataValues);
        res.status(201).json(newFormula);
    } catch (error) {
        console.error('Error in createFormula:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single formula by ID
// @route   GET /api/formulas/:id
// @access  Private
exports.getFormulaById = async (req, res) => {
    console.log('=== getFormulaById called ===');
    console.log('req.params:', req.params);
    
    try {
        const { id } = req.params;

        const formula = await Formula.findByPk(id, {
            include: [
                { model: Company, attributes: ['id', 'name'] },
                { 
                    model: SalaryComponent, 
                    as: 'targetComponent',
                    attributes: ['id', 'name'] 
                }
            ]
        });

        if (!formula) {
            return res.status(404).json({ message: 'Formula not found' });
        }

        console.log('Formula found:', formula.dataValues);
        res.status(200).json(formula);
    } catch (error) {
        console.error('Error in getFormulaById:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a formula
// @route   PUT /api/formulas/:id
// @access  Private
exports.updateFormula = async (req, res) => {
    console.log('=== updateFormula called ===');
    console.log('req.params:', req.params);
    console.log('req.body:', req.body);
    
    try {
        const { id } = req.params;
        const { 
            name, 
            description,
            formulaType,
            formulaExpression,
            formulaJson,
            variables,
            targetComponentId,
            applicableDesignations,
            applicableEmployeeTypes,
            isActive,
            validFrom,
            validTo,
            priority,
            companyId,
            updatedBy
        } = req.body;

        const formula = await Formula.findByPk(id);
        
        if (!formula) {
            return res.status(404).json({ message: 'Formula not found' });
        }

        // Validate formula if expression or JSON changed
        if (formulaExpression || formulaJson) {
            const validationResult = validateFormula(
                formulaExpression || formula.formulaExpression,
                formulaJson || formula.formulaJson,
                variables || formula.variables
            );
            
            if (!validationResult.valid) {
                return res.status(400).json({ 
                    message: 'Formula validation failed', 
                    errors: validationResult.errors 
                });
            }
        }

        // Check target component if changed
        if (targetComponentId && targetComponentId !== formula.targetComponentId) {
            const targetComponent = await SalaryComponent.findOne({
                where: { 
                    id: targetComponentId, 
                    companyId: formula.companyId 
                }
            });

            if (!targetComponent) {
                return res.status(400).json({ 
                    message: 'Target component not found or does not belong to this company' 
                });
            }
        }

        // Validate designations if changed
        if (applicableDesignations && applicableDesignations.length > 0) {
            const designations = await Designation.findAll({
                where: { 
                    id: { [Op.in]: applicableDesignations },
                    companyId: formula.companyId
                }
            });

            if (designations.length !== applicableDesignations.length) {
                return res.status(400).json({ 
                    message: 'One or more designations not found or do not belong to this company' 
                });
            }
        }

        // Validate employee types if changed
        if (applicableEmployeeTypes && applicableEmployeeTypes.length > 0) {
            const employeeTypes = await EmploymentType.findAll({
                where: { 
                    id: { [Op.in]: applicableEmployeeTypes },
                    companyId: formula.companyId
                }
            });

            if (employeeTypes.length !== applicableEmployeeTypes.length) {
                return res.status(400).json({ 
                    message: 'One or more employee types not found or do not belong to this company' 
                });
            }
        }

        await formula.update({ 
            name, 
            description,
            formulaType,
            formulaExpression,
            formulaJson,
            variables,
            targetComponentId,
            applicableDesignations,
            applicableEmployeeTypes,
            isActive,
            validFrom,
            validTo,
            priority,
            companyId,
            updatedBy
        });
        
        console.log('Formula updated:', formula.dataValues);
        res.status(200).json(formula);
    } catch (error) {
        console.error('Error in updateFormula:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a formula
// @route   DELETE /api/formulas/:id
// @access  Private
exports.deleteFormula = async (req, res) => {
    console.log('=== deleteFormula called ===');
    console.log('req.params:', req.params);
    
    try {
        const { id } = req.params;

        const formula = await Formula.findByPk(id);
        
        if (!formula) {
            return res.status(404).json({ message: 'Formula not found' });
        }

        await formula.destroy();
        console.log('Formula deleted:', id);
        res.status(200).json({ message: 'Formula deleted successfully' });
    } catch (error) {
        console.error('Error in deleteFormula:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper function to validate formula
function validateFormula(expression, json, variables) {
    const errors = [];

    // Check if expression is not empty
    if (!expression || expression.trim() === '') {
        errors.push('Formula expression cannot be empty');
    }

    // Check if JSON structure is valid
    if (!json || typeof json !== 'object') {
        errors.push('Formula JSON structure is invalid');
    }

    // Check for balanced parentheses
    if (expression) {
        let balance = 0;
        for (let char of expression) {
            if (char === '(') balance++;
            if (char === ')') balance--;
            if (balance < 0) {
                errors.push('Unbalanced parentheses in formula');
                break;
            }
        }
        if (balance !== 0) {
            errors.push('Unbalanced parentheses in formula');
        }
    }

    // Check for valid operators
    const validOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
    const operators = expression.match(/[+\-*/><=!&|()]/g) || [];
    
    // Check for division by zero pattern
    if (expression.includes('/0') || expression.includes('/ 0')) {
        errors.push('Formula contains division by zero');
    }

    // Validate that all variables are defined
    if (variables && variables.length > 0) {
        for (let variable of variables) {
            if (!expression.includes(variable)) {
                errors.push(`Variable ${variable} is declared but not used in formula`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : null
    };
}

// Helper function to evaluate formula (for testing)
function evaluateFormula(expression, data) {
    try {
        // Replace variable names with their values
        let evaluableExpression = expression;
        
        for (let [key, value] of Object.entries(data)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            evaluableExpression = evaluableExpression.replace(regex, value);
        }

        // Use Function constructor for safe evaluation (better than eval)
        // In production, consider using a proper expression parser library
        const result = new Function(`return ${evaluableExpression}`)();
        
        return result;
    } catch (error) {
        throw new Error(`Formula evaluation failed: ${error.message}`);
    }
}