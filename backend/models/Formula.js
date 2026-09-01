// const { DataTypes } = require('sequelize');

// module.exports = (sequelize, DataTypes) => {
//     const Formula = sequelize.define('Formula', {
//         id: {
//             type: DataTypes.INTEGER,
//             autoIncrement: true,
//             primaryKey: true,
//         },
//         name: {
//             type: DataTypes.STRING,
//             allowNull: false,
//             comment: 'Formula name for identification',
//         },
//         description: {
//             type: DataTypes.TEXT,
//             allowNull: true,
//             comment: 'Description of what this formula calculates',
//         },
//         formulaType: {
//             type: DataTypes.ENUM('Simple', 'Conditional', 'Complex'),
//             allowNull: false,
//             defaultValue: 'Simple',
//             comment: 'Type of formula structure',
//         },
//         formulaExpression: {
//             type: DataTypes.TEXT,
//             allowNull: false,
//             comment: 'The actual formula expression (e.g., BASIC + HRA * 0.5)',
//         },
//         formulaJson: {
//             type: DataTypes.JSON,
//             allowNull: false,
//             comment: 'JSON structure of formula for visual builder',
//             /* Example structure:
//             {
//                 "type": "expression",
//                 "operator": "+",
//                 "left": { "type": "component", "code": "BASIC" },
//                 "right": {
//                     "type": "expression",
//                     "operator": "*",
//                     "left": { "type": "component", "code": "HRA" },
//                     "right": { "type": "number", "value": 0.5 }
//                 }
//             }
//             OR for conditional:
//             {
//                 "type": "conditional",
//                 "condition": {
//                     "operator": ">",
//                     "left": { "type": "component", "code": "BASIC" },
//                     "right": { "type": "number", "value": 50000 }
//                 },
//                 "then": { ... },
//                 "else": { ... }
//             }
//             */
//         },
//         variables: {
//             type: DataTypes.JSON,
//             allowNull: true,
//             comment: 'List of component codes used in this formula',
//             /* Example: ["BASIC", "HRA", "DA"] */
//         },
//         targetComponentId: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'The salary component this formula calculates',
//             references: {
//                 model: 'salary_components',
//                 key: 'id',
//             },
//             onDelete: 'SET NULL',
//         },
//         isActive: {
//             type: DataTypes.BOOLEAN,
//             allowNull: false,
//             defaultValue: true,
//             comment: 'Whether this formula is currently active',
//         },
//         validFrom: {
//             type: DataTypes.DATE,
//             allowNull: true,
//             comment: 'Date from which this formula is valid',
//         },
//         validTo: {
//             type: DataTypes.DATE,
//             allowNull: true,
//             comment: 'Date until which this formula is valid',
//         },
//         priority: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             defaultValue: 0,
//             comment: 'Execution priority (lower number = higher priority)',
//         },
//         companyId: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             references: {
//                 model: 'companies',
//                 key: 'id',
//             },
//             onDelete: 'CASCADE',
//         },
//         createdBy: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'User ID who created this formula',
//         },
//         updatedBy: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'User ID who last updated this formula',
//         },
//     }, {
//         tableName: 'formulas',
//         timestamps: true,
//         indexes: [
//             {
//                 fields: ['companyId', 'isActive']
//             },
//             {
//                 fields: ['targetComponentId']
//             }
//         ]
//     });

//     return Formula;
// };


// const { DataTypes } = require('sequelize');

// module.exports = (sequelize, DataTypes) => {
//     const Formula = sequelize.define('Formula', {
//         id: {
//             type: DataTypes.INTEGER,
//             autoIncrement: true,
//             primaryKey: true,
//         },
//         name: {
//             type: DataTypes.STRING,
//             allowNull: false,
//             comment: 'Formula name for identification',
//         },
//         description: {
//             type: DataTypes.TEXT,
//             allowNull: true,
//             comment: 'Description of what this formula calculates',
//         },
//         formulaType: {
//             type: DataTypes.ENUM('Simple', 'Conditional', 'Complex'),
//             allowNull: false,
//             defaultValue: 'Simple',
//             comment: 'Type of formula structure',
//         },
//         formulaExpression: {
//             type: DataTypes.TEXT,
//             allowNull: false,
//             comment: 'The actual formula expression (e.g., BASIC + HRA * 0.5)',
//         },
//         formulaJson: {
//             type: DataTypes.JSON,
//             allowNull: false,
//             comment: 'JSON structure of formula for visual builder',
//             /* Example structure:
//             {
//                 "type": "expression",
//                 "operator": "+",
//                 "left": { "type": "component", "code": "BASIC" },
//                 "right": {
//                     "type": "expression",
//                     "operator": "*",
//                     "left": { "type": "component", "code": "HRA" },
//                     "right": { "type": "number", "value": 0.5 }
//                 }
//             }
//             OR for conditional:
//             {
//                 "type": "conditional",
//                 "condition": {
//                     "operator": ">",
//                     "left": { "type": "component", "code": "BASIC" },
//                     "right": { "type": "number", "value": 50000 }
//                 },
//                 "then": { ... },
//                 "else": { ... }
//             }
//             */
//         },
//         variables: {
//             type: DataTypes.JSON,
//             allowNull: true,
//             comment: 'List of component codes used in this formula',
//             /* Example: ["BASIC", "HRA", "DA"] */
//         },
//         targetComponentId: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'The salary component this formula calculates',
//             references: {
//                 model: 'salary_components',
//                 key: 'id',
//             },
//             onDelete: 'SET NULL',
//         },
//         applicableDesignations: {
//             type: DataTypes.JSON,
//             allowNull: true,
//             defaultValue: [],
//             comment: 'Array of designation IDs this formula applies to. Empty array means all designations.',
//             /* Example: [1, 3, 5] - applies to designations with IDs 1, 3, and 5
//                        [] - applies to all designations */
//         },
//         applicableEmployeeTypes: {
//             type: DataTypes.JSON,
//             allowNull: true,
//             defaultValue: [],
//             comment: 'Array of employee type IDs this formula applies to. Empty array means all employee types.',
//             /* Example: [1, 2] - applies to employee types with IDs 1 and 2
//                        [] - applies to all employee types */
//         },
//         isActive: {
//             type: DataTypes.BOOLEAN,
//             allowNull: false,
//             defaultValue: true,
//             comment: 'Whether this formula is currently active',
//         },
//         validFrom: {
//             type: DataTypes.DATE,
//             allowNull: true,
//             comment: 'Date from which this formula is valid',
//         },
//         validTo: {
//             type: DataTypes.DATE,
//             allowNull: true,
//             comment: 'Date until which this formula is valid',
//         },
//         priority: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             defaultValue: 0,
//             comment: 'Execution priority (lower number = higher priority)',
//         },
//         companyId: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             references: {
//                 model: 'companies',
//                 key: 'id',
//             },
//             onDelete: 'CASCADE',
//         },
//         createdBy: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'User ID who created this formula',
//         },
//         updatedBy: {
//             type: DataTypes.INTEGER,
//             allowNull: true,
//             comment: 'User ID who last updated this formula',
//         },
//     }, {
//         tableName: 'formulas',
//         timestamps: true,
//         indexes: [
//             {
//                 fields: ['companyId', 'isActive']
//             },
//             {
//                 fields: ['targetComponentId']
//             }
//         ]
//     });

//     Formula.associate = (models) => {
//         // Association with Company
//         Formula.belongsTo(models.Company, {
//             foreignKey: 'companyId',
//             as: 'company'
//         });
        
//         // Association with SalaryComponent (target component)
//         Formula.belongsTo(models.SalaryComponent, {
//             foreignKey: 'targetComponentId',
//             as: 'targetComponent'
//         });
//     };

//     return Formula;
// };

const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Formula = sequelize.define('Formula', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Formula name for identification',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Description of what this formula calculates',
        },
        formulaType: {
            type: DataTypes.ENUM('Simple', 'Conditional', 'Complex'),
            allowNull: false,
            defaultValue: 'Simple',
            comment: 'Type of formula structure',
        },
        formulaExpression: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'The actual formula expression (e.g., BASIC + HRA * 0.5)',
        },
        formulaJson: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'JSON structure of formula for visual builder',
            /* Example structure:
            {
                "type": "expression",
                "operator": "+",
                "left": { "type": "component", "name": "BASIC" },
                "right": {
                    "type": "expression",
                    "operator": "*",
                    "left": { "type": "component", "name": "HRA" },
                    "right": { "type": "number", "value": 0.5 }
                }
            }
            OR for conditional:
            {
                "type": "conditional",
                "condition": {
                    "operator": ">",
                    "left": { "type": "component", "name": "BASIC" },
                    "right": { "type": "number", "value": 50000 }
                },
                "then": { ... },
                "else": { ... }
            }
            */
        },
        variables: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'List of component names used in this formula',
            /* Example: ["BASIC", "HRA", "DA"] */
        },
        targetComponentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'The salary component this formula calculates',
            references: {
                model: 'salary_components',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        applicableDesignations: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            comment: 'Array of designation IDs this formula applies to. Empty array means all designations.',
            /* Example: [1, 3, 5] - applies to designations with IDs 1, 3, and 5
                       [] - applies to all designations */
        },
        applicableEmployeeTypes: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            comment: 'Array of employee type IDs this formula applies to. Empty array means all employee types.',
            /* Example: [1, 2] - applies to employee types with IDs 1 and 2
                       [] - applies to all employee types */
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether this formula is currently active',
        },
        validFrom: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Date from which this formula is valid',
        },
        validTo: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Date until which this formula is valid',
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Execution priority (lower number = higher priority)',
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID who created this formula',
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID who last updated this formula',
        },
    }, {
        tableName: 'formulas',
        timestamps: true,
        indexes: [
            {
                fields: ['companyId', 'isActive']
            },
            {
                fields: ['targetComponentId']
            }
        ]
    });

    Formula.associate = (models) => {
        // Association with Company
        Formula.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company'
        });
        
        // Association with SalaryComponent (target component)
        Formula.belongsTo(models.SalaryComponent, {
            foreignKey: 'targetComponentId',
            as: 'targetComponent'
        });
    };

    return Formula;
};