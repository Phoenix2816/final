import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import DataTable from "../components/common/DataTable";
import HeartLike from "../components/common/HeartLike";
import EmptyState from "../components/common/EmptyState";
import LoadingSkeleton from "../components/common/LoadingSkeleton";

export default function SearchResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { q: routeQ } = useParams();
  const q = routeQ || params.get("q") || "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setData({ positions: [], cvs: [], users: [] });
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/stats/search", { params: { q } });
        setData(data);
      } catch {
        toast.error("Search failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  const toggleLike = async (cvId, wasLiked) => {
    try {
      const { data } = wasLiked
        ? await api.delete(`/cvs/${cvId}/like`)
        : await api.post(`/cvs/${cvId}/like`);
      setData((prev) => ({
        ...prev,
        cvs: prev.cvs.map((c) =>
          c.id === cvId ? { ...c, likedByMe: data.liked, likesCount: data.likesCount } : c
        ),
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Like failed");
    }
  };

  // Show the skeleton only on the very first load (no data yet) so live
  // searches don't wipe the previous results while a new request is in flight.
  if (loading && !data) {
    return (
      <div className="page-shell">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  const { positions = [], cvs = [], users = [] } = data || {};
  const hasAny = positions.length || cvs.length || users.length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("search.title")}</h1>
          <p className="text-muted">{t("search.for", { q })}</p>
        </div>
        {loading && (
          <span className="search-loading" title="Searching…">
            <span className="spinner-border spinner-border-sm" />
          </span>
        )}
      </div>

      {!hasAny && (
        <EmptyState icon="bi-search" title={t("search.empty")} hint={t("search.emptyHint")} />
      )}

      {positions.length > 0 && (
        <section className="dashboard-section">
          <h2>
            <i className="bi bi-briefcase me-2" />
            {t("search.positions")} ({positions.length})
          </h2>
          <DataTable
            columns={[
              {
                key: "title",
                label: t("positions.title"),
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
                key: "level",
                label: t("positions.level"),
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
                key: "tags",
                label: t("positions.projectTags"),
                render: (r) =>
                  (r.projectTags || []).length ? (
                    <div className="d-flex flex-wrap gap-1">
                      {r.projectTags.slice(0, 4).map((tag) => (
                        <span key={tag} className="tag-chip tag-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  ),
              },
              {
                key: "cvCount",
                label: t("positions.cvs"),
                render: (r) => (
                  <span className="stat-inline">
                    <i className="bi bi-file-earmark-person me-1" />
                    <strong>{r.cvCount || 0}</strong>
                  </span>
                ),
              },
            ]}
            rows={positions}
            onRowClick={(row) => navigate(`/positions/${row.id}`)}
          />
        </section>
      )}

      {cvs.length > 0 && (
        <section className="dashboard-section">
          <h2>
            <i className="bi bi-file-earmark-person me-2" />
            {t("search.cvs")} ({cvs.length})
          </h2>
          <DataTable
            columns={[
              {
                key: "candidate",
                label: "Candidate",
                render: (r) => {
                  const name =
                    `${r.candidate?.firstName || ""} ${r.candidate?.lastName || ""}`.trim() ||
                    r.candidate?.email ||
                    "User";
                  const initials = name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div className="cand-cell">
                      {r.candidate?.photo ? (
                        <img src={r.candidate.photo} alt="" className="cand-avatar" />
                      ) : (
                        <span className="cand-avatar avatar-fallback">{initials}</span>
                      )}
                      <div>
                        <div className="cand-name">{name}</div>
                        <div className="cand-email">{r.positionTitle}</div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "status",
                label: t("cv.status"),
                render: (r) => <span className={`status-pill status-${r.status}`}>{r.status}</span>,
              },
              {
                key: "likesCount",
                label: t("profile.likes"),
                render: (r) => (
                  <HeartLike
                    liked={r.likedByMe}
                    count={r.likesCount}
                    onToggle={() => toggleLike(r.id, r.likedByMe)}
                  />
                ),
              },
              {
                key: "updatedAt",
                label: t("profile.lastUpdate"),
                render: (r) => new Date(r.updatedAt).toLocaleString(),
              },
            ]}
            rows={cvs}
            onRowClick={(row) => navigate(`/cvs/${row.id}`)}
          />
        </section>
      )}

      {users.length > 0 && (
        <section className="dashboard-section">
          <h2>
            <i className="bi bi-people me-2" />
            {t("search.users")} ({users.length})
          </h2>
          <DataTable
            columns={[
              {
                key: "name",
                label: "Name",
                render: (r) => {
                  const name = `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.email;
                  const initials = name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div className="cand-cell">
                      {r.photo ? (
                        <img src={r.photo} alt="" className="cand-avatar" />
                      ) : (
                        <span className="cand-avatar avatar-fallback">{initials}</span>
                      )}
                      <div>
                        <div className="cand-name">{name}</div>
                        <div className="cand-email">{r.email}</div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "roles",
                label: t("users.roles"),
                render: (r) => (r.roles || []).join(", "),
              },
            ]}
            rows={users}
            onRowClick={(row) => navigate(`/profile?userId=${row.id}`)}
          />
        </section>
      )}
    </div>
  );
}
