const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: true },
      firstName: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      lastName: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
      phone: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
      location: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
      photo: { type: DataTypes.STRING, allowNull: true },
      roles: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '["candidate"]',
        get() {
          const raw = this.getDataValue("roles");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || ["candidate"];
          } catch {
            return ["candidate"];
          }
        },
        set(val) {
          this.setDataValue("roles", JSON.stringify(val || ["candidate"]));
        },
      },
      isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false },
      theme: { type: DataTypes.STRING, defaultValue: "light" },
      language: { type: DataTypes.STRING, defaultValue: "en" },
      googleId: { type: DataTypes.STRING, allowNull: true },
      githubId: { type: DataTypes.STRING, allowNull: true },
      version: { type: DataTypes.INTEGER, defaultValue: 1 },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      skills: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "[]",
        get() {
          const raw = this.getDataValue("skills");
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw || [];
          } catch {
            return [];
          }
        },
        set(val) {
          this.setDataValue("skills", JSON.stringify(val || []));
        },
      },
    },
    {
      tableName: "users",
      indexes: [
        { fields: ["email"] },
        { fields: ["firstName", "lastName"] },
        {
          type: "FULLTEXT",
          name: "user_ft",
          fields: ["email", "firstName", "lastName", "phone", "location"],
        },
      ],
    }
  );

  User.prototype.hasRole = function (role) {
    return (this.roles || []).includes(role);
  };

  User.prototype.toSafeJSON = function () {
    const json = this.toJSON();
    delete json.passwordHash;
    return json;
  };

  return User;
};