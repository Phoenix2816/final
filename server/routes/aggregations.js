const express = require("express");
const { apiTokenRequired } = require("../middleware/apiToken");
const { computeAggregatedResults } = require("../services/aggregations");

const router = express.Router();

router.get("/aggregations", apiTokenRequired, async (req, res) => {
  try {
    const results = await computeAggregatedResults(req.position.id);
    res.json(results);
  } catch (err) {
    console.error("aggregation error:", err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Failed to compute aggregations" });
  }
});

module.exports = router;
