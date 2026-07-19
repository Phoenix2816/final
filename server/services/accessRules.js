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

function compareValues(actual, operator, expected, type) {
  if (type === "number") {
    const a = Number(actual);
    const b = Number(expected);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    switch (operator) {
      case ">":
        return a > b;
      case ">=":
        return a >= b;
      case "<":
        return a < b;
      case "<=":
        return a <= b;
      case "=":
      case "==":
        return a === b;
      case "!=":
        return a !== b;
      default:
        return false;
    }
  }

  if (type === "boolean") {
    const a = actual === true || actual === "true" || actual === 1 || actual === "1";
    const b = expected === true || expected === "true" || expected === 1 || expected === "1";
    return operator === "!=" ? a !== b : a === b;
  }

  const a = String(actual ?? "");
  const b = String(expected ?? "");
  switch (operator) {
    case "=":
    case "==":
      return a === b;
    case "!=":
      return a !== b;
    case "contains":
      return a.toLowerCase().includes(b.toLowerCase());
    default:
      return a === b;
  }
}

function evaluateAccessRules(userAttributeMap, rules = [], attributeMeta = {}) {
  if (!rules || rules.length === 0) return true;

  return rules.every((rule) => {
    const ua = userAttributeMap[rule.attributeId];
    if (!ua || isEmpty(ua.value)) return false;
    const meta = attributeMeta[rule.attributeId] || {};
    return compareValues(ua.value, rule.operator || "=", rule.value, meta.type || rule.type);
  });
}

function buildUserAttrMap(userAttributes) {
  const map = {};
  for (const ua of userAttributes || []) {
    map[ua.attributeId] = ua;
  }
  return map;
}

module.exports = {
  isEmpty,
  compareValues,
  evaluateAccessRules,
  buildUserAttrMap,
};