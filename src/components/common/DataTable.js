import React, { useMemo, useState } from "react";
import { Form, Button, ButtonGroup, Spinner, Pagination } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

export default function DataTable({
  columns,
  rows,
  rowKey = "id",
  loading,
  search,
  onSearchChange,
  filters,
  sortBy,
  sortDir,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  toolbar,
  searchPlaceholder,
  emptyState,
  stickyToolbar = false,
  ariaLabel,
}) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(search || "");

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r[rowKey]));
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));

  const pageItems = useMemo(() => {
    const items = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i += 1) items.push(i);
    return items;
  }, [page, totalPages]);

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(rows.map((r) => r[rowKey]));
  };

  const toggleOne = (id, e) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchChange?.(localSearch);
  };

  return (
    <div className="data-table-wrap">
      <div className={clsx("table-controls mb-3", stickyToolbar && "sticky-top")} style={stickyToolbar ? { top: 64, zIndex: 10 } : undefined}>
        <form className="table-search" onSubmit={handleSearchSubmit}>
          <div className="input-group">
            <span className="input-group-text" aria-hidden="true">
              <i className="bi bi-search" />
            </span>
            <Form.Control
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder={searchPlaceholder || t("common.search")}
              aria-label={ariaLabel ? `${ariaLabel} search` : searchPlaceholder || t("common.search")}
            />
            {localSearch && (
              <Button
                variant="outline-secondary"
                className="clear-search-btn"
                onClick={() => {
                  setLocalSearch("");
                  onSearchChange?.("");
                }}
                aria-label="Clear search"
              >
                <i className="bi bi-x" aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>
        {filters && <div className="table-filters">{filters}</div>}
      </div>

      {(toolbar || selectedIds.length > 0) && (
        <div className="table-toolbar mb-2 d-flex align-items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <span className="text-muted small me-2">
              {t("common.selected", { count: selectedIds.length })}
            </span>
          )}
          {toolbar}
        </div>
      )}

      <div className="table-responsive table-scroll">
        <table className="table table-hover align-middle mb-0 enterprise-table" aria-label={ariaLabel || "Data table"}>
          <thead>
            <tr>
              {onSelectionChange && (
                <th style={{ width: 42 }} aria-label="Select all rows">
                  <Form.Check type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(col.sortable && "sortable")}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => {
                    if (!col.sortable || !onSortChange) return;
                    if (sortBy === col.key) {
                      onSortChange(col.key, sortDir === "ASC" ? "DESC" : "ASC");
                    } else {
                      onSortChange(col.key, "ASC");
                    }
                  }}
                  aria-sort={col.sortable ? (sortBy === col.key ? (sortDir === "ASC" ? "ascending" : "descending") : "none") : undefined}
                  aria-label={col.sortable ? `Sort by ${col.label}` : undefined}
                >
                  {col.label}
                  {col.sortable && (
                    <span className="sort-indicator" aria-hidden="true">
                      {sortBy === col.key ? (
                        <i className={`bi bi-caret-${sortDir === "ASC" ? "up" : "down"}-fill ms-1`} />
                      ) : (
                        <i className="bi bi-chevron-expand ms-1 text-muted sort-placeholder" />
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="text-center py-5">
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="p-0 border-0">
                  {emptyState || (
                    <div className="text-center text-muted py-5">{t("common.noData")}</div>
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const id = row[rowKey];
                const selected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className={clsx(selected && "row-selected", onRowClick && "row-clickable")}
                    onClick={() => onRowClick?.(row)}
                  >
                    {onSelectionChange && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <Form.Check
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => toggleOne(id, e)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">{t("common.rows")}</span>
          <Form.Select
            size="sm"
            style={{ width: 80 }}
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Form.Select>
          <span className="small text-muted">
            {(total || 0) > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : 0}{" "}
            {t("common.of")} {total || 0} {t("users.title").toLowerCase()}
          </span>
        </div>
        <Pagination className="mb-0" aria-label="Table pagination">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} aria-label="Previous page" />
          {pageItems.map((p) => (
            <Pagination.Item key={p} active={p === page} onClick={() => onPageChange?.(p)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined}>
              {p}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} aria-label="Next page" />
        </Pagination>
      </div>
    </div>
  );
}

export function ToolbarButton({ icon, children, variant = "outline-secondary", ...props }) {
  return (
    <Button size="sm" variant={variant} {...props}>
      {icon && <i className={`bi ${icon} ${children ? "me-1" : ""}`} />}
      {children}
    </Button>
  );
}

export function ToolbarGroup({ children }) {
  return <ButtonGroup size="sm">{children}</ButtonGroup>;
}