import React from "react";

export default function LoadingSkeleton({ rows = 4, height = 56 }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ height, animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}