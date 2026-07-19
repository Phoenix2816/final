import React from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

export default function SaveIndicator({ status, onReload }) {
  const { t } = useTranslation();
  if (status === "idle") return null;

  return (
    <div className={clsx("save-indicator", `status-${status}`)}>
      {status === "dirty" && <span><i className="bi bi-pencil me-1" />…</span>}
      {status === "saving" && (
        <span>
          <span className="spinner-border spinner-border-sm me-1" />
          {t("common.saving")}
        </span>
      )}
      {status === "saved" && (
        <span>
          <i className="bi bi-check2 me-1" />
          {t("common.saved")}
        </span>
      )}
      {status === "conflict" && (
        <span>
          <i className="bi bi-exclamation-triangle me-1" />
          {t("common.conflict")}{" "}
          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={onReload}>
            {t("common.reload")}
          </button>
        </span>
      )}
      {status === "error" && (
        <span className="text-danger">
          <i className="bi bi-x-circle me-1" />
          Error
        </span>
      )}
    </div>
  );
}