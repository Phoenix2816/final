import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button, Form, Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import { AttributePicker } from "../components/common/AttributeFields";
import TechTagInput from "../components/common/TechTagInput";
import SaveIndicator from "../components/common/SaveIndicator";
import useAutoSave from "../hooks/useAutoSave";
import LoadingSkeleton from "../components/common/LoadingSkeleton";

const empty = {
  title: "",
  shortDescription: "",
  company: "",
  level: "mid",
  visibility: "public",
  attributeTemplate: [],
  accessRules: [],
  projectTags: [],
  maxProjects: 5,
  version: 1,
};

export default function PositionEditPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === "new" || location.pathname.endsWith("/positions/new");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(!isNew);

  const loadTags = async (q) => {
    const { data } = await api.get("/attributes/technologies", { params: { search: q, pageSize: 40 } });
    return data.map((t) => t.name);
  };

  const loadLibrary = async () => {
    const { data } = await api.get("/attributes/technologies/library");
    return data;
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/attributes", { params: { pageSize: 100 } });
        setAttributes(data.data);
      } catch {
        setAttributes([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const { data } = await api.get(`/positions/${id}`);
        setForm({ ...data.position });
      } catch {
        toast.error("Failed to load");
        navigate("/positions");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, navigate]);

  const patch = (partial) => {
    setForm((f) => ({ ...f, ...partial }));
    markDirty();
  };

  const persist = async () => {
    if (isNew) return;
    const { data } = await api.put(`/positions/${id}`, form);
    setForm(data);
  };

  const { status, markDirty, saveNow, setConflictPayload, setStatus } = useAutoSave(persist, {
    enabled: !isNew,
    delay: 7000,
  });

  const create = async () => {
    try {
      const { data } = await api.post("/positions", form);
      toast.success("Created");
      navigate(`/positions/${data.id}/edit`);
    } catch {
      toast.error("Create failed");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header d-flex justify-content-between align-items-center">
        <h1>{isNew ? t("positions.new") : t("common.edit")}</h1>
        <div className="d-flex align-items-center gap-3">
          <SaveIndicator
            status={status}
            onReload={async () => {
              const { data } = await api.get(`/positions/${id}`);
              setForm(data.position);
              setStatus("idle");
              setConflictPayload(null);
            }}
          />
          {isNew ? (
            <Button onClick={create}>{t("common.create")}</Button>
          ) : (
            <Button
              variant="outline-primary"
              onClick={() => saveNow().then(() => toast.success("Saved")).catch(() => {})}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>

      <div className="editor-sections">
        <Card className="editor-card">
          <Card.Body>
            <h3>Basics</h3>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="position-title">Title</Form.Label>
              <Form.Control id="position-title" name="title" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="position-company">{t("positions.company")}</Form.Label>
              <Form.Control id="position-company" name="company" value={form.company} onChange={(e) => patch({ company: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="position-description">{t("positions.shortDescription")}</Form.Label>
              <Form.Control
                id="position-description"
                name="shortDescription"
                as="textarea"
                rows={3}
                value={form.shortDescription}
                onChange={(e) => patch({ shortDescription: e.target.value })}
              />
            </Form.Group>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Label htmlFor="position-level">{t("positions.level")}</Form.Label>
                <Form.Select id="position-level" name="level" value={form.level} onChange={(e) => patch({ level: e.target.value })}>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </Form.Select>
              </div>
              <div className="col-md-4">
                <Form.Label htmlFor="position-visibility">{t("positions.visibility")}</Form.Label>
                <Form.Select
                  id="position-visibility"
                  name="visibility"
                  value={form.visibility}
                  onChange={(e) => patch({ visibility: e.target.value })}
                >
                  <option value="public">{t("positions.public", "Public")}</option>
                  <option value="private">{t("positions.private", "Private")}</option>
                </Form.Select>
                <div className="form-text">
                  {form.visibility === "public"
                    ? t("positions.visibilityPublic")
                    : t("positions.visibilityPrivate")}
                </div>
              </div>
              <div className="col-md-4">
                <Form.Label htmlFor="position-maxProjects">{t("positions.maxProjects")}</Form.Label>
                <Form.Control
                  id="position-maxProjects"
                  name="maxProjects"
                  type="number"
                  value={form.maxProjects}
                  onChange={(e) => patch({ maxProjects: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="editor-card">
          <Card.Body>
            <h3>{t("positions.template")}</h3>
            <AttributePicker
              attributes={attributes}
              value={form.attributeTemplate}
              onChange={(attributeTemplate) => patch({ attributeTemplate })}
            />
          </Card.Body>
        </Card>

        <Card className="editor-card">
          <Card.Body>
            <h3>{t("positions.requiredTechnologies")}</h3>
            <TechTagInput
              value={form.projectTags}
              onChange={(projectTags) => patch({ projectTags })}
              loadOptions={loadTags}
              loadLibrary={loadLibrary}
              createLabel={t("profile.createSkill")}
            />
          </Card.Body>
        </Card>

        <Card className="editor-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="mb-0">{t("positions.accessRules")}</h3>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => {
                  const firstAttr = attributes[0];
                  patch({
                    accessRules: [
                      ...(form.accessRules || []),
                      {
                        attributeId: firstAttr?.id,
                        operator: "=",
                        value: "",
                        type: firstAttr?.type || "string",
                      },
                    ],
                  });
                }}
              >
                <i className="bi bi-plus" />
              </Button>
            </div>
            {(form.accessRules || []).map((rule, idx) => {
              const attr = attributes.find((a) => a.id === rule.attributeId);
              return (
                <div key={idx} className="rule-row row g-2 mb-2 align-items-end">
                  <div className="col-md-4">
                    <Form.Select
                      value={rule.attributeId || ""}
                      onChange={(e) => {
                        const attributeId = Number(e.target.value);
                        const a = attributes.find((x) => x.id === attributeId);
                        const next = [...form.accessRules];
                        next[idx] = { ...rule, attributeId, type: a?.type || "string" };
                        patch({ accessRules: next });
                      }}
                    >
                      {attributes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-md-2">
                    <Form.Select
                      value={rule.operator}
                      onChange={(e) => {
                        const next = [...form.accessRules];
                        next[idx] = { ...rule, operator: e.target.value };
                        patch({ accessRules: next });
                      }}
                    >
                      {(attr?.type === "number"
                        ? ["=", "!=", ">", ">=", "<", "<="]
                        : attr?.type === "boolean"
                        ? ["=", "!="]
                        : ["=", "!=", "contains"]
                      ).map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-md-4">
                    {attr?.type === "boolean" ? (
                      <Form.Select
                        value={String(rule.value)}
                        onChange={(e) => {
                          const next = [...form.accessRules];
                          next[idx] = { ...rule, value: e.target.value === "true" };
                          patch({ accessRules: next });
                        }}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </Form.Select>
                    ) : attr?.type === "dropdown" ? (
                      <Form.Select
                        value={rule.value || ""}
                        onChange={(e) => {
                          const next = [...form.accessRules];
                          next[idx] = { ...rule, value: e.target.value };
                          patch({ accessRules: next });
                        }}
                      >
                        {(attr.options || []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Form.Select>
                    ) : (
                      <Form.Control
                        type={attr?.type === "number" ? "number" : "text"}
                        value={rule.value ?? ""}
                        onChange={(e) => {
                          const next = [...form.accessRules];
                          next[idx] = {
                            ...rule,
                            value: attr?.type === "number" ? Number(e.target.value) : e.target.value,
                          };
                          patch({ accessRules: next });
                        }}
                        placeholder={attr?.kind === "technology" ? "Technology name (e.g. macOS)" : undefined}
                      />
                    )}
                  </div>
                  <div className="col-md-2">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        const next = form.accessRules.filter((_, i) => i !== idx);
                        patch({ accessRules: next });
                      }}
                    >
                      <i className="bi bi-trash" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}