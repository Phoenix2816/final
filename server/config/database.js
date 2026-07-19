require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

function createSequelize() {
  if (process.env.DB_URI) {
    return new Sequelize(process.env.DB_URI, {
      logging: false,
      dialectOptions: process.env.DB_SSL_CA
        ? { ssl: { ca: fs.readFileSync(process.env.DB_SSL_CA) } }
        : undefined,
    });
  }

  if (process.env.DB_HOST) {
    const dialectOptions = {};
    if (process.env.DB_SSL_CA) {
      dialectOptions.ssl = { ca: fs.readFileSync(process.env.DB_SSL_CA) };
    }
    return new Sequelize(
      process.env.DB_NAME || "cvdb",
      process.env.DB_USER || "root",
      process.env.DB_PASSWORD || "",
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        dialect: "mysql",
        logging: false,
        dialectOptions,
      }
    );
  }

  const storage =
    process.env.DB_STORAGE ||
    path.join(__dirname, "..", "data", "cvdb.sqlite");

  const dir = path.dirname(storage);
  if (storage !== ":memory:" && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Sequelize({
    dialect: "sqlite",
    storage,
    logging: false,
  });
}

const sequelize = createSequelize();

module.exports = { sequelize, Sequelize };