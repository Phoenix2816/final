const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Position",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      shortDescription: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
      company: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
      level: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "mid",
      },
      visibility: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "public",
      },
      attributeTemplate: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("attributeTemplate");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("attributeTemplate", JSON.stringify(val || []));
        },
      },
      accessRules: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("accessRules");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("accessRules", JSON.stringify(val || []));
        },
      },
      projectTags: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("projectTags");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("projectTags", JSON.stringify(val || []));
        },
      },
      maxProjects: { type: DataTypes.INTEGER, defaultValue: 5 },
      viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
      version: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: "positions",
      indexes: [
        { fields: ["title"] },
        { fields: ["company"] },
        { type: "FULLTEXT", name: "position_ft", fields: ["title", "company", "shortDescription", "level"] },
      ],
    }
  );
};