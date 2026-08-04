const { DataTypes } = require("sequelize");
const crypto = require("crypto");

module.exports = (sequelize) => {
  const ApiToken = sequelize.define(
    "ApiToken",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tokenHash: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, defaultValue: "API Token" },
      positionId: { type: DataTypes.INTEGER, allowNull: false },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      lastUsedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "api_tokens",
      indexes: [
        { fields: ["positionId"] },
        { fields: ["createdById"] },
        { unique: true, fields: ["tokenHash"] },
      ],
    }
  );

  ApiToken.generateRawToken = function () {
    return crypto.randomBytes(32).toString("hex");
  };

  ApiToken.hashToken = function (token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  };

  ApiToken.prototype.verify = function (token) {
    const hash = ApiToken.hashToken(token);
    if (this.tokenHash && hash.length !== this.tokenHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(this.tokenHash || ""));
  };

  return ApiToken;
};
