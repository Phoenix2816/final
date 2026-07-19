require("dotenv").config({ path: require("path").join(__dirname, ".env") });
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const path = require("path");
const fs = require("fs");

const { sequelize } = require("./models");
const { seed } = require("./seed");
const { setupSocket } = require("./socket");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const attributeRoutes = require("./routes/attributes");
const projectRoutes = require("./routes/projects");
const positionRoutes = require("./routes/positions");
const cvRoutes = require("./routes/cvs");
const statsRoutes = require("./routes/stats");
const uploadRoutes = require("./routes/upload");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || process.env.REACT_APP_CLIENT_URL || "http://localhost:3000";
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.get("/", (_req, res) => {
  res.json({ message: "CV Management API running", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes); // compatibility with OAuth redirect URIs without /api
app.use("/api/users", userRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/cvs", cvRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);

setupSocket(server, app);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected:", sequelize.getDialect());

    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    await sequelize.sync();

    // Ensure the new Project.order column exists in already-created databases.
    try {
      const { Project } = require("./models");
      await Project.sync({ alter: true });
    } catch (err) {
      console.warn("Project.sync(alter) skipped:", err.message);
    }

    const { User } = require("./models");
    const count = await User.count();
    if (count === 0 || process.env.SEED_ON_START === "true") {
      console.log("Seeding database...");
      await seed({ force: process.env.SEED_ON_START === "true" });
    }

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

module.exports = { app, server };