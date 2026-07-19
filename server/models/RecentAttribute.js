const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "RecentAttribute",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      attributeId: { type: DataTypes.INTEGER, allowNull: false },
      usedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "recent_attributes",
      indexes: [{ unique: true, fields: ["userId", "attributeId"] }],
    }
  );
};