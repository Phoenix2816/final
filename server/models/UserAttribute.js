const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "UserAttribute",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      attributeId: { type: DataTypes.INTEGER, allowNull: false },
      value: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("value");
          if (raw == null) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        },
        set(val) {
          this.setDataValue(
            "value",
            val === undefined ? null : JSON.stringify(val)
          );
        },
      },
      version: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: "user_attributes",
      indexes: [{ unique: true, fields: ["userId", "attributeId"] }],
    }
  );
};