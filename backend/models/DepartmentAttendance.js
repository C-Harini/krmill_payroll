// ============================================================
// models/DepartmentAttendance.js
// Table: hr_department_attendance
// ============================================================

module.exports = (sequelize, DataTypes) => {
    const DepartmentAttendance = sequelize.define(
        "DepartmentAttendance",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "companies", key: "id" },
            },
            departmentId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "departments", key: "id" },
            },
            workedDeptId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: "departments", key: "id" },
            },
            employeeId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: "employees", key: "id" },
            },
            ticketNo: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            empName: {
                type: DataTypes.STRING(150),
                allowNull: true,
            },
            category: {
                type: DataTypes.STRING(50),
                allowNull: true,
                comment: "Category code/acronym e.g. O, H, Staff",
            },
            attendanceDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM(
                    "Present",
                    "Present with Permission",
                    "Absent",
                    "Half Day",
                    "Leave",
                    "Holiday",
                    "Week Off"
                ),
                allowNull: false,
                defaultValue: "Present",
            },
            shiftId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: "shift_types", key: "id" },
            },
            shiftName: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            remarks: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            createdBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            updatedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            tableName: "hr_department_attendance",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["employeeId", "attendanceDate", "shiftId"],
                    name: "unique_dept_emp_date_shift",
                },
                { fields: ["companyId"] },
                { fields: ["departmentId"] },
                { fields: ["workedDeptId"] },
                { fields: ["attendanceDate"] },
                { fields: ["status"] },
            ],
        }
    );

    DepartmentAttendance.associate = (models) => {
        DepartmentAttendance.belongsTo(models.Employee, {
            foreignKey: "employeeId",
            as: "employee",
        });
        DepartmentAttendance.belongsTo(models.Company, {
            foreignKey: "companyId",
            as: "company",
        });
        DepartmentAttendance.belongsTo(models.Department, {
            foreignKey: "departmentId",
            as: "department",
        });
        DepartmentAttendance.belongsTo(models.Department, {
            foreignKey: "workedDeptId",
            as: "workedDepartment",
        });
        DepartmentAttendance.belongsTo(models.ShiftType, {
            foreignKey: "shiftId",
            as: "shiftType",
        });
    };

    return DepartmentAttendance;
};