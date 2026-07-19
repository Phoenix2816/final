const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "CVLike",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      cvId: { type: DataTypes.INTEGER, allowNull: false },
      recruiterId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "cv_likes",
      indexes: [{ unique: true, fields: ["cvId", "recruiterId"] }],
    }
  );
};