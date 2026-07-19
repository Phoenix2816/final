import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TagPill } from "./TechTag";

// Highlight the matched portion of a suggestion against the current query.
function highlight(text, query) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="tech-tag-hl">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// HH.ru / LinkedIn-style technology selector.
// - Clicking the field shows Recently Used + Popular technologies.
// - Typing filters the comprehensive library instantly, grouped by category,
//   with the matched text highlighted.
// - Category chips let users browse the library by category.
// - Selected technologies are hidden/disabled in the dropdown (no duplicates).
// - A "Create '<query>'" option appears when there is no exact match.
// - Full keyboard navigation (arrows, Enter, Backspace, Escape).
export default function TechTagInput({
  value = [],
  onChange,
  loadOptions,
  loadLibrary,
  placeholder = "Search technologies…",
  createLabel = "Create",
  readOnly = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [category, setCategory] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Library payload: { categories, flat, popular, recent, counts }
  const [library, setLibrary] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const loadLibraryData = useCallback(async () => {
    if (!loadLibrary) return;
    try {
      const data = await loadLibrary();
      setLibrary(data);
    } catch {
      /* ignore */
    }
  }, [loadLibrary]);

  useEffect(() => {
    if (open) loadLibraryData();
  }, [open, loadLibraryData]);

  // Fetch search results when typing.
  useEffect(() => {
    if (!loadOptions) return;
    let cancelled = false;
    (async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const opts = await loadOptions(query);
        if (!cancelled) setSearchResults((opts || []).filter((t) => !value.includes(t)));
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, loadOptions, value]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Derived values (computed unconditionally to respect Rules of Hooks).
  const q = query.trim();
  const exactMatch = q && (library?.flat || []).some((t) => t.toLowerCase() === q.toLowerCase());
  const selectedSet = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);
  const canCreate = q.length > 0 && !selectedSet.has(q.toLowerCase()) && !exactMatch;
  const recent = useMemo(() => library?.recent || [], [library]);
  const popular = useMemo(() => library?.popular || [], [library]);
  const categories = useMemo(() => library?.categories || {}, [library]);

  const filteredCategories = useMemo(() => {
    if (!q) return {};
    const out = {};
    for (const [cat, items] of Object.entries(categories)) {
      const matched = items.filter(
        (t) => t.toLowerCase().includes(q.toLowerCase()) && !selectedSet.has(t.toLowerCase())
      );
      if (matched.length) out[cat] = matched;
    }
    return out;
  }, [q, categories, selectedSet]);

  const flatOptions = useMemo(() => {
    if (q) {
      const fromSearch = searchResults.filter((t) => !selectedSet.has(t.toLowerCase()));
      if (fromSearch.length) return fromSearch;
      return Object.values(filteredCategories).flat();
    }
    const rec = recent.filter((t) => !selectedSet.has(t.toLowerCase()));
    const pop = popular.filter((t) => !selectedSet.has(t.toLowerCase()));
    return [...new Set([...rec, ...pop])];
  }, [q, searchResults, filteredCategories, recent, popular, selectedSet]);

  if (readOnly) {
    return (
      <div className="tech-tag-readonly d-flex flex-wrap gap-1">
        {value.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>
    );
  }

  const commit = (tag) => {
    const t = (tag || "").trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, t]);
    setQuery("");
    setActive(-1);
    setOpen(true);
    setCategory(null);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, flatOptions.length + (canCreate ? 0 : -1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < flatOptions.length) commit(flatOptions[active]);
      else if (canCreate) commit(q);
      else if (flatOptions.length) commit(flatOptions[0]);
    } else if (e.key === "Backspace" && !query && value.length) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const renderOption = (tag, i) => (
    <li
      key={tag}
      className={`tech-tag-option ${i === active ? "active" : ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        commit(tag);
      }}
      onMouseEnter={() => setActive(i)}
    >
      <TagPill tag={tag} />
      {q && <span className="tech-tag-option-name">{highlight(tag, q)}</span>}
    </li>
  );

  // ----- Dropdown content -----
  const dropdown = (
    <div className="tech-tag-dropdown" ref={listRef}>
      {/* Category chips */}
      {!q && (
        <div className="tech-tag-cats">
          <button
            type="button"
            className={`tech-tag-cat ${category === null ? "active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setCategory(null);
            }}
          >
            All
          </button>
          {Object.keys(categories).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`tech-tag-cat ${category === cat ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setCategory(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {q ? (
        <>
          {Object.keys(filteredCategories).length > 0 ? (
            Object.entries(filteredCategories).map(([cat, items]) => (
              <div key={cat} className="tech-tag-group">
                <div className="tech-tag-group-title">{cat}</div>
                <ul className="tech-tag-group-list">
                  {items.map((t) => renderOption(t, flatOptions.indexOf(t)))}
                </ul>
              </div>
            ))
          ) : searchResults.filter((t) => !selectedSet.has(t.toLowerCase())).length > 0 ? (
            <ul className="tech-tag-group-list">
              {searchResults
                .filter((t) => !selectedSet.has(t.toLowerCase()))
                .map((t) => renderOption(t, flatOptions.indexOf(t)))}
            </ul>
          ) : (
            <div className="tech-tag-empty">No matching technology found</div>
          )}
        </>
      ) : (
        <>
          {category === null && recent.length > 0 && (
            <div className="tech-tag-group">
              <div className="tech-tag-group-title">Recently Used</div>
              <ul className="tech-tag-group-list">
                {recent
                  .filter((t) => !selectedSet.has(t.toLowerCase()))
                  .map((t) => renderOption(t, flatOptions.indexOf(t)))}
              </ul>
            </div>
          )}
          <div className="tech-tag-group">
            <div className="tech-tag-group-title">
              {category ? category : "Popular Technologies"}
            </div>
            <ul className="tech-tag-group-list">
              {(category ? categories[category] || [] : popular)
                .filter((t) => !selectedSet.has(t.toLowerCase()))
                .map((t) => renderOption(t, flatOptions.indexOf(t)))}
            </ul>
          </div>
        </>
      )}

      {canCreate && (
        <li
          className={`tech-tag-option tech-tag-create ${active === flatOptions.length ? "active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            commit(q);
          }}
          onMouseEnter={() => setActive(flatOptions.length)}
        >
          <i className="bi bi-plus-circle me-1" />
          {createLabel} &ldquo;{q}&rdquo;
        </li>
      )}
    </div>
  );

  return (
    <div className="tech-tag-input" ref={wrapRef}>
      <div
        className="tech-tag-field"
        onMouseDown={(e) => {
          // Prevent the field click from blurring the input or stealing the
          // already-typed text; just refocus the input if needed.
          if (e.target !== inputRef.current) e.preventDefault();
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value.map((tag) => (
          <TagPill key={tag} tag={tag} onRemove={removeTag} />
        ))}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          className="tech-tag-text"
          value={query}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && dropdown}
    </div>
  );
}
