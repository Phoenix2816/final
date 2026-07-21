import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import MDEditor from "@uiw/react-md-editor";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import useAutoSave from "../hooks/useAutoSave";
import SaveIndicator from "../components/common/SaveIndicator";
import HeartLike from "../components/common/HeartLike";
import { AttributeValueInput } from "../components/common/AttributeFields";
import LoadingSkeleton from "../components/common/LoadingSkeleton";
import { tagColor } from "../components/common/TechTag";

const SKILL_TYPES = new Set(["technology", "string"]);
const PERSONAL_KEYS = new Set(["firstName", "lastName", "photo"]);
const CONTACT_KEYS = new Set(["email", "phone", "location"]);

const ICON_BY_KEY = {
  email: "bi-envelope",
  phone: "bi-telephone",
  location: "bi-geo-alt",
  photo: "bi-image",
  firstName: "bi-person",
  lastName: "bi-person",
};

const ICON_BY_CATEGORY = {
  skills: "bi-stars",
  languages: "bi-translate",
  experience: "bi-briefcase",
  education: "bi-mortarboard",
  "remote work": "bi-house-laptop",
  remote: "bi-house-laptop",
  english: "bi-translate",
  presentation: "bi-megaphone",
  attribute: "bi-sliders",
};

function fieldIcon(field) {
  if (ICON_BY_KEY[field.key]) return ICON_BY_KEY[field.key];
  const cat = (field.category || "").toLowerCase();
  if (ICON_BY_CATEGORY[cat]) return ICON_BY_CATEGORY[cat];
  const label = (field.label || "").toLowerCase();
  if (label.includes("english") || label.includes("language")) return "bi-translate";
  if (label.includes("remote")) return "bi-house-laptop";
  if (label.includes("experience") || label.includes("year")) return "bi-briefcase";
  if (label.includes("presentation") || label.includes("speech")) return "bi-megaphone";
  if (label.includes("skill")) return "bi-stars";
  if (label.includes("education") || label.includes("degree")) return "bi-mortarboard";
  return "bi-sliders";
}

function formatValue(field, value, t) {
  if (field.type === "boolean") return value ? t("common.yes") : t("common.no");
  if (field.type === "period") return `${value?.from || "?"} → ${value?.to || "?"}`;
  if (field.type === "dropdown" && field.options?.length) {
    const opt = field.options.find((o) => o.value === value || o === value);
    return opt ? opt.label || opt : value;
  }
  return String(value ?? "");
}

export default function CVPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fieldEdits, setFieldEdits] = useState({});
  const [profileVersion, setProfileVersion] = useState(null);

  const payloadRef = useRef(payload);
  const fieldEditsRef = useRef(fieldEdits);
  const profileVersionRef = useRef(profileVersion);
  payloadRef.current = payload;
  fieldEditsRef.current = fieldEdits;
  profileVersionRef.current = profileVersion;

  const load = useCallback(async () => {
    const { data } = await api.get(`/cvs/${id}`);
    setPayload(data);
    setFieldEdits({});
    try {
      const profile = await api.get(`/users/${data.candidate.id}/profile`);
      setProfileVersion(profile.data.user.version);
    } catch {
      /* recruiters may still view published CV without full profile edit */
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load CV");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    })();
  }, [load, navigate]);

  const persist = useCallback(async () => {
    const current = payloadRef.current;
    const edits = fieldEditsRef.current;
    if (!current?.cv) return;

    const profile = {};
    const attributes = [];
    Object.entries(edits).forEach(([key, value]) => {
      if (key.startsWith("attr_")) {
        const attributeId = Number(key.replace("attr_", ""));
        if (!attributeId) return;
        const field = current.fields.find((f) => f.attributeId === attributeId);
        attributes.push({
          attributeId,
          value,
          version: field?.version ?? undefined,
        });
      } else if (key !== "email" || user?.roles?.includes("admin")) {
        profile[key] = value;
      }
    });

    if (Object.keys(profile).length && profileVersionRef.current != null) {
      profile.version = profileVersionRef.current;
    } else if (Object.keys(profile).length && profileVersionRef.current == null) {
      delete profile.version;
    }

    const body = {
      version: current.cv.version,
      selectedProjectIds: current.cv.selectedProjectIds || [],
    };
    if (Object.keys(profile).length) body.profile = profile;
    if (attributes.length) body.attributes = attributes;

    const { data } = await api.put(`/cvs/${id}`, body);
    setPayload(data);
    setFieldEdits({});
    if (data.candidate) {
      try {
        const profileRes = await api.get(`/users/${data.candidate.id}/profile`);
        setProfileVersion(profileRes.data.user.version);
      } catch {
        /* ignore */
      }
    }
  }, [id, user]);

  const { status, markDirty, saveNow, setStatus, setConflictPayload } = useAutoSave(persist, {
    enabled: Boolean(payload && !payload.readOnly),
    delay: 8000,
  });

  const setField = (key, value) => {
    setFieldEdits((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const getValue = (field) => {
    if (fieldEdits[field.key] !== undefined) return fieldEdits[field.key];
    return field.value;
  };

  const toggleLike = async () => {
    try {
      const liked = payload.likedByMe;
      const { data } = liked
        ? await api.delete(`/cvs/${id}/like`)
        : await api.post(`/cvs/${id}/like`);
      setPayload((p) => ({
        ...p,
        likedByMe: data.liked,
        cv: { ...p.cv, likesCount: data.likesCount },
      }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Like failed");
    }
  };

  const publish = async () => {
    try {
      if (Object.keys(fieldEditsRef.current).length || status === "dirty") {
        await saveNow();
      }
      const { data } = await api.post(`/cvs/${id}/publish`);
      setPayload(data);
      toast.success("Published");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || t("cv.incomplete"));
    }
  };

  const changeCV = async () => {
    try {
      const { data } = await api.post(`/cvs/${id}/unpublish`);
      setPayload(data);
      toast.success(t("cv.unpublished"));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change CV");
    }
  };

  const safeFields = payload?.fields || [];
  const contactFields = safeFields.filter((f) => CONTACT_KEYS.has(f.key));
  const attrFields = safeFields.filter((f) => !PERSONAL_KEYS.has(f.key) && !CONTACT_KEYS.has(f.key));
  const skillFields = attrFields.filter((f) => SKILL_TYPES.has(f.type));
  const skillGroups = useMemo(() => {
    const map = new Map();
    skillFields.forEach((f) => {
      const cat = f.category || t("cv.sectionSkills");
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(f);
    });
    return Array.from(map.entries());
  }, [skillFields, t]);
  const summaryFields = attrFields.filter((f) => f.type === "markdown");
  const attribFields = attrFields.filter((f) => f.type !== "markdown" && !SKILL_TYPES.has(f.type));

  if (loading || !payload) {
    return (
      <div className="page-shell">
        <LoadingSkeleton />
      </div>
    );
  }

  const isOwn =
    user &&
    (payload.candidate?.id === user.id || (!payload.readOnly && payload.candidate?.email === user.email));
  const canLike =
    payload.canLike !== undefined
    ? payload.canLike
    : Boolean(user && !isOwn && payload.cv.status === "published");

  const requiredIds = payload.position.requiredAttributeIds || [];
  const requiredFields = requiredIds
    .map((rid) => attribFields.find((f) => f.attributeId === rid))
    .filter(Boolean);

  const initials = `${payload.candidate.firstName || ""} ${payload.candidate.lastName || ""}`
    .trim()
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedUpdated = new Date(payload.cv.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const projects = payload.projects || [];
  const projectTags = payload.position.projectTags || [];
  const maxProjects = payload.position.maxProjects || 0;

  // Compact metadata chips for the header line and the sidebar "Quick facts".
  const metaFields = attribFields.map((f) => {
    const value = getValue(f);
    const empty = f.missing && (fieldEdits[f.key] === undefined || !value);
    return { field: f, value, empty };
  });

  return (
    <div className={`page-shell cv-page ${payload.readOnly ? "" : "editing"}`}>
      {/* ===== Résumé header ===== */}
      <header className="cv-header card-resume">
        <div className="cv-header-main">
          {payload.candidate.photo ? (
            <img src={payload.candidate.photo} alt="" className="cv-avatar" />
          ) : (
            <span className="cv-avatar avatar-fallback">{initials}</span>
          )}
          <div className="cv-header-id">
            <div className="cv-header-top">
              <h1 className="cv-name">
                {payload.candidate.firstName} {payload.candidate.lastName}
              </h1>
              <span className={`status-pill status-${payload.cv.status}`}>
                <i className="bi bi-circle-fill me-1" />
                {t(`cv.status.${payload.cv.status}`)}
              </span>
            </div>
            <p className="cv-position">
              {payload.position.logo ? (
                <img src={payload.position.logo} alt="" className="cv-company-logo" />
              ) : (
                <i className="bi bi-building cv-company-icon" />
              )}
              <span className="cv-company">{payload.position.company}</span>
              <span className="cv-position-sep">·</span>
              <span className="cv-position-title">{payload.position.title}</span>
            </p>
            <div className="cv-meta-row">
              {metaFields.slice(0, 5).map(({ field, value, empty }) => (
                <span key={field.key} className={`cv-meta ${empty ? "is-missing" : ""}`}>
                  <i className={`bi ${fieldIcon(field)}`} />
                  <span className={empty ? "attr-missing" : "cv-meta-value"}>
                    {empty ? t("common.missing") : formatValue(field, value, t)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="cv-header-actions">
          {canLike ? (
            <div className="cv-like-wrap">
              <HeartLike
                liked={payload.likedByMe}
                count={payload.cv.likesCount}
                onToggle={toggleLike}
                showLabel
              />
              {payload.likedByMe && (
                <span className="cv-liked-by">
                  <i className="bi bi-check2-heart me-1" />
                  {t("cv.likedByYou")}
                </span>
              )}
            </div>
          ) : (
            <span className="cv-like-static" title={t("cv.likeCount")}>
              <i className="bi bi-heart" />
              <span className="heart-count">{payload.cv.likesCount ?? 0}</span>
              <span className="cv-like-text">{t("cv.likesLabel")}</span>
            </span>
          )}
          <span className="cv-updated">
            <i className="bi bi-calendar-check" />
            {t("cv.updated")}: {formattedUpdated}
          </span>
          {!payload.readOnly && (
            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              <SaveIndicator
                status={status}
                onReload={() => {
                  load();
                  setStatus("idle");
                  setConflictPayload(null);
                }}
              />
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() =>
                  saveNow()
                    .then(() => toast.success(t("common.saved")))
                    .catch((err) =>
                      toast.error(err.response?.data?.detail || err.response?.data?.error || "Save failed")
                    )
                }
              >
                {t("common.save")}
              </Button>
              {payload.cv.status === "published" ? (
                <Button variant="outline-secondary" size="sm" onClick={changeCV}>
                  {t("cv.change")}
                </Button>
              ) : (
                <Button size="sm" onClick={publish}>
                  {t("cv.publish")}
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {!payload.complete && !payload.readOnly && (
        <div className="alert alert-warning d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {t("cv.missingWarning")}
        </div>
      )}

      <div className="resume-layout">
        {/* ===== Sidebar ===== */}
        <aside className="resume-side">
          {/* Profile + quick facts */}
          <section className="resume-card cv-profile-card">
            <div className="cv-profile-head">
              {payload.candidate.photo ? (
                <img src={payload.candidate.photo} alt="" className="cv-profile-photo" />
              ) : (
                <span className="cv-profile-photo avatar-fallback">{initials}</span>
              )}
              <div className="cv-profile-id">
                <div className="cv-profile-name">
                  {payload.candidate.firstName} {payload.candidate.lastName}
                </div>
                <div className="cv-profile-role">{payload.position.title}</div>
              </div>
            </div>
            <ul className="cv-quickfacts">
              {metaFields.slice(0, 6).map(({ field, value, empty }) => (
                <li key={field.key} className={`cv-quickfact ${empty ? "is-missing" : ""}`}>
                  <i className={`bi ${fieldIcon(field)}`} />
                  <span className={empty ? "attr-missing" : "cv-quickfact-value"}>
                    {empty ? t("common.missing") : formatValue(field, value, t)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="resume-card">
            <h3 className="resume-card-title">
              <i className="bi bi-envelope-at me-2" />
              {t("cv.sectionContact")}
            </h3>
            <ul className="cv-contact-list">
              {contactFields.map((f) => {
                const value = getValue(f);
                const empty = f.missing && (fieldEdits[f.key] === undefined || !value);
                const href =
                  f.key === "email" ? `mailto:${value}` : f.key === "phone" ? `tel:${value}` : null;
                return (
                  <li key={f.key} className="cv-contact-item">
                    <i className={`bi ${fieldIcon(f)}`} />
                    <div>
                      <span className="cv-contact-label">{f.label}</span>
                      {empty ? (
                        <span className="attr-missing">⚠ {t("common.missing")}</span>
                      ) : href ? (
                        <a href={href}>{String(value)}</a>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {skillGroups.length > 0 && (
            <section className="resume-card">
              <h3 className="resume-card-title">
                <i className="bi bi-stars me-2" />
                {t("cv.sectionSkills")}
              </h3>
              {skillGroups.map(([cat, fields]) => (
                <div key={cat} className="mb-3">
                  <h6 className="cv-skill-category">{cat}</h6>
                  <div className="cv-skill-badges">
                    {fields.map((f) => {
                      const value = getValue(f);
                      const empty = f.missing && (fieldEdits[f.key] === undefined || !value);
                      if (empty) {
                        return (
                          <span key={f.key} className="badge rounded-pill text-bg-warning attr-missing-badge">
                            ⚠ {f.label}
                          </span>
                        );
                      }
                      const labels = Array.isArray(value)
                        ? value
                        : String(value || "")
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                      return labels.map((lab, i) => (
                        <span key={`${f.key}-${i}`} className="badge rounded-pill text-bg-primary cv-skill">
                          {lab}
                        </span>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {attribFields.length > 0 && (
            <section className="resume-card">
              <h3 className="resume-card-title">
                <i className="bi bi-sliders me-2" />
                {t("cv.sectionAttributes")}
              </h3>
              <div className="cv-stat-grid">
                {attribFields.map((f) => {
                  const value = getValue(f);
                  const empty = f.missing && (fieldEdits[f.key] === undefined || !value);
                  return (
                    <div key={f.key} className={`cv-stat ${empty ? "is-missing" : ""}`}>
                      <i className={`bi ${fieldIcon(f)}`} />
                      <div className="cv-stat-body">
                        <span className="cv-stat-name">{f.label}</span>
                        {empty ? (
                          <span className="attr-missing">⚠ {t("common.missing")}</span>
                        ) : payload.readOnly ? (
                          <span className="cv-stat-value">{formatValue(f, value, t)}</span>
                        ) : (
                          <AttributeValueInput
                            type={f.type}
                            value={value}
                            options={f.options}
                            missing={empty}
                            onChange={(v) => setField(f.key, v)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* ===== Main content ===== */}
        <div className="resume-main">
          {summaryFields.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-heading">
                <i className="bi bi-file-text me-2" />
                {t("cv.sectionSummary")}
              </h2>
              {summaryFields.map((f) => {
                const raw = getValue(f);
                const missing = f.missing && (fieldEdits[f.key] === undefined || !raw);
                if (payload.readOnly) {
                  return (
                    <div key={f.key} className="cv-summary">
                      {missing ? (
                        <span className="attr-missing">⚠ {t("common.missing")}</span>
                      ) : (
                        <div className="cv-markdown cv-markdown-lg">
                          <ReactMarkdown>{String(raw || "").replace(/^#+\s+.*\n/, "")}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={f.key} className={`cv-summary ${missing ? "is-missing" : ""}`}>
                    {missing && (
                      <span className="attr-missing d-block mb-2">⚠ {t("common.missing")}</span>
                    )}
                    <div data-color-mode="auto">
                      <MDEditor
                        value={String(raw || "")}
                        height={180}
                        onChange={(v) => setField(f.key, v || "")}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {requiredFields.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-heading">
                <i className="bi bi-clipboard-check me-2" />
                {t("cv.sectionRequirements")}
              </h2>
              <p className="cv-req-subtitle">
                {payload.position.company} · {payload.position.title}
              </p>
              <ul className="cv-req-list">
                {requiredFields.map((f) => {
                  const value = getValue(f);
                  const empty = f.missing && (fieldEdits[f.key] === undefined || !value);
                  return (
                    <li key={f.key} className={`cv-req-item ${empty ? "is-missing" : ""}`}>
                      <i className={`bi ${empty ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"}`} />
                      <span className="cv-req-name">{f.label}</span>
                      {empty ? (
                        <span className="attr-missing">{t("common.missing")}</span>
                      ) : (
                        <span className="cv-req-value">{formatValue(f, value, t)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="resume-section">
            <h2 className="resume-heading">
              <i className="bi bi-kanban me-2" />
              {t("cv.sectionProjects")}
            </h2>
            {projectTags.length > 0 && (
              <div className="cv-project-filter d-flex flex-wrap align-items-center gap-2 mb-3">
                <span className="cv-filter-label">
                  <i className="bi bi-filter me-1" />
                  {t("cv.filteredBy")}
                </span>
                {projectTags.map((tag) => (
                  <span key={tag} className="badge rounded-pill text-bg-light cv-filter-tag">
                    {tag}
                  </span>
                ))}
                {maxProjects > 0 && (
                  <span className="cv-filter-max">{t("cv.maxProjectsLabel", { count: maxProjects })}</span>
                )}
              </div>
            )}
            {!payload.readOnly && payload.availableProjects?.length > 0 && (
              <Form className="mb-3 project-select">
                {payload.availableProjects.map((p) => (
                  <Form.Check
                    key={p.id}
                    type="checkbox"
                    id={`proj-${p.id}`}
                    label={p.name}
                    checked={(payload.cv.selectedProjectIds || []).includes(p.id)}
                    onChange={(e) => {
                      const ids = new Set(payload.cv.selectedProjectIds || []);
                      if (e.target.checked) ids.add(p.id);
                      else ids.delete(p.id);
                      setPayload((prev) => ({
                        ...prev,
                        cv: { ...prev.cv, selectedProjectIds: Array.from(ids) },
                      }));
                      markDirty();
                    }}
                  />
                ))}
              </Form>
            )}
            {projects.length > 0 ? (
              <div className="cv-project-cards">
                {projects.map((p) => (
                  <article key={p.id} className="cv-project-card">
                    <span className="cv-project-dot" />
                    <div className="cv-project-body">
                      <div className="cv-project-period">
                        <i className="bi bi-calendar3 me-1" />
                        {p.startDate || "?"} — {p.endDate || "?"}
                      </div>
                      <h3 className="cv-project-title">{p.name}</h3>
                      <div className="cv-markdown">
                        <ReactMarkdown>{p.description || ""}</ReactMarkdown>
                      </div>
                       {p.tags?.length > 0 && (
                         <div className="d-flex flex-wrap gap-1 cv-project-tags">
                           {p.tags.map((tag) => {
                             const c = tagColor(tag);
                             return (
                               <span key={tag} className="tag-pill tag-pill-sm" style={{ background: c.bg, color: c.fg, borderColor: c.border }}>
                                 {tag}
                               </span>
                             );
                           })}
                         </div>
                       )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cv-empty-state">
                <i className="bi bi-folder2-open" />
                <p className="cv-empty-title">{t("cv.projectsEmptyTitle")}</p>
                <p className="cv-empty-hint">{t("cv.projectsEmptyHint")}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
