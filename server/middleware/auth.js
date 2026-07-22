const jwt = require("jsonwebtoken");
const { User, RefreshToken } = require("../models");

function getToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  if (req.query && req.query.token) return req.query.token;
  return null;
}

async function authRequired(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.isBlocked) return res.status(403).json({ error: "User blocked" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET || "dev-secret", async (err, decoded) => {
    if (err || !decoded) return next();
    try {
      const user = await User.findByPk(decoded.id);
      if (user && !user.isBlocked) req.user = user;
    } catch {
      /* ignore */
    }
    next();
  });
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userRoles = req.user.roles || [];
    if (userRoles.includes("admin") || roles.some((r) => userRoles.includes(r))) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden" });
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "15m" }
  );
}

async function generateRefreshToken(user) {
  const token = require("crypto").randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user.id,
    token,
    expiresAt,
  });
  return token;
}

async function refreshAccessToken(refreshToken) {
  const record = await RefreshToken.findOne({ where: { token: refreshToken } });
  if (!record || record.revoked || record.expiresAt < new Date()) {
    return null;
  }
  const user = await User.findByPk(record.userId);
  if (!user || user.isBlocked) {
    return null;
  }
  const accessToken = signToken(user);
  const newRefreshToken = await generateRefreshToken(user);
  await record.update({ revoked: true });
  return { accessToken, refreshToken: newRefreshToken };
}

async function revokeRefreshTokens(userId) {
  await RefreshToken.update({ revoked: true }, { where: { userId } });
}

module.exports = {
  authRequired,
  optionalAuth,
  requireRoles,
  signToken,
  getToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshTokens,
};