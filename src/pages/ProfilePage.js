import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Form, Modal, InputGroup, Tabs, Tab } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import useAutoSave from "../hooks/useAutoSave";
import SaveIndicator from "../components/common/SaveIndicator";
import DataTable, { ToolbarButton } from "../components/common/DataTable";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { AttributeValueInput } from "../components/common/AttributeFields";
import ProjectCard from "../components/common/ProjectCard";
import EmptyState from "../components/common/EmptyState";
import HeartLike from "../components/common/HeartLike";
import LoadingSkeleton from "../components/common/LoadingSkeleton";
import ReactMarkdown from "react-markdown";
import { tagColor } from "../components/common/TechTag";

const CATEGORY_ICONS = {
  Languages: "bi-globe",
  Technical: "bi-cpu",
  "Soft Skills": "bi-people",
  Education: "bi-book",
  "Work Preferences": "bi-briefcase",
  Availability: "bi-calendar",
  Certificates: "bi-award",
  Profile: "bi-person",
  Technologies: "bi-cpu",
};

const CATEGORY_ORDER = [
  "Languages",
  "Technical",
  "Technologies",
  "Soft Skills",
  "Education",
  "Work Preferences",
  "Availability",
  "Certificates",
  "Profile",
];

const SUGGESTED_ATTRS = ["Salary Expectation", "Notice Period", "GitHub Profile", "Portfolio Summary", "Certificate Image"];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user: authUser, hasRole, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profileUserId = Number(searchParams.get("userId") || authUser?.id);
  const canEdit = authUser?.id === profileUserId || hasRole("admin");

  const [profile, setProfile] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [attrSearch, setAttrSearch] = useState("");
  const [attrCategory, setAttrCategory] = useState("");
  const [skills, setSkills] = useState([]);
  const [techLibrary, setTechLibrary] = useState([]);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const skillSelectorRef = useRef(null);
  const [cvs, setCvs] = useState([]);
  const [cvTotal, setCvTotal] = useState(0);
  const [cvSearch, setCvSearch] = useState("");
  const [cvPage, setCvPage] = useState(1);
  const [selectedCvs, setSelectedCvs] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attrDirty, setAttrDirty] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const loadProfile = useCallback(async () => {
    const { data } = await api.get(`/users/${profileUserId}/profile`);
    setProfile(data.user);
    setAttributes(data.attributes);
    setProjects(data.projects);
    setSkills(data.skills || []);
    setAttrDirty([]);
  }, [profileUserId]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/attributes", {
        params: { kind: "technology", pageSize: 100 },
      });
      setTechLibrary(data.data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadProfile();
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProfile]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/cvs", {
        params: {
          mine: "true",
          userId: profileUserId,
          search: cvSearch,
          page: cvPage,
          pageSize: 10,
        },
      });
      setCvs(data.data);
      setCvTotal(data.pagination.total);
    })();
  }, [profileUserId, cvSearch, cvPage]);

  const openAddAttr = async () => {
    setShowAddAttr(true);
    const [lib, rec, cats] = await Promise.all([
      api.get("/attributes", {
        params: { search: attrSearch, category: attrCategory || undefined, pageSize: 50 },
      }),
      api.get("/attributes/recent"),
      api.get("/attributes/categories"),
    ]);
    setLibrary(lib.data.data);
    setRecent(rec.data);
    setCategories(cats.data);
  };

  useEffect(() => {
    if (!showAddAttr) return;
    (async () => {
      const lib = await api.get("/attributes", {
        params: {
          prefix: attrSearch || undefined,
          search: attrSearch || undefined,
          category: attrCategory || undefined,
          pageSize: 50,
        },
      });
      setLibrary(lib.data.data);
    })();
  }, [attrSearch, attrCategory, showAddAttr]);

  useEffect(() => {
    if (!skillSelectorOpen) return;
    const handleClickOutside = (event) => {
      if (skillSelectorRef.current && !skillSelectorRef.current.contains(event.target)) {
        setSkillSelectorOpen(false);
        setSkillInput("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [skillSelectorOpen]);

  const saveProfile = async () => {
    const { data } = await api.put(`/users/${profileUserId}/profile`, profile);
    setProfile(data);
    if (authUser?.id === profileUserId) await refresh();
  };

  const saveAttributes = async () => {
    if (!attrDirty.length) return;
    const { data } = await api.put(`/users/${profileUserId}/attributes`, {
      attributes: attrDirty,
    });
    setAttributes(data);
    setAttrDirty([]);
  };

  const saveAll = async () => {
    await saveProfile();
    await saveAttributes();
  };

  const { status, markDirty, saveNow, setStatus, setConflictPayload } = useAutoSave(saveAll, {
    enabled: canEdit,
    delay: 8000,
  });

  const updateProfileField = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    markDirty();
  };

  const updateAttrValue = (attributeId, value, version) => {
    setAttributes((list) =>
      list.map((ua) =>
        ua.attributeId === attributeId ? { ...ua, value } : ua
      )
    );
    setAttrDirty((prev) => {
      const rest = prev.filter((x) => x.attributeId !== attributeId && !x._delete);
      return [...rest, { attributeId, value, version }];
    });
    markDirty();
  };

  const removeAttr = (attributeId) => {
    setAttributes((list) => list.filter((ua) => ua.attributeId !== attributeId));
    setAttrDirty((prev) => [...prev.filter((x) => x.attributeId !== attributeId), { attributeId, _delete: true }]);
    markDirty();
  };

  const handlePasswordRequest = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      await api.post("/auth/password/request", {
        currentPassword,
        newPassword,
      });
      setPasswordMessage(t("profile.passwordEmailSent"));
      toast.success(t("profile.passwordEmailSent"));
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMessage(err.response?.data?.error || t("profile.passwordChangeFailed"));
      toast.error(err.response?.data?.error || t("profile.passwordChangeFailed"));
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    const confirmToken = searchParams.get("confirm-password");
    if (!confirmToken) return;
    (async () => {
      setPasswordLoading(true);
      setPasswordMessage(null);
      try {
        await api.post("/auth/password/confirm", { token: confirmToken });
        setPasswordMessage(t("profile.passwordChangedSuccess"));
        toast.success(t("profile.passwordChangedSuccess"));
        navigate("/profile", { replace: true });
      } catch (err) {
        setPasswordMessage(err.response?.data?.error || t("profile.passwordChangeFailed"));
        toast.error(err.response?.data?.error || t("profile.passwordChangeFailed"));
        navigate("/profile", { replace: true });
      } finally {
        setPasswordLoading(false);
      }
    })();
  }, [searchParams, navigate, t]);

  const addAttr = async (attr) => {
    setShowAddAttr(false);
    setAttributes((list) => {
      if (list.some((ua) => ua.attributeId === attr.id)) return list;
      return [...list, { attributeId: attr.id, value: null, version: 1, attribute: attr }];
    });
    setAttrDirty((prev) => [...prev.filter((x) => x.attributeId !== attr.id), { attributeId: attr.id, value: null }]);
    markDirty();
  };

  const addSkill = async (skillName) => {
    const trimmed = skillName.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    try {
      const existingTech = techLibrary.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!existingTech) {
        const { data } = await api.post("/attributes", {
          name: trimmed,
          category: "Technologies",
          type: "string",
          kind: "technology",
          description: "",
        });
        setTechLibrary((prev) => [...prev, data]);
      }
      const { data } = await api.post(`/users/${profileUserId}/skills`, { skill: trimmed });
      setSkills(data);
      setSkillInput("");
      setSkillSelectorOpen(false);
      markDirty();
    } catch {
      toast.error("Failed to add skill");
    }
  };

  const removeSkill = async (skillName) => {
    try {
      const { data } = await api.delete(`/users/${profileUserId}/skills/${encodeURIComponent(skillName)}`);
      setSkills(data);
      markDirty();
    } catch {
      toast.error("Failed to remove skill");
    }
  };

  const addProject = async () => {
    const { data } = await api.post("/projects", {
      userId: profileUserId,
      name: "New Project",
      currentlyWorking: true,
      order: projects.length,
    });
    setProjects((p) => [data, ...p]);
  };

  const reorderProjects = async (orderedIds) => {
    try {
      await api.put("/projects/reorder", { ids: orderedIds });
    } catch {
      toast.error("Failed to reorder projects");
    }
  };

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  };

  const handleDrop = (e, id) => {
    e.preventDefault();
    if (dragId == null || dragId === id) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    setProjects((list) => {
      const from = list.findIndex((p) => p.id === dragId);
      const to = list.findIndex((p) => p.id === id);
      if (from < 0 || to < 0) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      reorderProjects(next.map((p) => p.id));
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  };

  const saveProject = async (project) => {
    try {
      const { data } = await api.put(`/projects/${project.id}`, project);
      setProjects((list) => list.map((p) => (p.id === data.id ? data : p)));
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(t("common.conflict"));
        loadProfile();
      }
    }
  };

  const loadTags = async (q) => {
    const { data } = await api.get("/attributes/technologies", { params: { search: q, pageSize: 40 } });
    return data.map((t) => t.name);
  };

  const loadLibrary = async () => {
    const { data } = await api.get("/attributes/technologies/library");
    return data;
  };

  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const filteredTechs = useMemo(() => {
    const q = skillInput.trim().toLowerCase();
    if (!q) return techLibrary.slice(0, 12);
    return techLibrary.filter((t) => t.name.toLowerCase().includes(q));
  }, [techLibrary, skillInput]);

  const showCreateTech = skillInput.trim().length > 0 && !techLibrary.some((t) => t.name.toLowerCase() === skillInput.trim().toLowerCase()) && !skills.includes(skillInput.trim());

  const groupedAttributes = useMemo(() => {
    const groups = {};
    for (const attr of attributes) {
      const cat = attr.attribute?.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...attr, _isAttr: true });
    }
    if (skills.length > 0) {
      groups["Technologies"] = skills.map((s) => ({
        _isSkill: true,
        skillName: s,
        attributeId: `skill-${s}`,
        attribute: { name: s, type: "technology", category: "Technologies" },
      }));
    }
    const ordered = [];
    const techOrdered = [];
    for (const cat of CATEGORY_ORDER) {
      if (cat === "Technologies") {
        if (groups[cat]) techOrdered.push({ category: cat, items: groups[cat] });
      } else if (groups[cat]) {
        ordered.push({ category: cat, items: groups[cat] });
      }
    }
    ordered.push(...techOrdered);
    for (const cat of Object.keys(groups)) {
      if (!CATEGORY_ORDER.includes(cat)) ordered.push({ category: cat, items: groups[cat] });
    }
    return ordered;
  }, [attributes, skills]);

  const recentAttrs = useMemo(() => {
    return recent.slice(0, 6);
  }, [recent]);

  const suggestedAttrs = useMemo(() => {
    const existingIds = new Set(attributes.map((a) => a.attributeId));
    return library.filter((a) => SUGGESTED_ATTRS.includes(a.name) && !existingIds.includes(a.id)).slice(0, 6);
  }, [library, attributes]);

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="highlight-text">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  if (loading || !profile) {
    return (
      <div className="page-shell">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h1 className="mb-1">{t("profile.title")}</h1>
        {canEdit && (
          <div className="d-flex align-items-center gap-3">
            <SaveIndicator
              status={status}
              onReload={() => {
                loadProfile();
                setStatus("idle");
                setConflictPayload(null);
              }}
            />
            <Button size="sm" variant="outline-primary" onClick={() => saveNow().catch(() => {})}>
              {t("common.save")}
            </Button>
            {authUser?.id === profileUserId && (
              <Button size="sm" variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>
                <i className="bi bi-key me-1" />
                {t("profile.changePassword")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Portfolio header */}
      <div className="profile-portfolio card-resume mb-4">
        <div className="profile-portfolio-header d-flex align-items-center gap-4 flex-wrap">
          <div className="profile-portfolio-avatar">
            {profile.photo ? (
              <img src={profile.photo} alt="" className="profile-portfolio-img" />
            ) : (
              <div className="profile-portfolio-img avatar-fallback">
                {(profile.firstName || "?").charAt(0)}
              </div>
            )}
          </div>
          <div className="profile-portfolio-info flex-grow-1">
            <h2 className="profile-portfolio-name mb-1">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="profile-portfolio-role text-muted mb-2">
              {(() => {
                const roleAttr = attributes.find((a) => a.label?.toLowerCase().includes("position") || a.label?.toLowerCase().includes("title"));
                if (roleAttr?.value) {
                  if (typeof roleAttr.value === "string") return roleAttr.value;
                  if (roleAttr.value?.label) return roleAttr.value.label;
                  return String(roleAttr.value);
                }
                return t("profile.candidate");
              })()}
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {profile.location && (
                <span className="text-muted small">
                  <i className="bi bi-geo-alt me-1" />
                  {profile.location}
                </span>
              )}
              {skills.length > 0 && (
                <div className="d-flex flex-wrap gap-1">
                  {skills.slice(0, 8).map((skill) => (
                    <span key={skill.id || skill.name} className="tag-pill tag-pill-sm" style={{ background: tagColor(skill.name).bg, color: tagColor(skill.name).fg, borderColor: tagColor(skill.name).border }}>
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {(() => {
          const summaryAttr = attributes.find((a) => a.type === "markdown");
          if (summaryAttr?.value) {
            return (
              <div className="profile-portfolio-summary mt-3 pt-3 border-top">
                <div className="cv-markdown cv-markdown-lg">
                  <ReactMarkdown>{String(summaryAttr.value).replace(/^#+\s+.*\n/, "")}</ReactMarkdown>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      <Tabs defaultActiveKey="me" className="enterprise-tabs mb-3">
        <Tab eventKey="me" title={`${t("profile.me")}`}>
          <div className="profile-me detail-panel profile-tab-content">
            <div className="row g-3">
              <div className="col-md-3 text-center">
                {profile.photo ? (
                  <img src={profile.photo} alt="" className="profile-photo" />
                ) : (
                  <div className="profile-photo placeholder">
                    {(profile.firstName || "?").charAt(0)}
                  </div>
                )}
                {canEdit && (
                  <Form.Control
                    className="mt-2"
                    placeholder="Photo URL"
                    value={profile.photo || ""}
                    onChange={(e) => updateProfileField("photo", e.target.value)}
                  />
                )}
              </div>
              <div className="col-md-9">
                <div className="row g-3">
                  {[
                    ["firstName", t("auth.firstName")],
                    ["lastName", t("auth.lastName")],
                    ["email", t("auth.email")],
                    ["phone", t("profile.phone")],
                    ["location", t("profile.location")],
                  ].map(([key, label]) => (
                    <div className="col-md-6" key={key}>
                      <Form.Label>{label}</Form.Label>
                      <Form.Control
                        value={profile[key] || ""}
                        disabled={!canEdit || (key === "email" && !hasRole("admin"))}
                        onChange={(e) => updateProfileField(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab eventKey="info" title={`${t("profile.info")} (${attributes.length + skills.length})`}>
          <div className="profile-tab-content">
            <p className="text-muted small mb-3">{t("profile.infoSubtitle")}</p>

            {canEdit && (
              <div className="d-flex justify-content-end mb-3">
                <Button size="sm" onClick={openAddAttr}>
                  <i className="bi bi-plus-lg me-1" />
                  {t("profile.addAttribute")}
                </Button>
              </div>
            )}

            {/* Attributes grouped by category */}
            {groupedAttributes.map(({ category, items }) => {
              const icon = CATEGORY_ICONS[category] || "bi-collection";
              const catKey = category.toLowerCase().replace(/\s+/g, "");
              const categoryLabel = t(`profile.categories.${catKey}`) || category;
              const isTech = category === "Technologies";
              return (
                <div key={category} className="info-section info-section-category">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="info-section-title" style={{ marginBottom: 0, borderBottom: 0, paddingBottom: 0 }}>
                      <i className={`bi ${icon}`} />
                      {categoryLabel}
                    </div>
                    {canEdit && isTech && !skillSelectorOpen && (
                      <Button size="sm" variant="outline-secondary" onClick={() => setSkillSelectorOpen(true)}>
                        <i className="bi bi-plus-lg me-1" />
                        {t("profile.addSkill")}
                      </Button>
                    )}
                  </div>
                  {items.length > 0 ? (
                    <div className="attr-card-vertical">
                      {items.map((ua) => {
                        if (ua._isSkill) {
                          return (
                            <div key={ua.attributeId} className="attr-card">
                              <div className="attr-card-icon">
                                <i className="bi bi-cpu" />
                              </div>
                              <div className="attr-card-body">
                                <div className="attr-card-name">{ua.skillName}</div>
                                <div className="attr-card-meta">
                                  <span className="attr-card-category">Technology</span>
                                  <span className="attr-card-type">Skill</span>
                                </div>
                              </div>
                              {canEdit && (
                                <button className="attr-card-remove" onClick={() => removeSkill(ua.skillName)}>
                                  <i className="bi bi-x-lg" />
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={ua.attributeId} className="attr-card">
                            <div className="attr-card-icon">
                              <i className={`bi ${icon}`} />
                            </div>
                            <div className="attr-card-body">
                              <div className="attr-card-name">{ua.attribute?.name}</div>
                              <div className="attr-card-meta">
                                <span className="attr-card-category">{categoryLabel}</span>
                                <span className="attr-card-type">{ua.attribute?.type}</span>
                              </div>
                              <div className="attr-value-display">
                                <AttributeValueInput
                                  type={ua.attribute?.type}
                                  value={ua.value}
                                  options={ua.attribute?.options}
                                  readOnly={!canEdit}
                                  onChange={(v) => updateAttrValue(ua.attributeId, v, ua.version)}
                                />
                              </div>
                            </div>
                            {canEdit && (
                              <button className="attr-card-remove" onClick={() => removeAttr(ua.attributeId)}>
                                <i className="bi bi-x-lg" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="attr-empty">
                      <div className="attr-empty-icon"><i className={`bi ${icon}`} /></div>
                      <div className="attr-empty-title">{t("profile.categoryEmpty", { category: categoryLabel })}</div>
                      <div className="attr-empty-hint">{t("profile.categoryEmptyHint", { category: categoryLabel })}</div>
                    </div>
                  )}
                  {isTech && canEdit && skillSelectorOpen && (
                    <div className="skills-input-wrap mt-3" ref={skillSelectorRef}>
                      <InputGroup>
                        <Form.Control
                          placeholder={t("profile.skillsPlaceholder")}
                          value={skillInput}
                          onChange={(e) => {
                            setSkillInput(e.target.value);
                          }}
                          autoFocus
                        />
                        <Button variant="outline-secondary" onClick={() => { setSkillInput(""); setSkillSelectorOpen(false); }}>
                          <i className="bi bi-x" />
                        </Button>
                      </InputGroup>
                      <div className="skills-dropdown">
                        {filteredTechs.length > 0 && (
                          <div className="skills-dropdown-section">
                            <div className="skills-dropdown-title">{t("profile.suggested")}</div>
                            {filteredTechs.slice(0, 8).map((t) => (
                              <button key={t.id} type="button" className="skills-dropdown-item" onClick={() => addSkill(t.name)}>
                                <i className="bi bi-plus-circle" />
                                {highlightMatch(t.name, skillInput)}
                              </button>
                            ))}
                          </div>
                        )}
                        {showCreateTech && (
                          <div className="skills-dropdown-section">
                            <button type="button" className="skills-dropdown-item" onClick={() => addSkill(skillInput)}>
                              <i className="bi bi-plus-circle-dotted" />
                              {t("profile.createSkill", { name: skillInput.trim() })}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Tab>

        <Tab eventKey="projects" title={`${t("profile.projects")} (${projects.length})`}>
          <div className="profile-tab-content">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="project-hint text-muted small">
                <i className="bi bi-info-circle me-1" />
                {t("profile.projectsHint")}
              </div>
              {canEdit && (
                <Button size="sm" onClick={addProject}>
                  <i className="bi bi-plus-lg me-1" />
                  {t("profile.addProject")}
                </Button>
              )}
            </div>
            {projects.length === 0 ? (
              <EmptyState
                icon="bi-kanban"
                title={t("profile.projectsEmptyTitle")}
                hint={t("profile.projectsEmptyHint")}
                action={
                  canEdit && (
                    <Button size="sm" variant="primary" onClick={addProject}>
                      <i className="bi bi-plus-lg me-1" />
                      {t("profile.addProject")}
                    </Button>
                  )
                }
              />
            ) : (
              <div className="project-list">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    canEdit={canEdit}
                    presentLabel={t("profile.present")}
                    createLabel={t("common.create")}
                    dragging={dragId === project.id}
                    dragOver={dragOverId === project.id}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onChange={(next) =>
                      setProjects((list) => list.map((p) => (p.id === next.id ? next : p)))
                    }
                    loadTags={loadTags}
                    loadLibrary={loadLibrary}
                    onSave={saveProject}
                    onDelete={async (id) => {
                      await api.delete(`/projects/${id}`);
                      setProjects((list) => list.filter((p) => p.id !== id));
                      toast.success(t("profile.projectDeleted"));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Tab>

        <Tab eventKey="cvs" title={`${t("profile.cvs")} (${cvTotal})`}>
          <div className="profile-tab-content">
            <DataTable
              columns={[
                {
                  key: "position",
                  label: t("profile.position"),
                  render: (r) => r.position?.title || "—",
                },
                {
                  key: "status",
                  label: t("profile.status"),
                  render: (r) => <span className={`status-pill status-${r.status}`}>{r.status}</span>,
                },
                {
                  key: "likesCount",
                  label: t("profile.likes"),
                  render: (r) => <HeartLike count={r.likesCount} liked={r.likedByMe} disabled />,
                },
                {
                  key: "updatedAt",
                  label: t("profile.lastUpdate"),
                  render: (r) => new Date(r.updatedAt).toLocaleString(),
                },
              ]}
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
              selectedIds={canEdit ? selectedCvs : undefined}
              onSelectionChange={canEdit ? setSelectedCvs : undefined}
              onRowClick={(row) => navigate(`/cvs/${row.id}`)}
              toolbar={
                canEdit && selectedCvs.length > 0 ? (
                  <>
                    <ToolbarButton
                      icon="bi-upload"
                      onClick={async () => {
                        await api.post("/cvs/bulk/publish", { ids: selectedCvs });
                        toast.success("Published where complete");
                        setSelectedCvs([]);
                        setCvPage(1);
                        const { data } = await api.get("/cvs", {
                          params: { mine: "true", userId: profileUserId, page: 1, pageSize: 10 },
                        });
                        setCvs(data.data);
                        setCvTotal(data.pagination.total);
                      }}
                    >
                      {t("common.publish")}
                    </ToolbarButton>
                    <ToolbarButton icon="bi-trash" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                      {t("common.delete")}
                    </ToolbarButton>
                  </>
                ) : null
              }
            />
          </div>
        </Tab>
      </Tabs>

      <Modal show={showAddAttr} onHide={() => setShowAddAttr(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t("profile.addAttribute")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="add-attr-modal-body">
            {recentAttrs.length > 0 && (
              <div className="mb-3">
                <div className="text-muted small mb-2">{t("profile.recentlyUsedAttributes")}</div>
                <div className="d-flex flex-wrap gap-2">
                  {recentAttrs.map((a) => (
                    <Button key={a.id} size="sm" variant="outline-secondary" onClick={() => addAttr(a)}>
                      {a.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {suggestedAttrs.length > 0 && (
              <div className="mb-3">
                <div className="text-muted small mb-2">{t("profile.suggestedAttributes")}</div>
                <div className="d-flex flex-wrap gap-2">
                  {suggestedAttrs.map((a) => (
                    <Button key={a.id} size="sm" variant="outline-primary" onClick={() => addAttr(a)}>
                      <i className="bi bi-lightbulb me-1" />
                      {a.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="add-attr-search mb-3">
              <Form.Control
                placeholder={t("common.search")}
                value={attrSearch}
                onChange={(e) => setAttrSearch(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2 mb-3">
              <Form.Select
                value={attrCategory}
                onChange={(e) => setAttrCategory(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                <option value="">{t("common.all")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Form.Select>
            </div>
            {(() => {
              const grouped = {};
              for (const a of library) {
                const cat = a.category || "Other";
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(a);
              }
              const orderedCats = [];
              for (const cat of CATEGORY_ORDER) {
                if (grouped[cat]) orderedCats.push({ category: cat, items: grouped[cat] });
              }
              for (const cat of Object.keys(grouped)) {
                if (!CATEGORY_ORDER.includes(cat)) orderedCats.push({ category: cat, items: grouped[cat] });
              }
              return orderedCats.map(({ category, items }) => {
                const catKey = category.toLowerCase().replace(/\s+/g, "");
                const categoryLabel = t(`profile.categories.${catKey}`) || category;
                const icon = CATEGORY_ICONS[category] || "bi-collection";
                return (
                  <div key={category} className="attr-category-group">
                    <button type="button" className="attr-category-header" onClick={() => {
                      const el = document.getElementById(`attr-cat-${category}`);
                      el.classList.toggle("collapsed");
                    }}>
                      <span><i className={`bi ${icon}`} />{categoryLabel}</span>
                      <i className="bi bi-chevron-down attr-category-chevron" />
                    </button>
                    <div id={`attr-cat-${category}`} className="attr-category-items">
                      {items.map((a) => (
                        <button key={a.id} type="button" className="attr-category-item" onClick={() => addAttr(a)}>
                          <span>
                            <span className="attr-category-item-name">{highlightMatch(a.name, attrSearch)}</span>
                            <div className="attr-category-item-meta">{a.category} · {a.type}</div>
                          </span>
                          <i className="bi bi-plus-lg text-muted" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Modal.Body>
      </Modal>

      <ConfirmDialog
        show={confirmDelete}
        title={t("common.delete")}
        body={`Delete ${selectedCvs.length} CV(s)?`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.delete("/cvs", { data: { ids: selectedCvs } });
          setConfirmDelete(false);
          setSelectedCvs([]);
          const { data } = await api.get("/cvs", {
            params: { mine: "true", userId: profileUserId, page: 1, pageSize: 10 },
          });
          setCvs(data.data);
          setCvTotal(data.pagination.total);
        }}
      />

      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>{t("profile.changePassword")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {passwordMessage && (
            <div className={`alert ${passwordMessage.includes("success") || passwordMessage.includes("sent") ? "alert-success" : "alert-danger"} mb-3`}>
              {passwordMessage}
            </div>
          )}
          <Form onSubmit={handlePasswordRequest}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="profile-current-password">{t("auth.password")}</Form.Label>
              <Form.Control
                id="profile-current-password"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="profile-new-password">{t("profile.newPassword")}</Form.Label>
              <Form.Control
                id="profile-new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="profile-confirm-new-password">{t("profile.confirmNewPassword")}</Form.Label>
              <Form.Control
                id="profile-confirm-new-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="outline-secondary" onClick={() => setShowPasswordModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" type="submit" disabled={passwordLoading || newPassword !== confirmPassword}>
                {passwordLoading ? t("common.loading") : t("profile.requestPasswordChange")}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
