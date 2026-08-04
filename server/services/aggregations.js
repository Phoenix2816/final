const { Op } = require("sequelize");
const { sequelize } = require("../models");
const { Position, User, UserAttribute, Attribute, CV, CVLike } = require("../models");

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (value.from === undefined && value.to === undefined) return true;
    if (value.from === "" && value.to === "") return true;
  }
  return false;
}

function toNumber(val) {
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function labelOf(v) {
  if (typeof v === "object" && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function aggregateValues(values, type) {
  const defined = values.filter((v) => !isEmpty(v));
  const result = { count: defined.length, total: values.length };

  if (type === "number") {
    const nums = defined.map(toNumber).filter((n) => n !== null);
    if (nums.length) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result.avg = parseFloat((sum / nums.length).toFixed(2));
      result.min = Math.min(...nums);
      result.max = Math.max(...nums);
      result.median = sorted.length % 2
        ? sorted[mid]
        : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    } else {
      result.avg = null;
      result.min = null;
      result.max = null;
      result.median = null;
    }
  } else if (type === "boolean") {
    const yes = defined.filter((v) => v === true || String(v).toLowerCase() === "true").length;
    const no = defined.length - yes;
    result.trueCount = yes;
    result.falseCount = no;
    if (defined.length) {
      result.truePct = parseFloat(((yes / defined.length) * 100).toFixed(1));
      result.falsePct = parseFloat(((no / defined.length) * 100).toFixed(1));
    }
  } else if (type === "date") {
    const parsed = defined
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()))
      .map((d) => d.getTime())
      .sort((a, b) => a - b);
    if (parsed.length) {
      result.earliest = new Date(parsed[0]).toISOString().split("T")[0];
      result.latest = new Date(parsed[parsed.length - 1]).toISOString().split("T")[0];
    }
  } else if (type === "period") {
    const froms = defined
      .map((v) => (v && v.from ? new Date(v.from).getTime() : null))
      .filter((n) => n !== null)
      .sort((a, b) => a - b);
    const tos = defined
      .map((v) => (v && v.to ? new Date(v.to).getTime() : null))
      .filter((n) => n !== null)
      .sort((a, b) => a - b);
    if (froms.length) result.earliestFrom = new Date(froms[0]).toISOString().split("T")[0];
    if (tos.length) result.latestTo = new Date(tos[tos.length - 1]).toISOString().split("T")[0];
  }

  const freq = {};
  const firstOfType = {};
  defined.forEach((v) => {
    const key = labelOf(v);
    freq[key] = (freq[key] || 0) + 1;
    if (!(key in firstOfType)) firstOfType[key] = v;
  });
  const popular = Object.entries(freq)
    .map(([key, count]) => ({ value: firstOfType[key], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  result.popular = popular;

  return result;
}

async function computeAggregatedResults(positionId) {
  const position = await Position.findByPk(positionId);
  if (!position) throw Object.assign(new Error("Position not found"), { status: 404 });

  const templateIds = position.attributeTemplate || [];
  const attributes = templateIds.length
    ? await Attribute.findAll({ where: { id: { [Op.in]: templateIds } } })
    : [];
  const attrById = Object.fromEntries(attributes.map((a) => [a.id, a]));

  const publishedCVs = await CV.findAll({
    where: { positionId: position.id, status: "published" },
    attributes: ["id", "userId", "likesCount", "createdAt", "updatedAt"],
  });

  const candidateIds = [...new Set(publishedCVs.map((c) => c.userId))];

  const allUserAttrs = candidateIds.length
    ? await UserAttribute.findAll({ where: { userId: { [Op.in]: candidateIds } } })
    : [];

  const valuesByAttr = {};
  attributes.forEach((a) => {
    valuesByAttr[a.id] = { type: a.type, values: [] };
  });

  const userAttrByAttr = {};
  allUserAttrs.forEach((ua) => {
    if (!userAttrByAttr[ua.attributeId]) userAttrByAttr[ua.attributeId] = [];
    userAttrByAttr[ua.attributeId].push({ userId: ua.userId, value: ua.value });
  });

  candidateIds.forEach((uid) => {
    attributes.forEach((a) => {
      const entries = userAttrByAttr[a.id] || [];
      const match = entries.find((e) => e.userId === uid);
      valuesByAttr[a.id].values.push(match ? match.value : null);
    });
  });

  const attributeResults = attributes.map((a) => {
    const bucket = valuesByAttr[a.id];
    return {
      attributeId: a.id,
      title: a.name,
      type: a.type,
      category: a.category,
      aggregation: aggregateValues(bucket.values, bucket.type),
    };
  });

  const totalLikes = publishedCVs.reduce((s, c) => s + (Number(c.likesCount) || 0), 0);

  return {
    position: {
      id: position.id,
      title: position.title,
      company: position.company,
      level: position.level,
      shortDescription: position.shortDescription,
      visibility: position.visibility,
    },
    stats: {
      candidateCount: candidateIds.length,
      cvCount: publishedCVs.length,
      totalLikes,
    },
    attributes: attributeResults,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  isEmpty,
  toNumber,
  aggregateValues,
  computeAggregatedResults,
};
