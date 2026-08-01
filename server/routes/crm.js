const express = require("express");
const { authRequired } = require("../middleware/auth");
const { syncUserToSalesforce } = require("../services/salesforce");

const router = express.Router();

router.get("/sync", (req, res) => {
  res.json({ ok: true, endpoint: "/api/crm/sync" });
});

router.post("/sync", authRequired, async (req, res) => {
  try {
    const isSelf = req.user.id === Number(req.body.userId);
    const isAdmin = req.user.hasRole("admin");
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userId = isSelf ? req.user.id : Number(req.body.userId);
    const extra = {
      company: req.body.company,
      jobTitle: req.body.jobTitle,
      description: req.body.description,
    };

    const result = await syncUserToSalesforce(userId, extra);
    res.json({ message: "Synced to Salesforce", data: result });
  } catch (err) {
    console.error("Salesforce sync failed:", err);
    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    if (err.salesforceError === "invalid_grant") {
      const message = err.message || "Salesforce authentication failed. Check Connected App settings.";
      return res.status(400).json({ error: message, detail: err.message, raw: err.salesforceRaw });
    }
    const status = err.response?.status || 502;
    const payload =
      status < 500
        ? err.response?.data
        : { error: err.message || "Salesforce sync failed" };
    res.status(status).json(payload);
  }
});

module.exports = router;
