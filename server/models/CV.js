const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "CV",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      positionId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft",
      },
      likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      selectedProjectIds: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("selectedProjectIds");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("selectedProjectIds", JSON.stringify(val || []));
        },
      },
      version: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: "cvs",
      indexes: [{ unique: true, fields: ["userId", "positionId"] }],
    }
  );
};