import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client";
import LoadingSkeleton from "../components/common/LoadingSkeleton";

export default function HomePage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api.get("/stats/dashboard", { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setData(res.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  if (loading) {
    return <div className="page-shell" aria-busy="true"><p role="status">{t("home.loading", { defaultValue: "Connecting to the server. This may take a moment." })}</p><LoadingSkeleton rows={6} height={72} /></div>;
  }
  if (error) {
    return <div className="page-shell"><div className="alert alert-warning" role="alert"><h1 className="h4">{t("home.unavailable", { defaultValue: "The dashboard is temporarily unavailable" })}</h1><p>{t("home.loadError", { defaultValue: "We could not load the application data. Please try again shortly." })}</p><button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>{t("home.retry", { defaultValue: "Try again" })}</button></div></div>;
  }

  const stats = data?.stats || {};
  const maxTag = Math.max(1, ...(data?.tagCloud || []).map((x) => x.count));

  return (
    <div className="page-shell home-page">
      <header className="page-hero home-hero">
        <div>
          <p className="eyebrow">TalentFlow</p>
          <h1>{t("home.title")}</h1>
          <p className="lead-muted">{t("home.subtitle")}</p>
        </div>
      </header>

      <section className="dashboard-section">
        <h2>{t("home.stats")}</h2>
        <div className="stats-grid">
          {[
            { key: "positions", icon: "bi-briefcase", value: stats.positions },
            { key: "candidates", icon: "bi-people", value: stats.candidates },
            { key: "recruiters", icon: "bi-person-badge", value: stats.recruiters },
            { key: "publishedCVs", icon: "bi-file-earmark-person", value: stats.publishedCVs },
            { key: "cvs24h", icon: "bi-lightning", value: stats.cvsLast24h },
          ].map((s) => (
            <div key={s.key} className="stat-tile fade-in">
              <i className={`bi ${s.icon}`} />
              <div>
                <div className="stat-value">{s.value ?? 0}</div>
                <div className="stat-label">{t(`home.${s.key}`)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-section">
          <h2>{t("home.latest")}</h2>
          <div className="list-plain">
            {(data?.latest || []).map((p) => (
              <Link key={p.id} to={`/positions/${p.id}`} className="list-row fade-in">
                <div>
                  <strong>{p.title}</strong>
                  <div className="text-muted small">{p.company}</div>
                </div>
                <span className="badge-level">{p.level}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h2>{t("home.popular")}</h2>
          <div className="list-plain">
            {(data?.popular || []).map((p) => (
              <Link key={p.id} to={`/positions/${p.id}`} className="list-row fade-in">
                <div>
                  <strong>{p.title}</strong>
                  <div className="text-muted small">{p.company}</div>
                </div>
                <span className="text-muted small">
                  <i className="bi bi-eye me-1" />
                  {p.viewCount}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <h2>{t("home.tags")}</h2>
        <div className="tag-cloud">
          {(data?.tagCloud || []).map((item) => {
            const scale = 0.85 + (item.count / maxTag) * 1.1;
            return (
              <span
                key={item.tag}
                className="tag-chip"
                style={{ fontSize: `${scale}rem`, opacity: 0.65 + (item.count / maxTag) * 0.35 }}
              >
                {item.tag}
              </span>
            );
          })}
          {!data?.tagCloud?.length && <span className="text-muted">—</span>}
        </div>
      </section>
    </div>
  );
}