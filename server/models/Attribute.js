const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Attribute",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      category: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "string",
        validate: {
          isIn: [["string", "markdown", "number", "date", "period", "boolean", "image", "dropdown"]],
        },
      },
      kind: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "attribute",
        validate: {
          isIn: [["attribute", "technology"]],
        },
      },
      options: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("options");
          if (!raw) return [];
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("options", JSON.stringify(val || []));
        },
      },
      usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "attributes",
      indexes: [
        { fields: ["category"] },
        { fields: ["name"] },
        { fields: ["kind"] },
        { type: "FULLTEXT", name: "attribute_ft", fields: ["name", "category", "description"] },
      ],
    }
  );
};