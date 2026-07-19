const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Project",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
      tags: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("tags");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("tags", JSON.stringify(val || []));
        },
      },
      order: { type: DataTypes.INTEGER, defaultValue: 0 },
      currentlyWorking: { type: DataTypes.BOOLEAN, defaultValue: false },
      version: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    { tableName: "projects" }
  );
};