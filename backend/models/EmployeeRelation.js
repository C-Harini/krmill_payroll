module.exports = (sequelize, DataTypes) => {
  const EmployeeRelation = sequelize.define('EmployeeRelation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    relation: {
      type: DataTypes.ENUM(
        'Father',
        'Mother',
        'Spouse',
        'Son',
        'Daughter',
        'Brother',
        'Sister',
        'Other'
      ),
      allowNull: false,
    },

    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
  }, {
    tableName: 'employee_relations',
    timestamps: true,
  });

  EmployeeRelation.associate = function(models) {
    EmployeeRelation.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
    });
  };

  return EmployeeRelation;
};
