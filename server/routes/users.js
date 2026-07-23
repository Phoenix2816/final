const express = require("express");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { paginate } = require("sequelize-paginate");
const { User, UserAttribute, Project, Attribute, RecentAttribute } = require("../models");
const { authRequired, requireRoles } = require("../middleware/auth");
const { parseListQuery, buildFullTextWhere, paginatedResult } = require("../services/queryHelpers");

paginate(User);

const router = express.Router();

router.get("/", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search } = parseListQuery(req.query);
    const allowedSort = ["id", "email", "firstName", "lastName", "createdAt", "updatedAt", "lastLoginAt", "isBlocked"];
    const orderField = allowedSort.includes(sortBy) ? sortBy : "updatedAt";

    const where = {
      ...buildFullTextWhere(["email", "firstName", "lastName", "phone", "location"], search),
    };
    if (req.query.blocked === "true") where.isBlocked = true;
    if (req.query.blocked === "false") where.isBlocked = false;
    if (req.query.role) {
      where.roles = { [Op.like]: `%"${req.query.role}"%` };
    }

    const { docs, total } = await User.paginate({
      where,
      order: [[orderField, sortDir]],
      page,
      paginate: pageSize,
    });

    res.json(
      paginatedResult(
        docs.map((u) => u.toSafeJSON()),
        total,
        page,
        pageSize
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/:id/profile", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isSelf = req.user.id === id;
    const isAdmin = req.user.hasRole("admin");
    if (!isSelf && !isAdmin && !req.user.hasRole("recruiter")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const attributes = await UserAttribute.findAll({
      where: { userId: id },
      include: [{ model: Attribute, as: "attribute" }],
    });
    const projects = await Project.findAll({
      where: { userId: id },
      order: [["updatedAt", "DESC"]],
    });

    res.json({
      user: user.toSafeJSON(),
      attributes,
      projects,
      skills: user.skills || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/:id/profile", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isSelf = req.user.id === id;
    const isAdmin = req.user.hasRole("admin");
    if (!isSelf && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { version, firstName, lastName, phone, location, photo, email } = req.body;
    if (version != null && Number(version) !== Number(user.version)) {
      return res.status(409).json({
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        current: user.toSafeJSON(),
      });
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (photo !== undefined) user.photo = photo;
    if (email !== undefined && isAdmin) user.email = email;

    user.version = (user.version || 1) + 1;
    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/:id/attributes", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.user.id !== id && !req.user.hasRole("admin")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { attributes } = req.body;
    if (!Array.isArray(attributes)) {
      return res.status(400).json({ error: "attributes array required" });
    }

    const results = [];
    for (const item of attributes) {
      if (item._delete) {
        await UserAttribute.destroy({
          where: { userId: id, attributeId: item.attributeId },
        });
        continue;
      }

      let ua = await UserAttribute.findOne({
        where: { userId: id, attributeId: item.attributeId },
      });

      if (ua) {
        if (item.version != null && Number(item.version) !== Number(ua.version)) {
          return res.status(409).json({
            error: "Version conflict",
            code: "VERSION_CONFLICT",
            attributeId: item.attributeId,
            current: ua,
          });
        }
        ua.value = item.value;
        ua.version = (ua.version || 1) + 1;
        await ua.save();
      } else {
        ua = await UserAttribute.create({
          userId: id,
          attributeId: item.attributeId,
          value: item.value,
          version: 1,
        });
      }

      await RecentAttribute.upsert({
        userId: req.user.id,
        attributeId: item.attributeId,
        usedAt: new Date(),
      });

      results.push(ua);
    }

    const all = await UserAttribute.findAll({
      where: { userId: id },
      include: [{ model: Attribute, as: "attribute" }],
    });
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update attributes" });
  }
});

router.post("/:id/block", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    user.isBlocked = true;
    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.post("/:id/unblock", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    user.isBlocked = false;
    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

router.post("/bulk/block", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "ids required" });
    }
    await User.update({ isBlocked: true }, { where: { id: { [Op.in]: ids } } });
    res.json({ message: "Blocked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to block users" });
  }
});

router.post("/bulk/unblock", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "ids required" });
    }
    await User.update({ isBlocked: false }, { where: { id: { [Op.in]: ids } } });
    res.json({ message: "Unblocked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unblock users" });
  }
});

router.delete("/bulk", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    const filtered = (ids || []).filter((id) => Number(id) !== req.user.id);
    await User.destroy({ where: { id: { [Op.in]: filtered } } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete users" });
  }
});

router.put("/:id/roles", authRequired, requireRoles("admin"), async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const { roles } = req.body;
  if (!Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ error: "roles required" });
  }
  user.roles = roles;
  await user.save();
  res.json(user.toSafeJSON());
});

router.get("/:id/skills", authRequired, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user.skills || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
});

router.post("/:id/skills", authRequired, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const { skill } = req.body;
    const skills = Array.isArray(user.skills) ? [...user.skills] : [];
    if (!skills.includes(skill)) {
      skills.push(skill);
    }
    user.skills = skills;
    await user.save();
    res.json(user.skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add skill" });
  }
});

router.delete("/:id/skills/:skill", authRequired, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const skill = decodeURIComponent(req.params.skill);
    user.skills = (user.skills || []).filter((s) => s !== skill);
    await user.save();
    res.json(user.skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove skill" });
  }
});

router.post("/", authRequired, requireRoles("admin"), async (req, res) => {
  try {
    const { email, password, firstName, lastName, roles } = req.body;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const user = await User.create({
      email,
      passwordHash,
      firstName: firstName || "",
      lastName: lastName || "",
      roles: roles || ["candidate"],
    });
    res.status(201).json(user.toSafeJSON());
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.post("/me/role", authRequired, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== "candidate" && role !== "recruiter") {
      return res.status(400).json({ error: "Role must be candidate or recruiter" });
    }
    if ((req.user.roles || []).length > 0) {
      return res.status(400).json({ error: "Role already set" });
    }
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.roles = [role];
    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set role" });
  }
});

module.exports = router;