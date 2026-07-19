import React, { useState, useMemo } from "react";
import { Button, Form } from "react-bootstrap";
import MDEditor from "@uiw/react-md-editor";
import { TagPill } from "./TechTag";
import TechTagInput from "./TechTagInput";

function formatPeriod(startDate, endDate, currentlyWorking, presentLabel) {
  const start = startDate ? new Date(startDate).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
  if (currentlyWorking || !endDate) return [start, presentLabel].filter(Boolean).join(" – ");
  const end = new Date(endDate).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return [start, end].filter(Boolean).join(" – ");
}

function plainPreview(md = "", max = 180) {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "…";
}

export default function ProjectCard({
  project,
  canEdit,
  presentLabel,
  loadTags,
  loadLibrary,
  createLabel,
  onChange,
  onSave,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
  dragOver,
}) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState(project);

  // Keep local state in sync when project changes externally (e.g. after save).
  const synced = useMemo(() => {
    if (project.version !== local.version && project.updatedAt !== local.updatedAt) return project;
    return local;
  }, [project, local]);

  const patch = (updates) => {
    const next = { ...synced, ...updates };
    setLocal(next);
    onChange(next);
  };

  const save = () => onSave(synced);

  const period = formatPeriod(synced.startDate, synced.endDate, synced.currentlyWorking, presentLabel);

  return (
    <div
      className={`project-card ${dragging ? "dragging" : ""} ${dragOver ? "drag-over" : ""}`}
      draggable={canEdit}
      onDragStart={(e) => onDragStart?.(e, project.id)}
      onDragOver={(e) => onDragOver?.(e, project.id)}
      onDrop={(e) => onDrop?.(e, project.id)}
      onDragEnd={(e) => onDragStart?.(e, null)}
    >
      <div className="project-card-head">
        {canEdit && (
          <span className="project-drag-handle" title="Drag to reorder">
            <i className="bi bi-grip-vertical" />
          </span>
        )}
        <div className="project-card-titles">
          <h3 className="project-card-name">{synced.name || "Untitled Project"}</h3>
          {(synced.startDate || synced.currentlyWorking) && (
            <div className="project-card-period">{period}</div>
          )}
        </div>
        {canEdit && (
          <div className="project-card-actions">
            <Button
              size="sm"
              variant="link"
              className="project-expand-btn"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand / edit"}
            >
              <i className={`bi ${expanded ? "bi-chevron-up" : "bi-pencil-square"}`} />
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-danger"
              onClick={() => onDelete?.(project.id)}
              title="Delete project"
            >
              <i className="bi bi-trash" />
            </Button>
          </div>
        )}
      </div>

      {(synced.tags || []).length > 0 && (
        <div className="project-card-tags d-flex flex-wrap gap-1">
          {synced.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      )}

      {!expanded ? (
        <div className="project-card-preview">
          {plainPreview(synced.description) ? (
            <p>{plainPreview(synced.description)}</p>
          ) : (
            <p className="project-card-preview-empty">No description yet.</p>
          )}
        </div>
      ) : (
        canEdit && (
          <div className="project-card-editor" data-color-mode="auto">
            <Form.Control
              className="mb-2 fw-semibold"
              placeholder="Project name"
              value={synced.name || ""}
              onChange={(e) => patch({ name: e.target.value })}
              onBlur={save}
            />
            <div className="row g-2 mb-2">
              <div className="col-6">
                <Form.Label className="small text-muted mb-0">Start date</Form.Label>
                <Form.Control
                  type="date"
                  value={synced.startDate || ""}
                  onChange={(e) => patch({ startDate: e.target.value || null })}
                  onBlur={save}
                />
              </div>
              <div className="col-6">
                <Form.Label className="small text-muted mb-0">End date</Form.Label>
                <Form.Control
                  type="date"
                  disabled={synced.currentlyWorking}
                  value={synced.endDate || ""}
                  onChange={(e) => patch({ endDate: e.target.value || null })}
                  onBlur={save}
                />
              </div>
            </div>
            <Form.Check
              type="switch"
              id={`cw-${project.id}`}
              className="mb-2"
              label="Currently working"
              checked={Boolean(synced.currentlyWorking)}
              onChange={(e) =>
                patch({ currentlyWorking: e.target.checked, endDate: e.target.checked ? null : synced.endDate })
              }
            />
            <div className="mb-2">
              <div className="small text-muted mb-1">Technologies</div>
              <TechTagInput
                value={synced.tags || []}
                onChange={(tags) => {
                  patch({ tags });
                  onSave({ ...synced, tags });
                }}
                loadOptions={loadTags}
                loadLibrary={loadLibrary}
                createLabel={createLabel}
              />
            </div>
            <div className="small text-muted mb-1">Description</div>
            <MDEditor
              value={synced.description || ""}
              height={260}
              preview="live"
              onChange={(v) => patch({ description: v || "" })}
              onBlur={save}
            />
            <div className="text-end mt-2">
              <Button size="sm" variant="outline-secondary" onClick={() => setExpanded(false)}>
                Done
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
