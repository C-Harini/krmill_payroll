// ============================================================
// models/AttendanceLock.js
// ============================================================

module.exports = (sequelize, DataTypes) => {
    const AttendanceLock = sequelize.define(
        "AttendanceLock",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "companies",
                    key: "id",
                },
            },
            lockDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            isLocked: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            lockedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            lockedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            unlockedBy: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            unlockedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            remarks: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: "attendance_locks",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["companyId", "lockDate"],
                },
            ],
        }
    );

    return AttendanceLock;
};
