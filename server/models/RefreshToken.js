const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      token: { type: DataTypes.STRING, allowNull: false, unique: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "refresh_tokens",
      indexes: [{ fields: ["token"] }, { fields: ["userId"] }, { fields: ["expiresAt"] }],
    }
  );

  return RefreshToken;
};
