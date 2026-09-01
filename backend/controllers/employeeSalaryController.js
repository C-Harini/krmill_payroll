const db = require('../models');
const { EmployeeSalaryMaster, EmployeeSalaryComponent, SalaryRevisionHistory, SalaryComponent, Employee, Company, Department, Designation, EmployerGrade } = db;
const { Op } = require('sequelize');
const sequelize = db.sequelize;

// Import formulaEvaluator 
const formulaEvaluator = require('./formulaEvaluator');

// Test endpoint
exports.testRoute = (req, res) => {
    res.json({ 
        message: 'Employee Salary API is working!',
        timestamp: new Date().toISOString()
    });
};

// Get all salary structures
exports.getEmployeeSalaries = async (req, res) => {
    const { companyId, employeeId, status } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const whereClause = { companyId };
        if (employeeId) whereClause.employeeId = employeeId;
        if (status) whereClause.status = status;

        const salaries = await EmployeeSalaryMaster.findAll({
            where: whereClause,
            include: [
                { 
                    model: Employee, 
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode', 'officialEmail']
                },
                { 
                    model: Company, 
                    attributes: ['id', 'name'] 
                },
                {
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent, attributes: ['id', 'name', 'code', 'type'] }]
                }
            ],
            order: [['effectiveFrom', 'DESC'], ['createdAt', 'DESC']]
        });

        res.status(200).json(salaries);
    } catch (error) {
        console.error('getEmployeeSalaries error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get current active salary
exports.getCurrentSalary = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const salary = await EmployeeSalaryMaster.findOne({
            where: { employeeId, status: 'Active', effectiveTo: null },
            include: [
                { 
                    model: Employee, 
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode', 'officialEmail']
                },
                { model: Company, attributes: ['id', 'name'] },
                {
                    model: EmployeeSalaryComponent,
                    include: [{ 
                        model: SalaryComponent, 
                        attributes: ['id', 'name', 'code', 'type', 'calculationType'] 
                    }]
                }
            ]
        });

        if (!salary) {
            return res.status(404).json({ message: 'No active salary found for this employee' });
        }

        res.status(200).json(salary);
    } catch (error) {
        console.error('getCurrentSalary error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get salary for specific date
exports.getSalaryForDate = async (req, res) => {
    const { employeeId } = req.params;
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
    }

    try {
        const salary = await EmployeeSalaryMaster.findOne({
            where: {
                employeeId,
                effectiveFrom: { [Op.lte]: date },
                [Op.or]: [
                    { effectiveTo: { [Op.gte]: date } },
                    { effectiveTo: null }
                ]
            },
            include: [
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                {
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent }],
                    order: [['displayOrder', 'ASC']]
                }
            ]
        });

        if (!salary) {
            return res.status(404).json({ message: 'No salary found for this employee on the specified date' });
        }

        res.status(200).json(salary);
    } catch (error) {
        console.error('getSalaryForDate error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get salary history
exports.getSalaryHistory = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const history = await EmployeeSalaryMaster.findAll({
            where: { employeeId },
            include: [
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                {
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent, attributes: ['name', 'code', 'type'] }]
                }
            ],
            order: [['effectiveFrom', 'DESC']]
        });

        res.status(200).json(history);
    } catch (error) {
        console.error('getSalaryHistory error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get revision history
exports.getRevisionHistory = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const history = await SalaryRevisionHistory.findAll({
            where: { employeeId },
            include: [
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: Company, attributes: ['id', 'name'] }
            ],
            order: [['revisionDate', 'DESC']]
        });

        res.status(200).json(history);
    } catch (error) {
        console.error('getRevisionHistory error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Assign initial salary
exports.assignSalary = async (req, res) => {
    const { employeeId, companyId, effectiveFrom, components, remarks, createdBy } = req.body;

    if (!employeeId || !companyId || !effectiveFrom || !components || components.length === 0) {
        return res.status(400).json({ 
            message: 'Missing required fields: employeeId, companyId, effectiveFrom, or components' 
        });
    }

    const transaction = await sequelize.transaction();

    try {
        const existingSalary = await EmployeeSalaryMaster.findOne({
            where: { employeeId, status: 'Active', effectiveTo: null },
            transaction
        });

        if (existingSalary) {
            await transaction.rollback();
            return res.status(409).json({ 
                message: 'Employee already has an active salary structure. Use revision instead.' 
            });
        }

        const calculationResult = await calculateSalaryTotals(components, companyId, employeeId, transaction);

        const salaryMaster = await EmployeeSalaryMaster.create({
            employeeId,
            companyId,
            effectiveFrom,
            effectiveTo: null,
            basicSalary: calculationResult.basicSalary,
            grossSalary: calculationResult.grossSalary,
            totalDeductions: calculationResult.totalDeductions,
            netSalary: calculationResult.netSalary,
            ctcAnnual: calculationResult.ctcAnnual,
            ctcMonthly: calculationResult.ctcMonthly,
            revisionType: 'Initial',
            revisionPercentage: null,
            previousSalaryId: null,
            status: 'Active',
            remarks,
            createdBy
        }, { transaction });

        await createComponentRecords(
            salaryMaster.id, 
            components, 
            calculationResult.componentCalculations,
            transaction
        );

        await SalaryRevisionHistory.create({
            employeeId,
            companyId,
            oldSalaryMasterId: null,
            newSalaryMasterId: salaryMaster.id,
            revisionDate: effectiveFrom,
            revisionType: 'Initial',
            oldBasicSalary: null,
            newBasicSalary: calculationResult.basicSalary,
            oldGrossSalary: null,
            newGrossSalary: calculationResult.grossSalary,
            oldCTC: null,
            newCTC: calculationResult.ctcAnnual,
            incrementAmount: 0,
            incrementPercentage: 0,
            reason: 'Initial salary assignment',
            processedBy: createdBy || 1
        }, { transaction });

        await transaction.commit();

        const completeSalary = await EmployeeSalaryMaster.findByPk(salaryMaster.id, {
            include: [
                { model: Employee },
                { model: Company },
                { 
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent }]
                }
            ]
        });

        res.status(201).json(completeSalary);
    } catch (error) {
        await transaction.rollback();
        console.error('assignSalary error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Bulk assign salaries
exports.bulkAssignSalary = async (req, res) => {
    const { companyId, effectiveFrom, salaryData, createdBy } = req.body;

    if (!companyId || !effectiveFrom || !salaryData || !Array.isArray(salaryData) || salaryData.length === 0) {
        return res.status(400).json({ 
            message: 'Missing required fields: companyId, effectiveFrom, or salaryData (must be array)' 
        });
    }

    const results = {
        successful: [],
        failed: []
    };

    // Process each employee salary assignment
    for (const data of salaryData) {
        const transaction = await sequelize.transaction();
        
        try {
            const { employeeId, employeeCode, components } = data;

            if (!employeeId && !employeeCode) {
                results.failed.push({
                    data,
                    error: 'Either employeeId or employeeCode is required'
                });
                await transaction.rollback();
                continue;
            }

            // Find employee by ID or Code
            let employee;
            if (employeeId) {
                employee = await Employee.findByPk(employeeId, { transaction });
            } else {
                employee = await Employee.findOne({
                    where: { employeeCode, companyId },
                    transaction
                });
            }

            if (!employee) {
                results.failed.push({
                    data,
                    error: `Employee not found: ${employeeId || employeeCode}`
                });
                await transaction.rollback();
                continue;
            }

            // Check for existing active salary
            const existingSalary = await EmployeeSalaryMaster.findOne({
                where: { employeeId: employee.id, status: 'Active', effectiveTo: null },
                transaction
            });

            if (existingSalary) {
                results.failed.push({
                    data,
                    error: `Employee ${employee.employeeCode} already has active salary`
                });
                await transaction.rollback();
                continue;
            }

            // Calculate salary totals
            const calculationResult = await calculateSalaryTotals(components, companyId, employee.id, transaction);

            // Create salary master
            const salaryMaster = await EmployeeSalaryMaster.create({
                employeeId: employee.id,
                companyId,
                effectiveFrom,
                effectiveTo: null,
                basicSalary: calculationResult.basicSalary,
                grossSalary: calculationResult.grossSalary,
                totalDeductions: calculationResult.totalDeductions,
                netSalary: calculationResult.netSalary,
                ctcAnnual: calculationResult.ctcAnnual,
                ctcMonthly: calculationResult.ctcMonthly,
                revisionType: 'Initial',
                revisionPercentage: null,
                previousSalaryId: null,
                status: 'Active',
                remarks: data.remarks || 'Bulk upload',
                createdBy
            }, { transaction });

            // Create component records
            await createComponentRecords(
                salaryMaster.id,
                components,
                calculationResult.componentCalculations,
                transaction
            );

            // Create revision history
            await SalaryRevisionHistory.create({
                employeeId: employee.id,
                companyId,
                oldSalaryMasterId: null,
                newSalaryMasterId: salaryMaster.id,
                revisionDate: effectiveFrom,
                revisionType: 'Initial',
                oldBasicSalary: null,
                newBasicSalary: calculationResult.basicSalary,
                oldGrossSalary: null,
                newGrossSalary: calculationResult.grossSalary,
                oldCTC: null,
                newCTC: calculationResult.ctcAnnual,
                incrementAmount: 0,
                incrementPercentage: 0,
                reason: 'Bulk salary assignment',
                processedBy: createdBy || 1
            }, { transaction });

            await transaction.commit();

            results.successful.push({
                employeeId: employee.id,
                employeeCode: employee.employeeCode,
                name: employee.firstName,
                ctcAnnual: calculationResult.ctcAnnual
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Bulk assign error for employee:', data, error);
            results.failed.push({
                data,
                error: error.message
            });
        }
    }

    res.status(200).json({
        message: `Processed ${salaryData.length} records`,
        successful: results.successful.length,
        failed: results.failed.length,
        details: results
    });
};

// Revise salary
exports.reviseSalary = async (req, res) => {
    const { employeeId, effectiveFrom, revisionType, revisionPercentage, components, reason, remarks, createdBy, companyId } = req.body;

    if (!employeeId || !effectiveFrom || !revisionType || !components) {
        return res.status(400).json({ 
            message: 'Missing required fields: employeeId, effectiveFrom, revisionType, or components' 
        });
    }

    const transaction = await sequelize.transaction();

    try {
        const currentSalary = await EmployeeSalaryMaster.findOne({
            where: { employeeId, status: 'Active', effectiveTo: null },
            include: [{ model: EmployeeSalaryComponent }],
            transaction
        });

        if (!currentSalary) {
            await transaction.rollback();
            return res.status(404).json({ message: 'No active salary found for this employee' });
        }

        const effectiveToDate = new Date(effectiveFrom);
        effectiveToDate.setDate(effectiveToDate.getDate() - 1);
        
        await currentSalary.update({
            effectiveTo: effectiveToDate,
            status: 'Superseded'
        }, { transaction });

        const calculationResult = await calculateSalaryTotals(components, companyId || currentSalary.companyId, employeeId, transaction);

        const newSalary = await EmployeeSalaryMaster.create({
            employeeId,
            companyId: currentSalary.companyId,
            effectiveFrom,
            effectiveTo: null,
            basicSalary: calculationResult.basicSalary,
            grossSalary: calculationResult.grossSalary,
            totalDeductions: calculationResult.totalDeductions,
            netSalary: calculationResult.netSalary,
            ctcAnnual: calculationResult.ctcAnnual,
            ctcMonthly: calculationResult.ctcMonthly,
            revisionType,
            revisionPercentage,
            previousSalaryId: currentSalary.id,
            status: 'Active',
            remarks,
            createdBy
        }, { transaction });

        await createComponentRecords(
            newSalary.id, 
            components, 
            calculationResult.componentCalculations,
            transaction
        );

        const incrementAmount = calculationResult.ctcAnnual - currentSalary.ctcAnnual;
        const calculatedPercentage = currentSalary.ctcAnnual > 0 
            ? ((incrementAmount / currentSalary.ctcAnnual) * 100).toFixed(2)
            : 0;

        await SalaryRevisionHistory.create({
            employeeId,
            companyId: currentSalary.companyId,
            oldSalaryMasterId: currentSalary.id,
            newSalaryMasterId: newSalary.id,
            revisionDate: effectiveFrom,
            revisionType,
            oldBasicSalary: currentSalary.basicSalary,
            newBasicSalary: calculationResult.basicSalary,
            oldGrossSalary: currentSalary.grossSalary,
            newGrossSalary: calculationResult.grossSalary,
            oldCTC: currentSalary.ctcAnnual,
            newCTC: calculationResult.ctcAnnual,
            incrementAmount,
            incrementPercentage: revisionPercentage || calculatedPercentage,
            reason: reason || `Salary revision: ${revisionType}`,
            processedBy: createdBy || 1
        }, { transaction });

        await transaction.commit();

        const completeSalary = await EmployeeSalaryMaster.findByPk(newSalary.id, {
            include: [
                { model: Employee },
                { model: Company },
                { 
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent }]
                }
            ]
        });

        res.status(200).json(completeSalary);
    } catch (error) {
        await transaction.rollback();
        console.error('reviseSalary error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update salary
exports.updateSalary = async (req, res) => {
    const { id } = req.params;
    const { effectiveFrom, components, remarks, updatedBy } = req.body;

    if (!components || components.length === 0) {
        return res.status(400).json({ message: 'Components are required' });
    }

    const transaction = await sequelize.transaction();

    try {
        const salaryMaster = await EmployeeSalaryMaster.findByPk(id, {
            include: [{ model: EmployeeSalaryComponent }],
            transaction
        });

        if (!salaryMaster) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Salary structure not found' });
        }

        // Delete existing component records
        await EmployeeSalaryComponent.destroy({
            where: { employeeSalaryMasterId: id },
            transaction
        });

        // Recalculate with new components
        const calculationResult = await calculateSalaryTotals(components, salaryMaster.companyId, salaryMaster.employeeId, transaction);

        // Update master record
        await salaryMaster.update({
            effectiveFrom: effectiveFrom || salaryMaster.effectiveFrom,
            basicSalary: calculationResult.basicSalary,
            grossSalary: calculationResult.grossSalary,
            totalDeductions: calculationResult.totalDeductions,
            netSalary: calculationResult.netSalary,
            ctcAnnual: calculationResult.ctcAnnual,
            ctcMonthly: calculationResult.ctcMonthly,
            remarks,
            updatedBy
        }, { transaction });

        // Create new component records
        await createComponentRecords(
            salaryMaster.id,
            components,
            calculationResult.componentCalculations,
            transaction
        );

        await transaction.commit();

        // Fetch complete updated record
        const updatedSalary = await EmployeeSalaryMaster.findByPk(id, {
            include: [
                { model: Employee },
                { model: Company },
                { 
                    model: EmployeeSalaryComponent,
                    include: [{ model: SalaryComponent }]
                }
            ]
        });

        res.status(200).json(updatedSalary);
    } catch (error) {
        await transaction.rollback();
        console.error('updateSalary error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Delete salary
exports.deleteSalary = async (req, res) => {
    const { id } = req.params;

    const transaction = await sequelize.transaction();

    try {
        const salaryMaster = await EmployeeSalaryMaster.findByPk(id, { transaction });

        if (!salaryMaster) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Salary structure not found' });
        }

        // Delete associated components (should cascade, but being explicit)
        await EmployeeSalaryComponent.destroy({
            where: { employeeSalaryMasterId: id },
            transaction
        });

        // Delete the master record
        await salaryMaster.destroy({ transaction });

        await transaction.commit();

        res.status(200).json({ message: 'Salary structure deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('deleteSalary error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper: Calculate salary totals
async function calculateSalaryTotals(components, companyId, employeeId, transaction) {
    let basicSalary = 0;
    let grossSalary = 0;
    let totalDeductions = 0;
    const componentCalculations = {};
    const componentValues = {};

    // Get all salary components for the company to set up formula evaluator
    const allComponents = await SalaryComponent.findAll({
        where: { companyId },
        attributes: ['code', 'name'],
        transaction
    });
    
    // Set allowed components for formula evaluation
    formulaEvaluator.setAllowedComponents(allComponents);

    // Get employee data for formula context (designation, grade, department, etc.)
    const employee = await Employee.findByPk(employeeId, {
        include: [
            { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'name']] },
            { model: Designation, as: 'designation', attributes: ['name'] },
            { model: EmployerGrade, as: 'grade', attributes: ['name'] }
        ],
        transaction
    });

    // Build employee context for formula evaluation
    const employeeContext = {
        designation: employee?.designation?.name || '',
        grade: employee?.grade?.name || '',
        department: employee?.department?.name || '',
        experience: employee?.experience || 0,
        employeeType: employee?.employeeType || '',
        location: employee?.workLocation || '',
        age: employee?.getAge ? employee.getAge() : 0
    };

    // First pass: Fixed amounts
    for (let comp of components) {
        const salaryComponent = await SalaryComponent.findByPk(comp.componentId, { transaction });
        if (!salaryComponent) {
            throw new Error(`Salary component with ID ${comp.componentId} not found`);
        }

        let calculatedAmount = 0;
        if (comp.valueType === 'Fixed') {
            calculatedAmount = parseFloat(comp.fixedAmount) || 0;
            componentValues[salaryComponent.code] = calculatedAmount;
            
            if (salaryComponent.code === 'BASIC' || salaryComponent.name.toLowerCase().includes('basic')) {
                basicSalary = calculatedAmount;
            }
        }

        componentCalculations[comp.componentId] = {
            salaryComponent,
            ...comp,
            calculatedAmount
        };
    }

    // Second pass: Percentages
    for (let compId in componentCalculations) {
        const comp = componentCalculations[compId];
        if (comp.valueType === 'Percentage') {
            const baseAmount = componentValues[comp.percentageBase] || 0;
            comp.calculatedAmount = (baseAmount * parseFloat(comp.percentageValue || 0)) / 100;
            componentValues[comp.salaryComponent.code] = comp.calculatedAmount;
        }
    }

    // Third pass: Formulas (using formula from component or from payload)
    for (let compId in componentCalculations) {
        const comp = componentCalculations[compId];
        if (comp.valueType === 'Formula') {
            try {
                // Use formula from payload if provided, otherwise use from component definition
                const formulaExpression = comp.formula || comp.salaryComponent.formula;
                
                if (!formulaExpression) {
                    console.warn(`No formula found for component ${comp.salaryComponent.code}`);
                    comp.calculatedAmount = 0;
                    componentValues[comp.salaryComponent.code] = 0;
                    continue;
                }

                // Validate the formula
                const validation = formulaEvaluator.validateFormula(formulaExpression);
                if (!validation.valid) {
                    throw new Error(`Invalid formula for ${comp.salaryComponent.name}: ${validation.error}`);
                }

                // Merge component values with employee context for formula evaluation
                const evaluationContext = { ...componentValues, ...employeeContext };
                
                // Evaluate the formula with complete context
                comp.calculatedAmount = formulaEvaluator.evaluate(formulaExpression, evaluationContext);
                componentValues[comp.salaryComponent.code] = comp.calculatedAmount;
            } catch (error) {
                console.error(`Formula evaluation error for component ${comp.salaryComponent.code}:`, error);
                throw new Error(`Failed to calculate ${comp.salaryComponent.name}: ${error.message}`);
            }
        }
    }

    // Calculate totals
    for (let compId in componentCalculations) {
        const comp = componentCalculations[compId];
        if (comp.salaryComponent.type === 'Earning' && comp.salaryComponent.affectsGrossSalary) {
            grossSalary += parseFloat(comp.calculatedAmount) || 0;
        } else if (comp.salaryComponent.type === 'Deduction') {
            totalDeductions += parseFloat(comp.calculatedAmount) || 0;
        }
    }

    const netSalary = grossSalary - totalDeductions;
    const ctcMonthly = grossSalary;
    const ctcAnnual = ctcMonthly * 12;

    return {
        basicSalary,
        grossSalary,
        totalDeductions,
        netSalary,
        ctcMonthly,
        ctcAnnual,
        componentCalculations
    };
}

// Helper: Create component records
async function createComponentRecords(salaryMasterId, components, componentCalculations, transaction) {
    const componentRecords = [];

    for (let comp of components) {
        const calcComp = componentCalculations[comp.componentId];
        const salaryComponent = calcComp.salaryComponent;

        // Store formula expression if it's a formula type
        let formulaExpression = null;
        if (comp.valueType === 'Formula') {
            // Use formula from payload if provided, otherwise use from component definition
            formulaExpression = comp.formula || salaryComponent.formula;
        }

        const componentRecord = await EmployeeSalaryComponent.create({
            employeeSalaryMasterId: salaryMasterId,
            componentId: comp.componentId,
            componentName: salaryComponent.name,
            componentCode: salaryComponent.code,
            componentType: salaryComponent.type,
            valueType: comp.valueType,
            fixedAmount: comp.valueType === 'Fixed' ? comp.fixedAmount : null,
            percentageValue: comp.valueType === 'Percentage' ? comp.percentageValue : null,
            percentageBase: comp.valueType === 'Percentage' ? comp.percentageBase : null,
            formulaId: null, // No longer using formula table
            formulaExpression: formulaExpression,
            calculatedAmount: calcComp.calculatedAmount,
            annualAmount: calcComp.calculatedAmount * 12,
            isStatutory: salaryComponent.isStatutory,
            isTaxable: salaryComponent.isTaxable,
            affectsGrossSalary: salaryComponent.affectsGrossSalary,
            affectsNetSalary: salaryComponent.affectsNetSalary,
            displayOrder: salaryComponent.displayOrder,
            remarks: comp.remarks || null
        }, { transaction });

        componentRecords.push(componentRecord);
    }

    return componentRecords;
}

module.exports = exports;