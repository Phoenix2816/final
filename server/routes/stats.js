const express = require("express");
const { Op } = require("sequelize");
const { User, Position, CV, CVLike, Project } = require("../models");
const { authRequired, optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/dashboard", optionalAuth, async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [positions, candidates, recruiters, publishedCVs, cvsLast24h, allProjects] =
      await Promise.all([
        Position.count(),
        User.count({ where: { roles: { [Op.like]: '%"candidate"%' } } }),
        User.count({ where: { roles: { [Op.like]: '%"recruiter"%' } } }),
        CV.count({ where: { status: "published" } }),
        CV.count({ where: { createdAt: { [Op.gte]: since } } }),
        Project.findAll({ attributes: ["tags"], limit: 1000 }),
      ]);

    const tagCounts = {};
    allProjects.forEach((p) => {
      (p.tags || []).forEach((t) => {
        const key = String(t);
        tagCounts[key] = (tagCounts[key] || 0) + 1;
      });
    });

    const tagCloud = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);

    const [latest, popular] = await Promise.all([
      Position.findAll({ order: [["createdAt", "DESC"]], limit: 6 }),
      Position.findAll({ order: [["viewCount", "DESC"]], limit: 6 }),
    ]);

    res.json({
      stats: {
        positions,
        candidates,
        recruiters,
        publishedCVs,
        cvsLast24h,
      },
      latest,
      popular,
      tagCloud,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.get("/search", authRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ positions: [], cvs: [], users: [] });

    const like = { [Op.like]: `%${q}%` };
    const isStaff = req.user.hasRole("admin") || req.user.hasRole("recruiter");

    const positions = await Position.findAll({
      where: {
        [Op.or]: [
          { title: like },
          { company: like },
          { shortDescription: like },
        ],
      },
      limit: 12,
    });

    const positionIds = positions.map((p) => p.id);
    const cvCounts = positionIds.length
      ? await CV.findAll({
          where: { positionId: { [Op.in]: positionIds } },
          attributes: [
            "positionId",
            [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
          ],
          group: ["positionId"],
          raw: true,
        })
      : [];
    const cvCountMap = {};
    cvCounts.forEach((row) => {
      cvCountMap[row.positionId] = Number(row.count);
    });

    const cvWhere = isStaff ? { status: "published" } : { userId: req.user.id };
    const cvs = await CV.findAll({
      where: cvWhere,
      include: [
        { model: Position, as: "position", attributes: ["id", "title", "company"] },
        {
          model: User,
          as: "candidate",
          attributes: ["id", "firstName", "lastName", "email", "photo"],
          where: {
            [Op.or]: [
              { firstName: like },
              { lastName: like },
              { email: like },
            ],
          },
        },
      ],
      limit: 12,
    });

    const likedIds = new Set();
    if (isStaff && cvs.length) {
      const likes = await CVLike.findAll({
        where: { recruiterId: req.user.id, cvId: { [Op.in]: cvs.map((c) => c.id) } },
      });
      likes.forEach((l) => likedIds.add(l.cvId));
    }

    const users = isStaff
      ? await User.findAll({
          where: {
            [Op.or]: [{ firstName: like }, { lastName: like }, { email: like }],
          },
          limit: 12,
        })
      : [];

    res.json({
      positions: positions.map((p) => ({
        ...p.toJSON(),
        cvCount: cvCountMap[p.id] || 0,
      })),
      cvs: cvs.map((c) => {
        const json = c.toJSON();
        return {
          ...json,
          likedByMe: likedIds.has(c.id),
          candidate: {
            id: json.candidate?.id,
            firstName: json.candidate?.firstName,
            lastName: json.candidate?.lastName,
            email: json.candidate?.email,
            photo: json.candidate?.photo,
          },
          positionTitle: json.position?.title,
          positionCompany: json.position?.company,
        };
      }),
      users: users.map((u) => u.toSafeJSON()),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;