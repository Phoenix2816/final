import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal, Offcanvas } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import DataTable, { ToolbarButton } from "../components/common/DataTable";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { formatCategory } from "../utils/categoryHelpers";

const TYPES = ["string", "markdown", "number", "date", "period", "boolean", "image", "dropdown"];
const KINDS = ["attribute", "technology"];

const TYPE_ICONS = {
  string: "bi-type",
  markdown: "bi-markdown",
  number: "bi-123",
  date: "bi-calendar",
  period: "bi-calendar-range",
  boolean: "bi-toggle-on",
  image: "bi-image",
  dropdown: "bi-list-ul",
};

const KIND_ICONS = {
  attribute: "bi-journal-text",
  technology: "bi-cpu",
};

const KIND_COLORS = {
  attribute: "primary",
  technology: "success",
};

const emptyForm = {
  category: "",
  name: "",
  description: "",
  type: "string",
  kind: "attribute",
  options: [],
};

export default function AttributesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [kind, setKind] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("ASC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerUsage, setDrawerUsage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attributes", {
        params: {
          search,
          category: category || undefined,
          type: type || undefined,
          kind: kind || undefined,
          sortBy,
          sortDir,
          page,
          pageSize,
          includeUsage: "true",
        },
      });
      setRows(data.data);
      setTotal(data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.get("/attributes/categories").then((r) => {
      if (!cancelled) setCategories(r.data);
    }).catch(() => {
      if (!cancelled) setCategories([]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, type, kind, sortBy, sortDir, page, pageSize]);

  const stats = useMemo(() => {
    const totalItems = total;
    const attrCount = rows.filter((r) => r.kind !== "technology").length;
    const techCount = rows.filter((r) => r.kind === "technology").length;
    const uniqueCategories = new Set(rows.map((r) => r.category)).size;
    return { totalItems, attrCount, techCount, uniqueCategories };
  }, [rows, total]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOptionsText("");
    setShowForm(true);
  };

  const openCreateTechnology = () => {
    setEditingId(null);
    setForm({ ...emptyForm, kind: "technology", type: "string" });
    setOptionsText("");
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      category: row.category,
      name: row.name,
      description: row.description || "",
      type: row.type,
      kind: row.kind || "attribute",
      options: row.options || [],
    });
    setOptionsText((row.options || []).join(", "));
    setShowForm(true);
  };

  const openDrawer = async (row) => {
    setDrawerItem(row);
    if (row.usage) {
      setDrawerUsage(row.usage);
    } else {
      try {
        const { data } = await api.get(`/attributes/${row.id}`);
        setDrawerUsage(data.usage || null);
      } catch {
        setDrawerUsage(null);
      }
    }
  };

  const closeDrawer = () => {
    setDrawerItem(null);
    setDrawerUsage(null);
  };

  const save = async () => {
    const payload = {
      ...form,
      options:
        form.type === "dropdown"
          ? optionsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    };
    try {
      if (editingId) await api.put(`/attributes/${editingId}`, payload);
      else await api.post("/attributes", payload);
      setShowForm(false);
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
        <div>
          <h1 className="mb-1">{t("attributes.title")}</h1>
          <p className="text-muted mb-0 small">{t("attributes.subtitle")}</p>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={openCreateTechnology}>
            <i className="bi bi-cpu me-1" />
            {t("attributes.newTechnology")}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />
            {t("attributes.new")}
          </Button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <div className="stat-card stat-card-total">
          <div className="stat-card-icon"><i className="bi bi-collection" /></div>
          <div>
            <div className="stat-card-value">{stats.totalItems}</div>
            <div className="stat-card-label">{t("attributes.stats.total")}</div>
          </div>
        </div>
        <div className="stat-card stat-card-primary">
          <div className="stat-card-icon"><i className="bi bi-journal-text" /></div>
          <div>
            <div className="stat-card-value">{stats.attrCount}</div>
            <div className="stat-card-label">{t("attributes.stats.attributes")}</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon"><i className="bi bi-cpu" /></div>
          <div>
            <div className="stat-card-value">{stats.techCount}</div>
            <div className="stat-card-label">{t("attributes.stats.technologies")}</div>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-card-icon"><i className="bi bi-folder" /></div>
          <div>
            <div className="stat-card-value">{stats.uniqueCategories}</div>
            <div className="stat-card-label">{t("attributes.stats.categories")}</div>
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "kind",
            label: t("attributes.kind"),
            width: "110px",
            render: (r) => {
              const kindValue = r.kind || "attribute";
              return (
                <span className={`badge kind-badge kind-badge-${KIND_COLORS[kindValue] || "secondary"}`}>
                  <i className={`bi ${KIND_ICONS[kindValue] || "bi-journal-text"} me-1`} />
                  {t(`attributes.${kindValue}`)}
                </span>
              );
            },
          },
          { key: "category", label: t("attributes.category"), sortable: true, width: "160px" },
          {
            key: "name",
            label: t("attributes.name"),
            sortable: true,
            render: (r) => (
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${TYPE_ICONS[r.type] || "bi-type"} text-muted`} />
                <span className="fw-semibold">{r.name}</span>
              </div>
            ),
          },
          {
            key: "type",
            label: t("attributes.type"),
            sortable: true,
            width: "120px",
            render: (r) => <span className="text-muted small text-uppercase">{r.type}</span>,
          },
          {
            key: "description",
            label: t("attributes.description"),
            render: (r) => <span className="text-truncate-cell">{r.description || "—"}</span>,
          },
          {
            key: "usage",
            label: t("attributes.usage"),
            width: "140px",
            sortable: true,
            render: (r) => {
              const usage = r.usage;
              if (!usage || usage.total === 0) {
                return <span className="text-muted small">{t("attributes.noUsage")}</span>;
              }
              return (
                <span className="badge usage-badge">
                  {t("attributes.usageCount", { count: usage.total })}
                </span>
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        search={search}
        onSearchChange={(v) => {
          setPage(1);
          setSearch(v);
        }}
        searchPlaceholder={t("users.searchPlaceholder")}
        filters={
          <>
            <Form.Select
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
              style={{ maxWidth: 160 }}
            >
              <option value="">{t("attributes.filterCategory")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
              style={{ maxWidth: 140 }}
            >
              <option value="">{t("attributes.filterType")}</option>
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={kind}
              onChange={(e) => {
                setPage(1);
                setKind(e.target.value);
              }}
              style={{ maxWidth: 140 }}
            >
              <option value="">{t("attributes.filterKind")}</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`attributes.${k}`)}
                </option>
              ))}
            </Form.Select>
          </>
        }
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(f, d) => {
          setSortBy(f);
          setSortDir(d);
        }}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={openDrawer}
        toolbar={
          selected.length > 0 ? (
            <>
              <ToolbarButton icon="bi-pencil" onClick={() => {
                const row = rows.find((r) => r.id === selected[0]);
                if (row) openEdit(row);
              }}>
                {t("common.edit")}
              </ToolbarButton>
              <ToolbarButton icon="bi-trash" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </ToolbarButton>
            </>
          ) : null
        }
        emptyState={
          <div className="empty-state-custom">
            <div className="empty-state-icon">
              <i className="bi bi-collection" />
            </div>
            <div className="empty-state-title">{t("attributes.emptyTitle")}</div>
            <div className="empty-state-hint">{t("attributes.emptyHint")}</div>
          </div>
        }
      />

      <Offcanvas show={Boolean(drawerItem)} onHide={closeDrawer} placement="end" size="lg">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{t("attributes.details")}</Offcanvas.Title>
          {drawerItem && (
            <Button size="sm" variant="outline-primary" onClick={() => openEdit(drawerItem)}>
              <i className="bi bi-pencil me-1" />
              {t("common.edit")}
            </Button>
          )}
        </Offcanvas.Header>
        <Offcanvas.Body>
          {drawerItem && (
            <div className="attr-drawer">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="attr-drawer-icon">
                  <i className={`bi ${KIND_ICONS[drawerItem.kind] || "bi-journal-text"}`} />
                </div>
                <div>
                  <div className="fw-bold fs-5">{drawerItem.name}</div>
                  <span className={`badge kind-badge kind-badge-${KIND_COLORS[drawerItem.kind] || "secondary"}`}>
                    {t(`attributes.${drawerItem.kind || "attribute"}`)}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">{t("attributes.category")}</div>
                  <div className="detail-value">{formatCategory(drawerItem.category, t)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("attributes.type")}</div>
                  <div className="detail-value">
                    <i className={`bi ${TYPE_ICONS[drawerItem.type] || "bi-type"} me-1`} />
                    {drawerItem.type}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("attributes.createdAt")}</div>
                  <div className="detail-value">
                    {drawerItem.createdAt ? new Date(drawerItem.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("attributes.usage")}</div>
                  <div className="detail-value">
                    {drawerUsage && drawerUsage.total > 0 ? (
                      <span className="badge usage-badge">{t("attributes.usageCount", { count: drawerUsage.total })}</span>
                    ) : (
                      <span className="text-muted">{t("attributes.noUsage")}</span>
                    )}
                  </div>
                </div>
              </div>

              {drawerItem.description && (
                <div className="mt-3">
                  <h6 className="fw-bold mb-2">{t("attributes.description")}</h6>
                  <p className="text-muted small mb-0">{drawerItem.description}</p>
                </div>
              )}

              {drawerUsage && drawerUsage.total > 0 && (
                <div className="mt-4">
                  <h6 className="fw-bold mb-3">{t("attributes.usage")}</h6>
                  <div className="usage-grid">
                    <div className="usage-item">
                      <i className="bi bi-person text-primary me-2" />
                      <span>{t("attributes.usageProfiles")}: {drawerUsage.profiles}</span>
                    </div>
                    <div className="usage-item">
                      <i className="bi bi-folder text-success me-2" />
                      <span>{t("attributes.usageProjects")}: {drawerUsage.projects}</span>
                    </div>
                    <div className="usage-item">
                      <i className="bi bi-briefcase text-warning me-2" />
                      <span>{t("attributes.usagePositions")}: {drawerUsage.positions}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? t("common.edit") : (form.kind === "technology" ? t("attributes.newTechnology") : t("attributes.new"))}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("attributes.kind")}</Form.Label>
            <Form.Select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              disabled={Boolean(editingId)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`attributes.${k}`)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("attributes.category")}</Form.Label>
            <Form.Control
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              disabled={form.kind === "technology"}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("attributes.name")}</Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.kind === "technology" ? "e.g. React, Docker, Python" : ""}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("attributes.type")}</Form.Label>
            <Form.Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              disabled={form.kind === "technology"}
            >
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("attributes.description")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Form.Group>
          {form.type === "dropdown" && form.kind === "attribute" && (
            <Form.Group>
              <Form.Label>{t("attributes.options")}</Form.Label>
              <Form.Control
                placeholder="Beginner, Intermediate, Advanced"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save}>{t("common.save")}</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={confirmDelete}
        title={t("common.delete")}
        body={t("attributes.confirmDelete", { count: selected.length })}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.delete("/attributes", { data: { ids: selected } });
          setConfirmDelete(false);
          setSelected([]);
          load();
        }}
      />
    </div>
  );
}
