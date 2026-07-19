import React from "react";
import { useTranslation } from "react-i18next";

export default function EmptyState({ icon = "bi-inbox", title, hint, action }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`} />
      </div>
      <h3 className="empty-state-title">{title || t("common.noData")}</h3>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action}
    </div>
  );
}
