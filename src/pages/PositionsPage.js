import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import DataTable, { ToolbarButton } from "../components/common/DataTable";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";

export default function PositionsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("DESC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = hasRole("recruiter", "admin");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/positions", {
        params: { search, level, sortBy, sortDir, page, pageSize },
      });
      setRows(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to load positions");
    } finally {
      setLoading(false);
    }
  }, [search, level, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, level, sortBy, sortDir, page, pageSize, load]);

  const columns = [
    {
      key: "title",
      label: t("positions.title"),
      sortable: true,
      render: (r) => (
        <div className="pos-cell">
          <div className="pos-title">{r.title}</div>
          <div className="pos-company">
            <i className="bi bi-building me-1" />
            {r.company}
          </div>
        </div>
      ),
    },
    {
      key: "tags",
      label: t("positions.requiredTechnologies"),
      render: (r) =>
        (r.projectTags || []).length ? (
          <div className="d-flex flex-wrap gap-1">
            {r.projectTags.slice(0, 4).map((tag) => (
              <span key={tag} className="tag-chip tag-sm">
                {tag}
              </span>
            ))}
            {r.projectTags.length > 4 && (
              <span className="tag-chip tag-sm">+{r.projectTags.length - 4}</span>
            )}
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "level",
      label: t("positions.level"),
      sortable: true,
      render: (r) => <span className="badge-level">{t(`levels.${r.level}`, r.level)}</span>,
    },
    {
      key: "visibility",
      label: t("positions.visibility"),
      render: (r) =>
        r.visibility === "private" ? (
          <span className="badge-visibility private">
            <i className="bi bi-lock-fill me-1" />
            {t("positions.private")}
          </span>
        ) : (
          <span className="badge-visibility public">
            <i className="bi bi-globe me-1" />
            Public
          </span>
        ),
    },
    {
      key: "cvCount",
      label: t("positions.cvs"),
      sortable: true,
      render: (r) => (
        <span className="stat-inline" title={`${r.cvCount || 0} ${t("positions.cvs")}`}>
          <i className="bi bi-file-earmark-person me-1" />
          <strong>{r.cvCount || 0}</strong>
        </span>
      ),
    },
    {
      key: "viewCount",
      label: t("positions.views"),
      sortable: true,
      render: (r) => (
        <span className="stat-inline">
          <i className="bi bi-eye me-1" />
          {r.viewCount ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("positions.title")}</h1>
        </div>
        {canManage && (
          <Button as={Link} to="/positions/new">
            <i className="bi bi-plus-lg me-1" />
            {t("positions.new")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={search}
        onSearchChange={(v) => {
          setPage(1);
          setSearch(v);
        }}
        filters={
          <Form.Select
            value={level}
            onChange={(e) => {
              setPage(1);
              setLevel(e.target.value);
            }}
            style={{ maxWidth: 160 }}
          >
            <option value="">{t("common.all")}</option>
            <option value="junior">{t("levels.junior")}</option>
            <option value="mid">{t("levels.mid")}</option>
            <option value="senior">{t("levels.senior")}</option>
            <option value="lead">{t("levels.lead")}</option>
          </Form.Select>
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
        selectedIds={canManage ? selected : undefined}
        onSelectionChange={canManage ? setSelected : undefined}
        onRowClick={(row) => navigate(`/positions/${row.id}`)}
        emptyState={
          <EmptyState
            icon="bi-briefcase"
            title={t("positions.emptyTitle")}
            hint={t("positions.emptyHint")}
          />
        }
        toolbar={
          canManage && selected.length > 0 ? (
            <>
              <ToolbarButton
                icon="bi-files"
                onClick={async () => {
                  try {
                    for (const id of selected) {
                      await api.post(`/positions/${id}/duplicate`);
                    }
                    toast.success("Duplicated");
                    setSelected([]);
                    load();
                  } catch {
                    toast.error("Duplicate failed");
                  }
                }}
              >
                {t("common.duplicate")}
              </ToolbarButton>
              <ToolbarButton icon="bi-trash" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </ToolbarButton>
            </>
          ) : null
        }
      />

      <ConfirmDialog
        show={confirmDelete}
        title={t("common.delete")}
        body={`Delete ${selected.length} position(s)?`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await api.delete("/positions", { data: { ids: selected } });
            setConfirmDelete(false);
            setSelected([]);
            toast.success("Deleted");
            load();
          } catch {
            toast.error("Delete failed");
          }
        }}
      />
    </div>
  );
}
