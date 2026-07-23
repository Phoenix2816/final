import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Tab, Tabs } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import DiscussionPanel from "../components/discussions/DiscussionPanel";
import DataTable from "../components/common/DataTable";
import HeartLike from "../components/common/HeartLike";
import LoadingSkeleton from "../components/common/LoadingSkeleton";
import EmptyState from "../components/common/EmptyState";
import { formatCategory } from "../utils/categoryHelpers";

const ATTR_ICONS = {
  boolean: "bi-toggle-on",
  number: "bi-123",
  date: "bi-calendar",
  period: "bi-calendar-range",
  markdown: "bi-text-paragraph",
  image: "bi-image",
  dropdown: "bi-list-ul",
  string: "bi-type",
};

const CATEGORY_ICONS = {
  "Work Preferences": "bi-geo-alt",
  "Soft Skills": "bi-people",
  Technical: "bi-cpu",
  Languages: "bi-translate",
};

export default function PositionDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cvs, setCvs] = useState([]);
  const [cvTotal, setCvTotal] = useState(0);
  const [cvSearch, setCvSearch] = useState("");
  const [cvPage, setCvPage] = useState(1);
  const isStaff = hasRole("recruiter", "admin");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/positions/${id}`);
        setPayload(data);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load");
        navigate("/positions");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const { data } = await api.get(`/positions/${id}/cvs`, {
        params: { search: cvSearch, page: cvPage, pageSize: 10 },
      });
      setCvs(data.data);
      setCvTotal(data.pagination.total);
    })();
  }, [id, isStaff, cvSearch, cvPage]);

  if (loading || !payload) {
    return (
      <div className="page-shell">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const { position, templateAttributes, ruleAttributes } = payload;
  const ruleMeta = Object.fromEntries((ruleAttributes || []).map((a) => [a.id, a]));

  const toggleCvLike = async (cvId, liked) => {
    try {
      const { data } = liked
        ? await api.delete(`/cvs/${cvId}/like`)
        : await api.post(`/cvs/${cvId}/like`);
      setCvs((prev) =>
        prev.map((c) =>
          c.id === cvId ? { ...c, likedByMe: data.liked, likesCount: data.likesCount } : c
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Like failed");
    }
  };

  const generateCV = async () => {
    try {
      const { data } = await api.post("/cvs/generate", { positionId: position.id });
      navigate(`/cvs/${data.cv.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const cvColumns = [
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
              <div className="cand-email">{r.candidate?.email}</div>
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
        <HeartLike liked={r.likedByMe} count={r.likesCount} onToggle={() => toggleCvLike(r.id, r.likedByMe)} />
      ),
    },
    {
      key: "updatedAt",
      label: t("profile.lastUpdate"),
      render: (r) => new Date(r.updatedAt).toLocaleString(),
    },
  ];

  const rules = position.accessRules || [];

  return (
    <div className="page-shell">
      <div className="page-header d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <p className="eyebrow">{position.company}</p>
          <h1 className="position-title">{position.title}</h1>
          <div className="position-meta">
            <span className="badge-level">{t(`levels.${position.level}`, position.level)}</span>
            {position.visibility === "private" ? (
              <span className="badge-visibility private">
                <i className="bi bi-lock-fill me-1" />
                {t("positions.private")}
              </span>
            ) : (
              <span className="badge-visibility public">
                <i className="bi bi-globe me-1" />
                Public
              </span>
            )}
            <span className="meta-chip">
              <i className="bi bi-eye me-1" />
              {position.viewCount ?? 0} {t("positions.views")}
            </span>
            <span className="meta-chip">
              <i className="bi bi-file-earmark-person me-1" />
              {t("positions.publishedCVs", { count: cvTotal })}
            </span>
            <span className="meta-chip">
              <i className="bi bi-clock-history me-1" />
              {t("positions.lastUpdated", { date: formatDistanceToNow(new Date(position.updatedAt), { addSuffix: true }) })}
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          {isStaff && (
            <Button as={Link} to={`/positions/${id}/edit`} variant="outline-primary">
              <i className="bi bi-pencil me-1" />
              {t("common.edit")}
            </Button>
          )}
          {user && (
            <Button onClick={generateCV}>
              <i className="bi bi-file-earmark-plus me-1" />
              {t("positions.apply")}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultActiveKey="info" className="mb-3 enterprise-tabs">
        <Tab eventKey="info" title={t("positions.info")}>
          <div className="detail-panel position-info">
            <p className="position-desc">{position.shortDescription}</p>

            <section className="info-block">
              <h3 className="section-title">
                <i className="bi bi-list-check me-2" />
                {t("positions.requiredAttrs")}
              </h3>
              {templateAttributes?.length ? (
                <div className="attr-card-grid">
                  {templateAttributes.map((a) => (
                    <div key={a.id} className="attr-card">
                      <div className="attr-card-icon">
                        <i className={`bi ${ATTR_ICONS[a.type] || "bi-tag"}`} />
                      </div>
                      <div className="attr-card-body">
                        <div className="attr-card-name">{a.name}</div>
                        <div className="attr-card-meta">
                          <span className="cat-chip">
                            <i className={`bi ${CATEGORY_ICONS[a.category] || "bi-bookmark"} me-1`} />
                             {formatCategory(a.category, t)}
                          </span>
                          <span className="type-chip">{a.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">{t("common.noData")}</div>
              )}
            </section>

            <section className="info-block">
              <h3 className="section-title">
                <i className="bi bi-shield-check me-2" />
                {t("positions.accessRules")}
              </h3>
              {rules.length === 0 ? (
                <div className="access-open">
                  <i className="bi bi-unlock me-2" />
                  {t("positions.openAccess")}
                </div>
              ) : (
                <div className="rule-pill-list">
                  {rules.map((r, i) => {
                    const meta = ruleMeta[r.attributeId];
                    const op =
                      { "=": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤" }[r.operator] ||
                      r.operator;
                    return (
                      <span key={i} className="rule-pill">
                        <i className="bi bi-funnel me-1" />
                        <strong>{meta?.name || r.attributeId}</strong>
                        <span className="rule-op">{op}</span>
                        <span className="rule-value">{String(r.value)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="info-block">
              <h3 className="section-title">
                <i className="bi bi-cpu me-2" />
                {t("positions.requiredTechnologies")}
              </h3>
              {position.projectTags?.length ? (
                <div className="d-flex flex-wrap gap-2">
                  {position.projectTags.map((tag) => (
                    <span key={tag} className="tag-chip tag-pill">
                      <i className="bi bi-code-slash me-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-muted">{t("common.noData")}</div>
              )}
            </section>
          </div>
        </Tab>

        <Tab eventKey="discussion" title={`${t("positions.discussion")} (${payload.messageCount ?? 0})`}>
          <DiscussionPanel positionId={position.id} />
        </Tab>

        {isStaff && (
          <Tab
            eventKey="cvs"
            title={`${t("positions.cvs")} (${cvTotal})`}
          >
            <DataTable
              columns={cvColumns}
              rows={cvs}
              search={cvSearch}
              onSearchChange={(v) => {
                setCvPage(1);
                setCvSearch(v);
              }}
              page={cvPage}
              pageSize={10}
              total={cvTotal}
              onPageChange={setCvPage}
              onRowClick={(row) => navigate(`/cvs/${row.id}`)}
              emptyState={
                <EmptyState
                  icon="bi-people"
                  title={t("positions.cvsEmptyTitle")}
                  hint={t("positions.cvsEmptyHint")}
                />
              }
            />
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
