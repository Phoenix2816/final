const express = require("express");
const { Op } = require("sequelize");
const { paginate } = require("sequelize-paginate");
const { Attribute, RecentAttribute, UserAttribute, Project, Position, User } = require("../models");
const { authRequired, requireRoles } = require("../middleware/auth");
const { parseListQuery, buildFullTextWhere, paginatedResult } = require("../services/queryHelpers");

paginate(Attribute);

const router = express.Router();

async function computeUsage(attr) {
  const uaCount = await UserAttribute.count({ where: { attributeId: attr.id } });
  const nameJson = JSON.stringify(attr.name);
  const userCount = await Attribute.sequelize.query(
    "SELECT COUNT(*) as count FROM users WHERE JSON_CONTAINS(skills, :name, '$')",
    { replacements: { name: nameJson }, type: "SELECT" }
  ).then((r) => r[0]?.count || 0).catch(() => 0);
  const projCount = await Project.count({
    where: { tags: { [Op.like]: `%${attr.name}%` } },
  }).catch(() => 0);
  const posCount = await Position.count({
    where: { projectTags: { [Op.like]: `%${attr.name}%` } },
  }).catch(() => 0);

  return {
    profiles: Number(uaCount) || 0,
    projects: Number(projCount) || 0,
    positions: Number(posCount) || 0,
    total: (Number(uaCount) || 0) + (Number(userCount) || 0) + (Number(projCount) || 0) + (Number(posCount) || 0),
  };
}

router.get("/", authRequired, async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search } = parseListQuery(req.query);
    const allowed = ["id", "name", "category", "type", "kind", "createdAt", "updatedAt", "usageCount"];
    const orderField = allowed.includes(sortBy) ? sortBy : "name";

    const where = {
      ...buildFullTextWhere(["name", "category", "description"], search),
    };
    if (req.query.category) where.category = req.query.category;
    if (req.query.type) where.type = req.query.type;
    if (req.query.kind) where.kind = req.query.kind;

    const { docs, total } = await Attribute.paginate({
      where,
      order: [[orderField, sortDir]],
      page,
      paginate: pageSize,
    });

    const includeUsage = req.query.includeUsage === "true";
    let data = docs.map((a) => a.toJSON());
    if (includeUsage) {
      const usages = await Promise.all(docs.map((a) => computeUsage(a)));
      data = data.map((a, idx) => ({ ...a, usage: usages[idx] }));
    }

    res.json(paginatedResult(data, total, page, pageSize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attributes" });
  }
});

router.get("/technologies", authRequired, async (req, res) => {
  try {
    const { search, category, pageSize = 100 } = req.query;
    const where = { kind: "technology" };
    if (category) where.category = category;
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    const techs = await Attribute.findAll({
      where,
      order: [["name", "ASC"]],
      limit: Number(pageSize) || 100,
    });
    res.json(techs.map((t) => t.toJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch technologies" });
  }
});

router.get("/categories", authRequired, async (_req, res) => {
  const rows = await Attribute.findAll({
    attributes: ["category"],
    group: ["category"],
    order: [["category", "ASC"]],
  });
  res.json(rows.map((r) => r.category));
});

router.get("/recent", authRequired, async (req, res) => {
  const recent = await RecentAttribute.findAll({
    where: { userId: req.user.id },
    include: [{ model: Attribute, as: "attribute" }],
    order: [["usedAt", "DESC"]],
    limit: 10,
  });
  res.json(recent.map((r) => r.attribute).filter(Boolean));
});

router.get("/:id", authRequired, async (req, res) => {
  const attr = await Attribute.findByPk(req.params.id);
  if (!attr) return res.status(404).json({ error: "Not found" });
  res.json(attr);
});

router.post("/", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  try {
    const { category, name, description, type, kind, options } = req.body;
    if (!category || !name || !type) {
      return res.status(400).json({ error: "category, name, type required" });
    }
    const normalizedKind = kind === "technology" ? "technology" : "attribute";
    const normalizedName = name.trim();
    const existing = await Attribute.findOne({
      where: { name: { [Op.like]: normalizedName }, kind: normalizedKind },
    });
    if (existing) {
      return res.status(409).json({ error: "Attribute with this name already exists", id: existing.id });
    }
    const attr = await Attribute.create({
      category,
      name: normalizedName,
      description: description || "",
      type,
      kind: normalizedKind,
      options: options || [],
      createdById: req.user.id,
    });
    res.status(201).json(attr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create attribute" });
  }
});

router.put("/:id", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  const attr = await Attribute.findByPk(req.params.id);
  if (!attr) return res.status(404).json({ error: "Not found" });
  const { category, name, description, type, kind, options } = req.body;
  if (category !== undefined) attr.category = category;
  if (name !== undefined) {
    const normalizedName = name.trim();
    const duplicate = await Attribute.findOne({
      where: { name: { [Op.like]: normalizedName }, kind: kind || attr.kind, id: { [Op.ne]: attr.id } },
    });
    if (duplicate) {
      return res.status(409).json({ error: "Attribute with this name already exists" });
    }
    attr.name = normalizedName;
  }
  if (description !== undefined) attr.description = description;
  if (type !== undefined) attr.type = type;
  if (kind !== undefined) attr.kind = kind === "technology" ? "technology" : "attribute";
  if (options !== undefined) attr.options = options;
  await attr.save();
  res.json(attr);
});

router.delete("/", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  const { ids } = req.body;
  await Attribute.destroy({ where: { id: { [Op.in]: ids || [] } } });
  res.json({ message: "Deleted" });
});

router.delete("/:id", authRequired, requireRoles("recruiter", "admin"), async (req, res) => {
  await Attribute.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
});

router.get("/technologies", authRequired, async (req, res) => {
  try {
    const { search, category, pageSize = 50 } = req.query;
    const where = { kind: "technology" };
    if (category) where.category = category;
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    const techs = await Attribute.findAll({
      where,
      order: [["name", "ASC"]],
      limit: Number(pageSize) || 50,
    });
    res.json(techs.map((t) => t.toJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch technologies" });
  }
});

router.get("/technologies/library", authRequired, async (req, res) => {
  try {
    const techs = await Attribute.findAll({
      where: { kind: "technology" },
      order: [["name", "ASC"]],
    });

    const categories = {};
    const flat = [];
    for (const t of techs) {
      const cat = t.category || "Other";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(t.name);
      flat.push(t.name);
    }

    const recent = [];
    if (req.user?.id) {
      const user = await User.findByPk(req.user.id);
      if (user?.skills) {
        try {
          const skills = typeof user.skills === "string" ? JSON.parse(user.skills) : user.skills;
          for (const s of skills) {
            if (!recent.includes(s)) recent.push(s);
          }
        } catch {
          /* ignore */
        }
      }
    }

    const popular = flat.slice(0, 30);

    res.json({ categories, flat, popular, recent, counts: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch technology library" });
  }
});

module.exports = router;