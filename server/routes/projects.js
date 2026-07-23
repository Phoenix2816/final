const express = require("express");
const { Op } = require("sequelize");
const { Project, Attribute } = require("../models");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

async function getTechnologyLibrary() {
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
  return { categories, flat };
}

// Shared helper: collect global usage counts and the current user's recent tags.
async function collectTagStats(userId) {
  const projects = await Project.findAll({ attributes: ["tags", "userId"], limit: 2000 });
  const counts = new Map();
  for (const p of projects) {
    for (const t of p.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }

  let recent = [];
  if (userId) {
    const mine = await Project.findAll({
      where: { userId },
      attributes: ["tags"],
      order: [["updatedAt", "DESC"]],
      limit: 25,
    });
    const seen = new Set();
    for (const p of mine) {
      for (const t of p.tags || []) {
        if (!seen.has(t)) {
          seen.add(t);
          recent.push(t);
        }
      }
    }
  }
  return { counts, recent };
}

// Search endpoint used by the selector while typing. Returns matching
// technologies (library + any user-created tags), most popular first.
router.get("/tags", authRequired, async (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const { counts } = await collectTagStats(req.user.id);
  const { flat } = await getTechnologyLibrary();

  if (q) {
    const matches = [...counts.keys(), ...flat]
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .filter((t) => t.toLowerCase().includes(q))
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));
    return res.json(matches.slice(0, 40));
  }

  const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const suggested = flat.filter((t) => !counts.has(t));
  res.json([...used, ...suggested].slice(0, 40));
});

// Rich library endpoint powering the HH.ru-style selector: categorized library,
// popular technologies, and the current user's recently used technologies.
router.get("/tags-library", authRequired, async (req, res) => {
  const { counts, recent } = await collectTagStats(req.user.id);
  const { categories, flat } = await getTechnologyLibrary();

  const popular = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0])
    .slice(0, 30);

  res.json({
    categories,
    flat,
    popular,
    recent: recent.slice(0, 12),
    counts: Object.fromEntries(counts),
  });
});

router.put("/reorder", authRequired, async (req, res) => {
  try {
    const ids = req.body.ids || [];
    const projects = await Project.findAll({ where: { id: { [Op.in]: ids } } });
    for (const p of projects) {
      if (p.userId !== req.user.id && !req.user.hasRole("admin")) continue;
      const idx = ids.indexOf(p.id);
      if (idx >= 0) {
        p.order = idx;
        await p.save();
      }
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder projects" });
  }
});

router.get("/user/:userId", authRequired, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user.id !== userId && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const projects = await Project.findAll({
      where: { userId },
      order: [["updatedAt", "DESC"]],
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const userId = req.body.userId || req.user.id;
    if (Number(userId) !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const project = await Project.create({
      userId,
      name: req.body.name || "Untitled Project",
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      description: req.body.description || "",
      tags: req.body.tags || [],
      currentlyWorking: Boolean(req.body.currentlyWorking),
      order: req.body.order != null ? req.body.order : 0,
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });
    if (project.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.body.version != null && Number(req.body.version) !== Number(project.version)) {
      return res.status(409).json({
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        current: project,
      });
    }

    ["name", "startDate", "endDate", "description", "tags", "currentlyWorking", "order"].forEach((k) => {
      if (req.body[k] !== undefined) project[k] = req.body[k];
    });
    project.version = (project.version || 1) + 1;
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });
    if (project.userId !== req.user.id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await project.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.delete("/", authRequired, async (req, res) => {
  try {
    const { ids } = req.body;
    const projects = await Project.findAll({ where: { id: { [Op.in]: ids || [] } } });
    for (const p of projects) {
      if (p.userId !== req.user.id && !req.user.hasRole("admin")) continue;
      await p.destroy();
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete projects" });
  }
});

module.exports = router;