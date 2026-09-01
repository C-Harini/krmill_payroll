class FormulaEvaluator {
    constructor() {
        this.allowedComponents = [];
        this.allowedFunctions = ['IF', 'ROUND', 'MIN', 'MAX', 'SWITCH', 'ABS', 'FLOOR', 'CEIL'];
        this.allowedOperators = [
            '+', '-', '*', '/', '%',
            '(', ')', 
            '>', '<', '>=', '<=', 
            '==', '!=', '===', '!==',
            '&&', '||', '!',
            '?', ':', // Ternary operator
            ',', '.',
            '[', ']' // Array access (if needed)
        ];
        this.allowedEmployeeAttributes = [
            'designation',
            'grade',
            'experience',
            'department',
            'employeeType',
            'location',
            'age',
            'joiningDate',
            'gender',
            'qualification'
        ];
        
        // Allowed JavaScript methods for numbers and strings
        this.allowedMethods = [
            'toString', 'toFixed', 'toUpperCase', 'toLowerCase', 
            'trim', 'includes', 'startsWith', 'endsWith'
        ];
    }

    validateFormula(formula) {
        if (!formula || typeof formula !== 'string') {
            return { valid: false, error: 'Formula must be a non-empty string' };
        }

        try {
            // Basic sanitization - remove comments
            let cleanFormula = formula.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments
            cleanFormula = cleanFormula.replace(/\/\/.*/g, ''); // Line comments

            // Check for dangerous patterns
            const dangerousPatterns = [
                /\b(eval|Function|setTimeout|setInterval|require|import|export|module|process|global|window|document)\b/gi,
                /__(proto|defineGetter|defineSetter|lookupGetter|lookupSetter)__/gi,
                /\bconstructor\s*\(/gi,
                /\bthis\s*\[/gi,
                /\.\s*constructor/gi
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(cleanFormula)) {
                    return { 
                        valid: false, 
                        error: 'Formula contains potentially dangerous code patterns' 
                    };
                }
            }

            // Check for balanced parentheses
            const balanceCheck = this.checkBalancedBrackets(cleanFormula);
            if (!balanceCheck.valid) {
                return balanceCheck;
            }

            // Extract all identifiers (variables, functions, methods)
            const identifiers = this.extractIdentifiers(formula);
            
            // Build list of allowed identifiers
            const allowedIdentifiers = [
                ...this.allowedComponents,
                ...this.allowedEmployeeAttributes,
                ...this.allowedFunctions,
                ...this.allowedMethods,
                'parseInt', 'parseFloat', 'Number', 'String', 'Boolean',
                'Math', 'Date', 'true', 'false', 'null', 'undefined'
            ];

            // Check for invalid identifiers
            const invalidIdentifiers = identifiers.filter(id => {
                // Allow numbers
                if (/^\d+$/.test(id)) return false;
                // Allow allowed identifiers
                if (allowedIdentifiers.includes(id)) return false;
                // Allow component codes (alphanumeric with underscores)
                if (/^[A-Z][A-Z0-9_]*$/i.test(id)) {
                    // Could be a component code, allow it
                    return false;
                }
                return true;
            });

            if (invalidIdentifiers.length > 0) {
                return { 
                    valid: false, 
                    error: `Potentially invalid identifiers: ${invalidIdentifiers.join(', ')}. Please verify these are valid component codes or variables.` 
                };
            }

            // Try to parse the formula as JavaScript (syntax check)
            try {
                new Function(`"use strict"; return (${formula});`);
            } catch (syntaxError) {
                return {
                    valid: false,
                    error: `Syntax error in formula: ${syntaxError.message}`
                };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    checkBalancedBrackets(formula) {
        const brackets = {
            '(': ')',
            '[': ']',
            '{': '}'
        };
        const stack = [];
        
        for (let i = 0; i < formula.length; i++) {
            const char = formula[i];
            
            if (brackets[char]) {
                stack.push(char);
            } else if (Object.values(brackets).includes(char)) {
                if (stack.length === 0) {
                    return { valid: false, error: `Unmatched closing bracket '${char}' at position ${i}` };
                }
                const last = stack.pop();
                if (brackets[last] !== char) {
                    return { valid: false, error: `Mismatched brackets: '${last}' and '${char}'` };
                }
            }
        }
        
        if (stack.length > 0) {
            return { valid: false, error: `Unclosed bracket: '${stack[stack.length - 1]}'` };
        }
        
        return { valid: true };
    }

    extractIdentifiers(formula) {
        // Extract all JavaScript identifiers (variables, functions, properties)
        const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
        const matches = formula.match(identifierRegex) || [];
        return [...new Set(matches)]; // Remove duplicates
    }

    evaluate(formula, context = {}) {
        if (!formula) {
            throw new Error('Formula is required');
        }

        // Validate first
        const validation = this.validateFormula(formula);
        if (!validation.valid) {
            throw new Error(`Invalid formula: ${validation.error}`);
        }

        // Create a safe evaluation context
        const safeContext = this.createSafeContext(context);
        
        try {
            // Create function with all context variables
            const contextKeys = Object.keys(safeContext);
            const contextValues = Object.values(safeContext);
            
            // Build the function with strict mode
            const funcBody = `
                'use strict';
                try {
                    const result = (${formula});
                    return result;
                } catch (error) {
                    throw new Error('Formula evaluation failed: ' + error.message);
                }
            `;
            
            const func = new Function(...contextKeys, funcBody);
            
            // Execute the function with context values
            const result = func(...contextValues);
            
            // Handle different result types
            if (typeof result === 'number') {
                if (isNaN(result) || !isFinite(result)) {
                    throw new Error('Formula returned an invalid number (NaN or Infinity)');
                }
                return Math.round(result * 100) / 100; // Round to 2 decimal places
            } else if (typeof result === 'string') {
                return result;
            } else if (typeof result === 'boolean') {
                return result;
            } else if (result === null || result === undefined) {
                return result;
            }
            
            // For other types, try to convert to number
            const numResult = Number(result);
            if (!isNaN(numResult) && isFinite(numResult)) {
                return Math.round(numResult * 100) / 100;
            }
            
            return result;
        } catch (error) {
            throw new Error(`Formula evaluation error: ${error.message}`);
        }
    }

    createSafeContext(context) {
        const safeContext = { ...context };
        
        // Add built-in functions
        safeContext.IF = (condition, trueValue, falseValue) => {
            return condition ? trueValue : falseValue;
        };
        
        safeContext.ROUND = (value, decimals = 2) => {
            if (typeof value !== 'number') {
                value = parseFloat(value);
            }
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        };
        
        safeContext.MIN = (...args) => {
            const numbers = args.map(a => typeof a === 'number' ? a : parseFloat(a));
            return Math.min(...numbers);
        };
        
        safeContext.MAX = (...args) => {
            const numbers = args.map(a => typeof a === 'number' ? a : parseFloat(a));
            return Math.max(...numbers);
        };
        
        safeContext.ABS = (value) => {
            return Math.abs(typeof value === 'number' ? value : parseFloat(value));
        };
        
        safeContext.FLOOR = (value) => {
            return Math.floor(typeof value === 'number' ? value : parseFloat(value));
        };
        
        safeContext.CEIL = (value) => {
            return Math.ceil(typeof value === 'number' ? value : parseFloat(value));
        };
        
        safeContext.SWITCH = (value, ...cases) => {
            for (let i = 0; i < cases.length - 1; i += 2) {
                if (value === cases[i]) return cases[i + 1];
            }
            return cases[cases.length - 1]; // default value
        };

        // Add safe parseInt and parseFloat
        safeContext.parseInt = (value, radix = 10) => {
            const result = parseInt(value, radix);
            return isNaN(result) ? 0 : result;
        };

        safeContext.parseFloat = (value) => {
            const result = parseFloat(value);
            return isNaN(result) ? 0 : result;
        };

        // Add safe Math object (limited methods)
        safeContext.Math = {
            abs: Math.abs,
            ceil: Math.ceil,
            floor: Math.floor,
            round: Math.round,
            min: Math.min,
            max: Math.max,
            pow: Math.pow,
            sqrt: Math.sqrt,
            PI: Math.PI,
            E: Math.E
        };

        // Add Number, String, Boolean constructors (safe to use for conversion)
        safeContext.Number = Number;
        safeContext.String = String;
        safeContext.Boolean = Boolean;

        return safeContext;
    }

    setAllowedComponents(components) {
        this.allowedComponents = components.map(c => c.code || c);
    }

    getFormulaHelp() {
        return {
            allowedFunctions: {
                IF: 'IF(condition, trueValue, falseValue) - Returns trueValue if condition is true, else falseValue',
                ROUND: 'ROUND(value, [decimals=2]) - Rounds a number to specified decimal places',
                MIN: 'MIN(value1, value2, ...) - Returns the minimum value',
                MAX: 'MAX(value1, value2, ...) - Returns the maximum value',
                ABS: 'ABS(value) - Returns absolute value',
                FLOOR: 'FLOOR(value) - Rounds down to nearest integer',
                CEIL: 'CEIL(value) - Rounds up to nearest integer',
                SWITCH: 'SWITCH(value, case1, result1, case2, result2, ..., defaultValue) - Multi-way switch',
                parseInt: 'parseInt(value, [radix=10]) - Converts string to integer',
                parseFloat: 'parseFloat(value) - Converts string to decimal number'
            },
            allowedOperators: {
                arithmetic: ['+', '-', '*', '/', '%'],
                comparison: ['>', '<', '>=', '<=', '==', '!=', '===', '!=='],
                logical: ['&&', '||', '!'],
                ternary: 'condition ? trueValue : falseValue',
                grouping: ['(', ')']
            },
            employeeAttributes: this.allowedEmployeeAttributes,
            examples: [
                {
                    description: 'Basic percentage calculation',
                    formula: 'basic * 0.4'
                },
                {
                    description: 'Conditional with IF function',
                    formula: 'IF(basic > 50000, basic * 0.4, basic * 0.3)'
                },
                {
                    description: 'Ternary operator',
                    formula: 'basic > 50000 ? basic * 0.4 : basic * 0.3'
                },
                {
                    description: 'Complex nested ternary',
                    formula: 'parseInt(B) === 0 || (grade === "Non Teaching" && designation === "Sweeper") ? 0 : grade === "Non Teaching" && designation === "Attender" ? 10 : grade === "Non Teaching" ? 50 : 100'
                },
                {
                    description: 'Multiple conditions with logical operators',
                    formula: '(designation === "Manager" || designation === "Director") && experience > 5 ? basic * 0.2 : basic * 0.1'
                },
                {
                    description: 'String comparison',
                    formula: 'department === "IT" ? 5000 : 3000'
                },
                {
                    description: 'Round calculation',
                    formula: 'ROUND(basic * 0.12)'
                },
                {
                    description: 'Min/Max constraints',
                    formula: 'MIN(basic * 0.5, 50000)'
                },
                {
                    description: 'SWITCH statement',
                    formula: 'SWITCH(designation, "MGR", 5000, "DIR", 10000, 2000)'
                },
                {
                    description: 'Experience-based calculation',
                    formula: 'IF(experience > 5, basic * 0.15, basic * 0.1)'
                },
                {
                    description: 'Combined components',
                    formula: 'basic + hra + da'
                },
                {
                    description: 'Grade-based with multiple conditions',
                    formula: 'grade === "A" ? 10000 : grade === "B" ? 7000 : grade === "C" ? 5000 : 3000'
                },
                {
                    description: 'Percentage calculation with floor',
                    formula: 'FLOOR((basic + hra) * 0.12)'
                },
                {
                    description: 'Complex calculation with parseInt',
                    formula: 'parseInt(basic) > 0 ? (basic * 0.12) + 500 : 0'
                }
            ],
            notes: [
                'Use === for strict equality comparison (recommended)',
                'Use == for loose equality comparison',
                'String values must be in quotes: "Manager", "IT", etc.',
                'Ternary operator: condition ? trueValue : falseValue',
                'You can nest multiple ternary operators for complex conditions',
                'Use parseInt() or parseFloat() to convert strings to numbers',
                'All salary component codes can be used as variables',
                'Employee attributes like designation, grade, department are available'
            ]
        };
    }

    // Helper method to test a formula with sample data
    testFormula(formula, testCases) {
        const results = [];
        
        for (const testCase of testCases) {
            try {
                const result = this.evaluate(formula, testCase.context);
                results.push({
                    context: testCase.context,
                    expected: testCase.expected,
                    actual: result,
                    passed: testCase.expected === undefined || result === testCase.expected,
                    error: null
                });
            } catch (error) {
                results.push({
                    context: testCase.context,
                    expected: testCase.expected,
                    actual: null,
                    passed: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// Export singleton instance
const formulaEvaluator = new FormulaEvaluator();
module.exports = formulaEvaluator;

// For testing (will only run if file is executed directly)
if (require.main === module) {
    console.log('=== Enhanced Formula Evaluator Tests ===\n');
    
    const evaluator = new FormulaEvaluator();
    evaluator.setAllowedComponents([
        { code: 'basic' },
        { code: 'hra' },
        { code: 'da' },
        { code: 'B' }
    ]);
    
    const testCases = [
        {
            name: 'Basic multiplication',
            formula: 'basic * 0.4',
            context: { basic: 50000 },
            expected: 20000
        },
        {
            name: 'IF function with string comparison',
            formula: 'IF(designation === "Manager", 5000, 3000)',
            context: { designation: 'Manager' },
            expected: 5000
        },
        {
            name: 'Simple ternary operator',
            formula: 'basic > 50000 ? basic * 0.4 : basic * 0.3',
            context: { basic: 45000 },
            expected: 13500
        },
        {
            name: 'Complex nested ternary (your example)',
            formula: 'parseInt(B) === 0 || (grade === "Non Teaching" && (designation === "Sweeper" || designation === "Gardener")) ? 0 : grade === "Non Teaching" && designation === "Attender" ? 10 : grade === "Non Teaching" ? 50 : 100',
            context: { B: '0', grade: 'Non Teaching', designation: 'Sweeper' },
            expected: 0
        },
        {
            name: 'Complex nested ternary - Attender case',
            formula: 'parseInt(B) === 0 || (grade === "Non Teaching" && (designation === "Sweeper" || designation === "Gardener")) ? 0 : grade === "Non Teaching" && designation === "Attender" ? 10 : grade === "Non Teaching" ? 50 : 100',
            context: { B: '100', grade: 'Non Teaching', designation: 'Attender' },
            expected: 10
        },
        {
            name: 'Complex nested ternary - Non Teaching other',
            formula: 'parseInt(B) === 0 || (grade === "Non Teaching" && (designation === "Sweeper" || designation === "Gardener")) ? 0 : grade === "Non Teaching" && designation === "Attender" ? 10 : grade === "Non Teaching" ? 50 : 100',
            context: { B: '100', grade: 'Non Teaching', designation: 'Office Staff' },
            expected: 50
        },
        {
            name: 'Complex nested ternary - Teaching',
            formula: 'parseInt(B) === 0 || (grade === "Non Teaching" && (designation === "Sweeper" || designation === "Gardener")) ? 0 : grade === "Non Teaching" && designation === "Attender" ? 10 : grade === "Non Teaching" ? 50 : 100',
            context: { B: '100', grade: 'Teaching', designation: 'Professor' },
            expected: 100
        },
        {
            name: 'ROUND function',
            formula: 'ROUND(basic * 0.1237, 2)',
            context: { basic: 50000 },
            expected: 6185
        },
        {
            name: 'MIN function',
            formula: 'MIN(basic * 0.5, 50000)',
            context: { basic: 120000 },
            expected: 50000
        },
        {
            name: 'SWITCH function',
            formula: 'SWITCH(designation, "MGR", 5000, "DIR", 10000, 2000)',
            context: { designation: 'MGR' },
            expected: 5000
        },
        {
            name: 'Multiple logical operators',
            formula: '(designation === "Manager" || designation === "Director") && experience > 5 ? basic * 0.2 : basic * 0.1',
            context: { designation: 'Manager', experience: 7, basic: 50000 },
            expected: 10000
        },
        {
            name: 'String methods',
            formula: 'department === "IT" ? 5000 : 3000',
            context: { department: 'IT' },
            expected: 5000
        },
        {
            name: 'Mathematical operations',
            formula: '(basic + hra + da) * 0.12',
            context: { basic: 50000, hra: 10000, da: 5000 },
            expected: 7800
        },
        {
            name: 'parseFloat with condition',
            formula: 'parseFloat(basic) > 0 ? (basic * 0.12) + 500 : 0',
            context: { basic: '50000' },
            expected: 6500
        }
    ];

    testCases.forEach((test, index) => {
        console.log(`Test ${index + 1}: ${test.name}`);
        console.log(`Formula: ${test.formula}`);
        console.log(`Context:`, JSON.stringify(test.context));
        
        try {
            // Validate first
            const validation = evaluator.validateFormula(test.formula);
            if (!validation.valid) {
                console.log(`Validation FAILED: ${validation.error}\n`);
                return;
            }
            
            // Evaluate
            const result = evaluator.evaluate(test.formula, test.context);
            const passed = test.expected === undefined || Math.abs(result - test.expected) < 0.01;
            
            console.log(`Expected: ${test.expected}`);
            console.log(`Got: ${result}`);
            console.log(`Status: ${passed ? '✓ PASSED' : '✗ FAILED'}\n`);
        } catch (error) {
            console.log(`Error: ${error.message}\n`);
        }
    });

    // Test formula help
    console.log('\n=== Formula Help ===');
    const help = evaluator.getFormulaHelp();
    console.log(JSON.stringify(help, null, 2));
}