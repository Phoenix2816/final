const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PasswordReset = sequelize.define(
    "PasswordReset",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      token: { type: DataTypes.STRING, allowNull: false, unique: true },
      newPasswordHash: { type: DataTypes.STRING, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      used: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "password_resets",
      indexes: [{ fields: ["token"] }, { fields: ["userId"] }, { fields: ["expiresAt"] }],
    }
  );

  return PasswordReset;
};
