const express = require("express");
const { Op } = require("sequelize");
const { paginate } = require("sequelize-paginate");
const {
  CV,
  CVLike,
  Position,
  User,
  UserAttribute,
} = require("../models");
const { authRequired } = require("../middleware/auth");
const { parseListQuery, paginatedResult } = require("../services/queryHelpers");
const { generateCVPayload } = require("../services/cvGenerator");
const { userCanSeePosition } = require("./positions");

paginate(CV);

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search, offset } = parseListQuery(req.query);
    const isStaff = req.user.hasRole("admin") || req.user.hasRole("recruiter");

    const where = {};
    if (!isStaff || req.query.mine === "true") {
      where.userId = req.query.userId && req.user.hasRole("admin")
        ? Number(req.query.userId)
        : req.user.id;
    } else if (req.query.userId) {
      where.userId = Number(req.query.userId);
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.positionId) where.positionId = Number(req.query.positionId);
    if (isStaff && !where.userId && !where.positionId) {
      where.status = where.status || "published";
    }

    const include = [
      {
        model: Position,
        as: "position",
        attributes: ["id", "title", "company", "level"],
        where: search
          ? {
              [Op.or]: [
                { title: { [Op.like]: `%${search}%` } },
                { company: { [Op.like]: `%${search}%` } },
              ],
            }
          : undefined,
        required: !!search,
      },
      {
        model: User,
        as: "candidate",
        attributes: ["id", "firstName", "lastName", "email", "photo"],
      },
    ];

    const allowed = ["id", "status", "likesCount", "updatedAt", "createdAt"];
    const orderField = allowed.includes(sortBy) ? sortBy : "updatedAt";

    const { docs, total } = await CV.paginate({
      where,
      include,
      order: [[orderField, sortDir]],
      page,
      paginate: pageSize,
      distinct: true,
    });

    const likedIds = new Set();
    const likes = await CVLike.findAll({
      where: {
        recruiterId: req.user.id,
        cvId: { [Op.in]: docs.map((r) => r.id) },
      },
    });
    likes.forEach((l) => likedIds.add(l.cvId));

    let rows = docs.map((r) => ({
      ...r.toJSON(),
      likedByMe: likedIds.has(r.id),
      canLike: r.userId !== req.user.id && r.status === "published",
    }));

    if (!isStaff) {
      const visible = [];
      for (const row of rows) {
        const posId = row.positionId || row.position?.id;
        if (!posId) {
          visible.push(row);
          continue;
        }
        const position = await Position.findByPk(posId);
        if (!position || await userCanSeePosition(req.user, position)) {
          visible.push(row);
        }
      }
      rows = visible;
    }

    res.json(
      paginatedResult(
        rows,
        isStaff ? total : rows.length,
        page,
        pageSize
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch CVs" });
  }
});

router.post("/generate", authRequired, async (req, res) => {
  try {
    const positionId = Number(req.body.positionId);
    const userId =
      req.body.userId && req.user.hasRole("admin")
        ? Number(req.body.userId)
        : req.user.id;

    if (userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const position = await Position.findByPk(positionId);
    if (!position) return res.status(404).json({ error: "Position not found" });
    if (!(await userCanSeePosition(req.user, position)) && userId === req.user.id) {
      return res.status(403).json({ error: "Cannot access this position" });
    }

    let cv = await CV.findOne({ where: { userId, positionId } });
    if (!cv) {
      cv = await CV.create({ userId, positionId, status: "draft" });
    }

    const payload = await generateCVPayload(cv, { position });
    res.status(201).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate CV" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });

    const isOwner = cv.userId === req.user.id;
    const isStaff = req.user.hasRole("admin") || req.user.hasRole("recruiter");
    if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });
    if (!isOwner && isStaff && cv.status !== "published" && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "CV is not published" });
    }
    if (isOwner && !isStaff) {
      const position = await Position.findByPk(cv.positionId);
      if (!position || !(await userCanSeePosition(req.user, position))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const payload = await generateCVPayload(cv);
    const like = await CVLike.findOne({
      where: { cvId: cv.id, recruiterId: req.user.id },
    });
    payload.readOnly = !isOwner && !req.user.hasRole("admin");
    payload.likedByMe = Boolean(like);
    payload.canLike = !isOwner && cv.status === "published";
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load CV" });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (cv.userId === req.user.id && !req.user.hasRole("admin")) {
      const position = await Position.findByPk(cv.positionId);
      if (!position || !(await userCanSeePosition(req.user, position))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (req.body.version != null && Number(req.body.version) !== Number(cv.version)) {
      return res.status(409).json({
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        current: cv,
      });
    }

    if (req.body.selectedProjectIds !== undefined) {
      const ids = Array.isArray(req.body.selectedProjectIds)
        ? req.body.selectedProjectIds.map(Number).filter((n) => !Number.isNaN(n))
        : [];
      cv.selectedProjectIds = ids;
    }

    if (req.body.profile && typeof req.body.profile === "object") {
      const user = await User.findByPk(cv.userId);
      if (!user) return res.status(404).json({ error: "Candidate not found" });
      const p = req.body.profile;
      if (p.version != null && Number(p.version) !== Number(user.version)) {
        return res.status(409).json({
          error: "Version conflict",
          code: "VERSION_CONFLICT",
          current: user.toSafeJSON(),
        });
      }
      ["firstName", "lastName", "phone", "location", "photo"].forEach((k) => {
        if (p[k] !== undefined) user[k] = p[k];
      });
      // Only admins may change email; skip invalid/empty values
      if (p.email !== undefined && req.user.hasRole("admin") && p.email) {
        user.email = p.email;
      }
      user.version = (user.version || 1) + 1;
      await user.save();
    }

    if (Array.isArray(req.body.attributes)) {
      for (const item of req.body.attributes) {
        const attributeId = Number(item.attributeId);
        if (!attributeId || Number.isNaN(attributeId)) continue;

        let ua = await UserAttribute.findOne({
          where: { userId: cv.userId, attributeId },
        });
        if (ua) {
          if (
            item.version != null &&
            item.version !== "" &&
            Number(item.version) !== Number(ua.version)
          ) {
            return res.status(409).json({
              error: "Version conflict",
              code: "VERSION_CONFLICT",
              attributeId,
              current: ua,
            });
          }
          ua.value = item.value;
          ua.version = (ua.version || 1) + 1;
          await ua.save();
        } else {
          try {
            await UserAttribute.create({
              userId: cv.userId,
              attributeId,
              value: item.value,
            });
          } catch (createErr) {
            // Concurrent autosave may race on unique (userId, attributeId)
            if (createErr.name === "SequelizeUniqueConstraintError") {
              ua = await UserAttribute.findOne({
                where: { userId: cv.userId, attributeId },
              });
              if (ua) {
                ua.value = item.value;
                ua.version = (ua.version || 1) + 1;
                await ua.save();
              }
            } else {
              throw createErr;
            }
          }
        }
      }
    }

    cv.version = (cv.version || 1) + 1;
    await cv.save();
    await cv.reload();
    const payload = await generateCVPayload(cv);
    const isOwner = cv.userId === req.user.id;
    payload.readOnly = !isOwner && !req.user.hasRole("admin");
    const like = await CVLike.findOne({
      where: { cvId: cv.id, recruiterId: req.user.id },
    });
    payload.likedByMe = Boolean(like);
    payload.canLike = !isOwner && cv.status === "published";
    res.json(payload);
  } catch (err) {
    console.error("CV update failed:", err);
    res.status(500).json({
      error: "Failed to update CV",
      detail: err.message,
    });
  }
});

router.post("/:id/publish", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (cv.userId === req.user.id && !req.user.hasRole("admin")) {
      const position = await Position.findByPk(cv.positionId);
      if (!position || !(await userCanSeePosition(req.user, position))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const payload = await generateCVPayload(cv);
    if (!payload.complete) {
      return res.status(400).json({
        error: "CV is incomplete",
        missing: payload.fields.filter((f) => f.missing),
      });
    }

    cv.status = "published";
    cv.version = (cv.version || 1) + 1;
    await cv.save();
    res.json(await generateCVPayload(cv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish CV" });
  }
});

router.post("/:id/unpublish", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (cv.userId === req.user.id && !req.user.hasRole("admin")) {
      const position = await Position.findByPk(cv.positionId);
      if (!position || !(await userCanSeePosition(req.user, position))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    cv.status = "draft";
    cv.version = (cv.version || 1) + 1;
    await cv.save();
    res.json(await generateCVPayload(cv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unpublish CV" });
  }
});

router.post("/bulk/publish", authRequired, async (req, res) => {
  try {
    const { ids } = req.body;
    const results = [];
    for (const id of ids || []) {
      const cv = await CV.findByPk(id);
      if (!cv) continue;
      if (cv.userId !== req.user.id && !req.user.hasRole("admin")) continue;
      if (cv.userId === req.user.id && !req.user.hasRole("admin")) {
        const position = await Position.findByPk(cv.positionId);
        if (!position || !(await userCanSeePosition(req.user, position))) {
          results.push({ id, error: "forbidden" });
          continue;
        }
      }
      const payload = await generateCVPayload(cv);
      if (!payload.complete) {
        results.push({ id, error: "incomplete" });
        continue;
      }
      cv.status = "published";
      await cv.save();
      results.push({ id, status: "published" });
    }
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to bulk publish CVs" });
  }
});

router.delete("/", authRequired, async (req, res) => {
  try {
    const { ids } = req.body;
    const cvs = await CV.findAll({ where: { id: { [Op.in]: ids || [] } } });
    for (const cv of cvs) {
      if (cv.userId !== req.user.id && !req.user.hasRole("admin")) continue;
      await cv.destroy();
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete CVs" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await cv.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete CV" });
  }
});

router.post("/:id/like", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId === req.user.id) {
      return res.status(403).json({ error: "Cannot like your own CV" });
    }
    if (cv.status !== "published") {
      return res.status(400).json({ error: "Can only like published CVs" });
    }
    if (!req.user.hasRole("recruiter") && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Only recruiters and admins can like CVs" });
    }

    const existing = await CVLike.findOne({
      where: { cvId: cv.id, recruiterId: req.user.id },
    });
    if (existing) {
      return res.json({ likesCount: cv.likesCount, liked: true });
    }

    await CVLike.create({ cvId: cv.id, recruiterId: req.user.id });
    cv.likesCount = (cv.likesCount || 0) + 1;
    await cv.save();
    res.json({ likesCount: cv.likesCount, liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Like failed" });
  }
});

router.delete("/:id/like", authRequired, async (req, res) => {
  try {
    const cv = await CV.findByPk(req.params.id);
    if (!cv) return res.status(404).json({ error: "Not found" });
    if (cv.userId === req.user.id) {
      return res.status(403).json({ error: "Cannot unlike your own CV" });
    }
    if (!req.user.hasRole("recruiter") && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Only recruiters and admins can unlike CVs" });
    }

    const existing = await CVLike.findOne({
      where: { cvId: cv.id, recruiterId: req.user.id },
    });
    if (existing) {
      await existing.destroy();
      cv.likesCount = Math.max(0, (cv.likesCount || 0) - 1);
      await cv.save();
    }
    res.json({ likesCount: cv.likesCount, liked: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unlike failed" });
  }
});

module.exports = router;