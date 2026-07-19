const { Op, Sequelize } = require("sequelize");
const { sequelize } = require("../models");

function parseListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const sortBy = query.sortBy || "updatedAt";
  const sortDir = (query.sortDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const search = (query.search || query.q || "").trim();
  return { page, pageSize, sortBy, sortDir, search, offset: (page - 1) * pageSize };
}

/**
 * Full-text search. Uses native MySQL FULLTEXT (MATCH ... AGAINST) when the
 * dialect is MySQL (a real search engine, not a LIKE scan), and falls back to
 * the existing LIKE behaviour for SQLite / other dialects so the app keeps
 * working locally. The result is always a plain `where` fragment that can be
 * spread into an existing `where` object via `{ ...fullTextSearch(...) }`.
 */
function fullTextSearch(fields, search) {
  if (!search) return {};
  const terms = search.split(/\s+/).filter(Boolean);
  if (!terms.length) return {};

  const isMysql = String(sequelize.getDialect()).toLowerCase() === "mysql";

  if (isMysql) {
    const matchExpr = fields.map((f) => `\`${f}\``).join(", ");
    const booleanQuery = terms.map((t) => `+${t}*`).join(" ");
    const literal = Sequelize.literal(
      `MATCH(${matchExpr}) AGAINST(${sequelize.escape(booleanQuery)} IN BOOLEAN MODE)`
    );
    return { [Op.and]: literal };
  }

  return {
    [Op.and]: terms.map((term) => ({
      [Op.or]: fields.map((field) => ({
        [field]: { [Op.like]: `%${term}%` },
      })),
    })),
  };
}

function paginatedResult(rows, count, page, pageSize) {
  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize) || 1,
    },
  };
}

module.exports = { parseListQuery, buildFullTextWhere: fullTextSearch, fullTextSearch, paginatedResult };
