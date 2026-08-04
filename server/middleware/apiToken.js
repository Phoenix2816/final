const { ApiToken } = require("../models");

function getToken(req) {
  const header = req.headers["authorization"];
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  if (req.headers["x-api-token"]) return req.headers["x-api-token"];
  if (req.query && req.query.token) return req.query.token;
  return null;
}

async function apiTokenRequired(req, res, next) {
  try {
    const rawToken = getToken(req);
    if (!rawToken) return res.status(401).json({ error: "API token required" });

    const hash = ApiToken.hashToken(rawToken);
    const record = await ApiToken.findOne({
      where: { tokenHash: hash, isActive: true },
      include: [{ model: require("../models").Position, as: "position", attributes: ["id", "title", "company", "level", "visibility"] }],
    });

    if (!record) return res.status(401).json({ error: "Invalid or inactive API token" });
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return res.status(401).json({ error: "API token expired" });
    }

    record.lastUsedAt = new Date();
    await record.save();
    req.apiToken = record;
    req.position = record.position;
    next();
  } catch (err) {
    console.error("apiToken auth error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { apiTokenRequired, getToken };
