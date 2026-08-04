const express = require("express");
const { Op } = require("sequelize");
const { Position, ApiToken, User } = require("../models");
const { authRequired, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const isStaff = req.user.hasRole("admin") || req.user.hasRole("recruiter");
    if (!isStaff) return res.status(403).json({ error: "Forbidden" });

    const where = {};
    if (req.query.positionId) {
      where.positionId = Number(req.query.positionId);
    } else if (!req.user.hasRole("admin")) {
      where.createdById = req.user.id;
    }

    const tokens = await ApiToken.findAll({
      where,
      include: [
        { model: Position, as: "position", attributes: ["id", "title", "company"] },
        { model: User, as: "creator", attributes: ["id", "firstName", "lastName", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(
      tokens.map((t) => ({
        id: t.id,
        name: t.name,
        isActive: t.isActive,
        positionId: t.positionId,
        position: t.position,
        createdById: t.createdById,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        lastUsedAt: t.lastUsedAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

router.post("/", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const { positionId, name, expiresInDays } = req.body;
    if (!positionId) return res.status(400).json({ error: "positionId required" });

    const position = await Position.findByPk(Number(positionId));
    if (!position) return res.status(404).json({ error: "Position not found" });

    if (position.createdById !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "You can only generate tokens for your own positions" });
    }

    const rawToken = ApiToken.generateRawToken();
    const expiresAt =
      expiresInDays && Number(expiresInDays) > 0
        ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
        : null;

    const record = await ApiToken.create({
      tokenHash: ApiToken.hashToken(rawToken),
      name: name || "API Token",
      positionId: position.id,
      createdById: req.user.id,
      expiresAt,
    });

    res.status(201).json({
      id: record.id,
      token: rawToken,
      name: record.name,
      positionId: record.positionId,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create token" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const token = await ApiToken.findByPk(req.params.id);
    if (!token) return res.status(404).json({ error: "Not found" });

    if (token.createdById !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await token.destroy();
    res.json({ message: "Token revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke token" });
  }
});

router.post("/:id/revoke", authRequired, async (req, res) => {
  try {
    const token = await ApiToken.findByPk(req.params.id);
    if (!token) return res.status(404).json({ error: "Not found" });

    if (token.createdById !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    token.isActive = false;
    await token.save();
    res.json({ message: "Token revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke token" });
  }
});

module.exports = router;
