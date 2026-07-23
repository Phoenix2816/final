import React, { useCallback } from "react";
import { Form } from "react-bootstrap";
import { useDropzone } from "react-dropzone";
import MDEditor from "@uiw/react-md-editor";
import ReactMarkdown from "react-markdown";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";
import api, { API_URL } from "../../api/client";
import toast from "react-hot-toast";
import { formatCategory } from "../../utils/categoryHelpers";

// Resolve a possibly-relative upload path (e.g. "/uploads/x.png") to an
// absolute URL so the browser can load it from the API server.
export function resolveImageUrl(value) {
  if (!value) return value;
  const url = typeof value === "string" ? value : value?.url;
  if (!url || typeof url !== "string") return url;
  if (/^(https?:|data:)/i.test(url)) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function AttributeValueInput({ type, value, onChange, options = [], readOnly, missing }) {
  const className = missing ? "is-invalid missing-field" : "";

  if (readOnly) {
    return <AttributeValueDisplay type={type} value={value} missing={missing} />;
  }

  switch (type) {
    case "boolean":
      return (
        <Form.Check
          type="switch"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "number":
      return (
        <Form.Control
          type="number"
          className={className}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <Form.Control
          type="date"
          className={className}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "period":
      return (
        <div className="d-flex gap-2">
          <Form.Control
            type="date"
            className={className}
            value={value?.from || ""}
            onChange={(e) => onChange({ ...(value || {}), from: e.target.value })}
          />
          <Form.Control
            type="date"
            className={className}
            value={value?.to || ""}
            onChange={(e) => onChange({ ...(value || {}), to: e.target.value })}
          />
        </div>
      );
    case "dropdown":
      return (
        <Form.Select
          className={className}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Form.Select>
      );
    case "markdown":
      return (
        <div data-color-mode="auto" className={missing ? "missing-md" : ""}>
          <MDEditor value={value || ""} onChange={(v) => onChange(v || "")} height={160} />
        </div>
      );
    case "image":
      return (
        <div>
          <ImageUpload
            value={typeof value === "string" ? value : value?.url || ""}
            onChange={(url) => onChange({ url, caption: typeof value === "string" ? "" : value?.caption || "" })}
            missing={missing}
          />
          <Form.Control
            className="mt-2"
            size="sm"
            placeholder="Certificate info..."
            value={typeof value === "string" ? "" : value?.caption || ""}
            onChange={(e) =>
              onChange({ url: typeof value === "string" ? value : value?.url || "", caption: e.target.value })
            }
          />
        </div>
      );
    default:
      return (
        <Form.Control
          className={className}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function AttributeValueDisplay({ type, value, missing }) {
  if (missing || value == null || value === "") {
    return <span className="text-danger fw-semibold">Missing</span>;
  }
  if (type === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (type === "markdown") return <ReactMarkdown>{String(value)}</ReactMarkdown>;
  if (type === "period") return <span>{value?.from || "?"} → {value?.to || "?"}</span>;
  if (type === "image") {
    const url = typeof value === "string" ? value : value?.url;
    const caption = typeof value === "string" ? "" : value?.caption;
    return (
      <div>
        {url ? (
          <img src={resolveImageUrl(url)} alt={caption || "Certificate"} className="attr-image-thumb" />
        ) : (
          <span className="text-danger">Missing</span>
        )}
        {caption && <div className="small text-muted mt-1">{caption}</div>}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

const CLOUDINARY_CLOUD = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_SIZE = 5 * 1024 * 1024;

async function uploadToCloudinary(file) {
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }
  return json.secure_url;
}

export function ImageUpload({ value, onChange, missing }) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const onDrop = useCallback(
    async (files) => {
      const file = files[0];
      if (!file) return;
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Unsupported file type. Use JPG, PNG or WEBP.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File is too large. Maximum size is 5 MB.");
        return;
      }

      const useCloud = Boolean(CLOUDINARY_CLOUD && CLOUDINARY_PRESET);
      setUploading(true);
      try {
        let url;
        if (useCloud) {
          try {
            url = await uploadToCloudinary(file);
          } catch {
            // fallback to server proxy if direct upload fails
          }
        }
        if (!url) {
          const form = new FormData();
          form.append("file", file);
          if (value && typeof value === "string" && value.startsWith("http")) {
            form.append("oldUrl", value);
          }
          const { data } = await api.post("/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (!data || !data.url) {
            throw new Error(data?.error || "Upload failed");
          }
          url = data.url;
          if (data.warning) toast(data.warning, { icon: "⚠️" });
        }
        onChange(url);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
  });

  return (
    <div>
      {value && typeof value === "string" && !value.startsWith("data:") && (
        <img src={resolveImageUrl(value)} alt="" className="attr-image-preview mb-2" />
      )}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""} ${missing ? "missing-field" : ""}`}
      >
        <input {...getInputProps()} />
        <i className="bi bi-cloud-arrow-up me-2" />
        {uploading ? "Uploading…" : isDragActive ? "Drop the image…" : "Drop image or click to upload"}
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

export function TagInput({ value = [], onChange, loadOptions, placeholder = "Tags" }) {
  const [options, setOptions] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loadOptions) return;
      const opts = await loadOptions("");
      if (!cancelled) setOptions((opts || []).map((t) => ({ value: t, label: t })));
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOptions]);

  return (
    <CreatableSelect
      isMulti
      placeholder={placeholder}
      value={(value || []).map((t) => ({ value: t, label: t }))}
      options={options}
      onChange={(selected) => onChange((selected || []).map((s) => s.value))}
      onInputChange={(input, meta) => {
        if (meta.action === "input-change" && loadOptions) {
          loadOptions(input).then((opts) =>
            setOptions((opts || []).map((t) => ({ value: t, label: t })))
          );
        }
        return input;
      }}
      classNamePrefix="tf-select"
    />
  );
}

export function AttributePicker({ attributes, value, onChange, isMulti = true }) {
  const { t } = useTranslation();
  const options = (attributes || []).map((a) => ({
    value: a.id,
    label: `${formatCategory(a.category, t)} / ${a.name}`,
  }));
  return (
    <Select
      isMulti={isMulti}
      options={options}
      value={
        isMulti
          ? options.filter((o) => (value || []).includes(o.value))
          : options.find((o) => o.value === value) || null
      }
      onChange={(selected) => {
        if (isMulti) onChange((selected || []).map((s) => s.value));
        else onChange(selected?.value || null);
      }}
      classNamePrefix="tf-select"
    />
  );
}