import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

export default function HeartLike({ liked, count, onToggle, disabled, showLabel, size = 22 }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={clsx("heart-like", liked && "liked", showLabel && "heart-like--labeled")}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle?.();
      }}
      disabled={disabled}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="heart-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="heart-outline"
          d="M12 21s-6.7-4.35-9.33-7.4C.4 10.9 1.1 7.1 4.05 5.55 6.2 4.4 8.55 4.9 10 6.5c.35.4.7.85 1 1.3.3-.45.65-.9 1-1.3 1.45-1.6 3.8-2.1 5.95-.95 2.95 1.55 3.65 5.35 1.38 8.05C18.7 16.65 12 21 12 21z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          className="heart-fill"
          d="M12 21s-6.7-4.35-9.33-7.4C.4 10.9 1.1 7.1 4.05 5.55 6.2 4.4 8.55 4.9 10 6.5c.35.4.7.85 1 1.3.3-.45.65-.9 1-1.3 1.45-1.6 3.8-2.1 5.95-.95 2.95 1.55 3.65 5.35 1.38 8.05C18.7 16.65 12 21 12 21z"
        />
      </svg>
      <span className="heart-count">{count ?? 0}</span>
      {showLabel && <span className="heart-label">{t("cv.likesLabel")}</span>}
    </button>
  );
}