// Deterministic color assignment for technology tags.
// Keeps the same tag visually consistent across the app without storing colors.

const PALETTE = {
  "Frontend": { bg: "#e3f2fd", fg: "#0b5cad", border: "#bcdcfb" },
  "Backend": { bg: "#e8f5e9", fg: "#1b7a3d", border: "#bfe6c8" },
  "Programming Languages": { bg: "#f3e5f5", fg: "#7b1fa2", border: "#e1bee7" },
  "Databases": { bg: "#ede7f6", fg: "#5e35b1", border: "#d6c8f0" },
  "Cloud": { bg: "#fff3e0", fg: "#b46b00", border: "#ffe0b2" },
  "DevOps": { bg: "#eceff1", fg: "#455a64", border: "#cfd8dc" },
  "Tools": { bg: "#f1f8e9", fg: "#558b2f", border: "#dcefc0" },
  "API Technologies": { bg: "#e0f7fa", fg: "#00708a", border: "#b6ebf2" },
  "Testing": { bg: "#fbe9e7", fg: "#c0392b", border: "#f6c9c2" },
  "Mobile": { bg: "#fce4ec", fg: "#b0306b", border: "#f7c4d8" },
  "AI / Machine Learning": { bg: "#fce4ec", fg: "#ad1457", border: "#f8bbd0" },
  "CMS": { bg: "#fffde7", fg: "#9a8600", border: "#fff3b0" },
  "Build Tools": { bg: "#e0f2f1", fg: "#00695c", border: "#b2dfdb" },
  "Message Brokers": { bg: "#efebe9", fg: "#4e342e", border: "#d7ccc8" },
  "Operating Systems": { bg: "#f5f5f5", fg: "#424242", border: "#e0e0e0" },
  "Technologies": { bg: "#e3f2fd", fg: "#0b5cad", border: "#bcdcfb" },
  "Other": { bg: "#f5f5f5", fg: "#616161", border: "#e0e0e0" },
};

const FALLBACK = { bg: "#f5f5f5", fg: "#616161", border: "#e0e0e0" };

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const PASTEL_BG = [
  "#e3f2fd", "#f3e5f5", "#e8f5e9", "#fff3e0", "#e0f7fa",
  "#fce4ec", "#f1f8e9", "#ede7f6", "#eceff1", "#fbe9e7",
];

const PASTEL_FG = [
  "#0b5cad", "#7b1fa2", "#1b7a3d", "#b46b00", "#00708a",
  "#b0306b", "#558b2f", "#5e35b1", "#455a64", "#c0392b",
];

function generateColor(str) {
  const h = hashString(str);
  const bgIdx = h % PASTEL_BG.length;
  const fgIdx = (h >> 2) % PASTEL_FG.length;
  const bg = PASTEL_BG[bgIdx];
  const fg = PASTEL_FG[fgIdx];
  return { bg, fg, border: bg };
}

export function tagColor(tag) {
  if (!tag) return FALLBACK;
  if (PALETTE[tag]) return PALETTE[tag];
  return generateColor(tag);
}

export function TagPill({ tag, onRemove, size = "md" }) {
  const c = tagColor(tag);
  const style = {
    background: c.bg,
    color: c.fg,
    borderColor: c.border,
  };
  const className = `tag-pill tag-pill-${size}`;
  if (onRemove) {
    return (
      <span className={className} style={style}>
        {tag}
        <button
          type="button"
          className="tag-pill-remove"
          aria-label={`Remove ${tag}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
        >
          <i className="bi bi-x" />
        </button>
      </span>
    );
  }
  return (
    <span className={className} style={style}>
      {tag}
    </span>
  );
}
