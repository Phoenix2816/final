const express = require("express");
const { Op } = require("sequelize");
const {
  Position,
  UserAttribute,
  Attribute,
  CV,
  CVLike,
  User,
  DiscussionMessage,
} = require("../models");
const { sequelize } = require("../models");
const { authRequired, requireRoles, optionalAuth } = require("../middleware/auth");
const { parseListQuery, buildFullTextWhere, paginatedResult } = require("../services/queryHelpers");
const {
  evaluateAccessRules,
  buildUserAttrMap,
} = require("../services/accessRules");

const router = express.Router();

async function userCanSeePosition(user, position) {
  if (!user) return position.visibility === "public" && (!position.accessRules || !position.accessRules.length);
  if (user.hasRole("admin") || user.hasRole("recruiter")) return true;
  if (position.visibility === "private") return true;

  const rules = position.accessRules || [];
  if (!rules.length) return true;

  const userAttrs = await UserAttribute.findAll({ where: { userId: user.id } });
  const attrIds = rules.map((r) => r.attributeId).filter(Boolean);
  const attrs = attrIds.length
    ? await Attribute.findAll({ where: { id: { [Op.in]: attrIds } } })
    : [];
  const meta = {};
  attrs.forEach((a) => {
    meta[a.id] = a;
  });

  const userAttrMap = buildUserAttrMap(userAttrs);
  const userSkills = user.skills || [];
  return evaluateAccessRules(userAttrMap, rules, meta, userSkills);
}

function userCanListPosition(user, position) {
  if (!user) return position.visibility === "public";
  if (user.hasRole("admin") || user.hasRole("recruiter")) return true;
  return position.visibility !== "private";
}

router.get("/", authRequired, async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search, offset } = parseListQuery(req.query);
    const allowed = ["id", "title", "company", "level", "createdAt", "updatedAt", "viewCount"];
    const orderField = allowed.includes(sortBy) ? sortBy : "updatedAt";

    const where = {
      ...buildFullTextWhere(["title", "company", "shortDescription", "level"], search),
    };
    if (req.query.level) where.level = req.query.level;
    if (req.query.company) where.company = { [Op.like]: `%${req.query.company}%` };

    const isStaff = req.user.hasRole("admin") || req.user.hasRole("recruiter");

    let rows;
    let count;

    const decorate = async (position) => {
      const plain = position.toJSON ? position.toJSON() : position;
      const [publishedAgg, totalAgg] = await Promise.all([
        CV.findOne({
          where: { positionId: plain.id, status: "published" },
          attributes: [
            [sequelize.fn("COUNT", sequelize.col("id")), "candidateCount"],
            [sequelize.fn("SUM", sequelize.col("likesCount")), "totalLikes"],
          ],
          raw: true,
        }),
        CV.findOne({
          where: { positionId: plain.id },
          attributes: [[sequelize.fn("COUNT", sequelize.col("id")), "cvCount"]],
          raw: true,
        }),
      ]);
      return {
        ...plain,
        candidateCount: Number(publishedAgg?.candidateCount || 0),
        totalLikes: Number(publishedAgg?.totalLikes || 0),
        cvCount: Number(totalAgg?.cvCount || 0),
      };
    };

    if (isStaff) {
      ({ rows, count } = await Position.findAndCountAll({
        where,
        order: [[orderField, sortDir]],
        limit: pageSize,
        offset,
      }));
    } else {
      const all = await Position.findAll({
        where,
        order: [[orderField, sortDir]],
      });
      const visible = [];
      for (const p of all) {
        if (!userCanListPosition(req.user, p)) continue;
        if (await userCanSeePosition(req.user, p)) visible.push(p);
      }
      count = visible.length;
      rows = visible.slice(offset, offset + pageSize);
    }

    const decorated = await Promise.all(rows.map(decorate));
    res.json(paginatedResult(decorated, count, page, pageSize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

router.get("/popular", optionalAuth, async (req, res) => {
  const where = req.user?.hasRole("admin") || req.user?.hasRole("recruiter") ? {} : { visibility: "public" };
  const positions = await Position.findAll({
    order: [["viewCount", "DESC"], ["updatedAt", "DESC"]],
    limit: 8,
  });
  res.json(positions);
});

router.get("/latest", optionalAuth, async (req, res) => {
  const where = req.user?.hasRole("admin") || req.user?.hasRole("recruiter") ? {} : { visibility: "public" };
  const positions = await Position.findAll({
    order: [["createdAt", "DESC"]],
    limit: 8,
  });
  res.json(positions);
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const position = await Position.findByPk(req.params.id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    if (!position) return res.status(404).json({ error: "Not found" });

    if (!(await userCanSeePosition(req.user, position))) {
      return res.status(403).json({ error: "Access denied by position rules" });
    }

    position.viewCount = (position.viewCount || 0) + 1;
    await position.save();

    const templateIds = position.attributeTemplate || [];
    const attributes = templateIds.length
      ? await Attribute.findAll({ where: { id: { [Op.in]: templateIds } } })
      : [];

    const ruleAttrIds = (position.accessRules || []).map((r) => r.attributeId).filter(Boolean);
    const ruleAttrs = ruleAttrIds.length
      ? await Attribute.findAll({ where: { id: { [Op.in]: ruleAttrIds } } })
      : [];

    const messageCount = await DiscussionMessage.count({
      where: { positionId: position.id },
    });

    res.json({
      position,
      templateAttributes: attributes,
      ruleAttributes: ruleAttrs,
      messageCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load position" });
  }
});

router.post("/", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const position = await Position.create({
      title: req.body.title || "Untitled Position",
      shortDescription: req.body.shortDescription || "",
      company: req.body.company || "",
      level: req.body.level || "mid",
      visibility: req.body.visibility || "public",
      attributeTemplate: req.body.attributeTemplate || [],
      accessRules: req.body.accessRules || [],
      projectTags: req.body.projectTags || [],
      maxProjects: req.body.maxProjects ?? 5,
      createdById: req.user.id,
    });
    res.status(201).json(position);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create position" });
  }
});

router.post("/:id/duplicate", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  const source = await Position.findByPk(req.params.id);
  if (!source) return res.status(404).json({ error: "Not found" });
  const copy = await Position.create({
    title: `${source.title} (Copy)`,
    shortDescription: source.shortDescription,
    company: source.company,
    level: source.level,
    visibility: source.visibility,
    attributeTemplate: source.attributeTemplate,
    accessRules: source.accessRules,
    projectTags: source.projectTags,
    maxProjects: source.maxProjects,
    createdById: req.user.id,
  });
  res.status(201).json(copy);
});

router.put("/:id", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const position = await Position.findByPk(req.params.id);
    if (!position) return res.status(404).json({ error: "Not found" });

    if (req.body.version != null && Number(req.body.version) !== Number(position.version)) {
      return res.status(409).json({
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        current: position,
      });
    }

    [
      "title",
      "shortDescription",
      "company",
      "level",
      "visibility",
      "attributeTemplate",
      "accessRules",
      "projectTags",
      "maxProjects",
    ].forEach((k) => {
      if (req.body[k] !== undefined) position[k] = req.body[k];
    });
    position.version = (position.version || 1) + 1;
    await position.save();
    res.json(position);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update position" });
  }
});

router.delete("/", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    await Position.destroy({ where: { id: { [Op.in]: ids || [] } } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete positions" });
  }
});

router.delete("/:id", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    await Position.destroy({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete position" });
  }
});

router.get("/:id/messages", authRequired, async (req, res) => {
  try {
    const canSee = await Position.findByPk(req.params.id);
    if (!canSee) return res.status(404).json({ error: "Not found" });
    if (!(await userCanSeePosition(req.user, canSee))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const since = req.query.since ? new Date(req.query.since) : null;
    const where = { positionId: req.params.id };
    if (since && !Number.isNaN(since.getTime())) {
      where.createdAt = { [Op.gt]: since };
    }

    const messages = await DiscussionMessage.findAll({
      where,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "photo", "email"],
        },
      ],
      order: [["createdAt", "ASC"]],
      limit: 200,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:id/messages", authRequired, async (req, res) => {
  try {
    const position = await Position.findByPk(req.params.id);
    if (!position) return res.status(404).json({ error: "Not found" });
    if (!(await userCanSeePosition(req.user, position))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!req.body.content || !String(req.body.content).trim()) {
      return res.status(400).json({ error: "Content required" });
    }

    const message = await DiscussionMessage.create({
      positionId: position.id,
      userId: req.user.id,
      content: req.body.content,
    });

    const full = await DiscussionMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "photo", "email"],
        },
      ],
    });

    const io = req.app.get("io");
    if (io) io.to(`position:${position.id}`).emit("discussion:message", full);

    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post message" });
  }
});

router.get("/:id/cvs", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search, offset } = parseListQuery(req.query);
    const where = {
      positionId: req.params.id,
      status: "published",
    };

    const { rows, count } = await CV.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "candidate",
          attributes: ["id", "firstName", "lastName", "email", "photo"],
          where: search
            ? {
                [Op.or]: [
                  { firstName: { [Op.like]: `%${search}%` } },
                  { lastName: { [Op.like]: `%${search}%` } },
                  { email: { [Op.like]: `%${search}%` } },
                ],
              }
            : undefined,
        },
      ],
      order: [[sortBy === "likesCount" ? "likesCount" : "updatedAt", sortDir]],
      limit: pageSize,
      offset,
    });

    const likes = await CVLike.findAll({
      where: {
        recruiterId: req.user.id,
        cvId: { [Op.in]: rows.map((r) => r.id) },
      },
    });
    const likedIds = new Set(likes.map((l) => l.cvId));

    res.json(
      paginatedResult(
        rows.map((r) => ({
          ...r.toJSON(),
          likedByMe: likedIds.has(r.id),
        })),
        count,
        page,
        pageSize
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch position CVs" });
  }
});

module.exports = router;
module.exports.userCanSeePosition = userCanSeePosition;