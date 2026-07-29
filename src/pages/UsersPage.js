import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Modal, Offcanvas } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";
import DataTable, { ToolbarButton } from "../components/common/DataTable";
import ConfirmDialog from "../components/common/ConfirmDialog";

import { useAuth } from "../contexts/AuthContext";

const ALL_ROLES = ["candidate", "recruiter", "admin"];

const ROLE_PRIORITY = { admin: 3, recruiter: 2, candidate: 1 };

const ROLE_PERMISSIONS = {
  admin: [
    "permissionManageUsers",
    "permissionManagePositions",
    "permissionEditAnyProfile",
    "permissionEditAnyCV",
    "permissionManageAttributes",
  ],
  recruiter: ["permissionManagePositions", "permissionViewCVs", "permissionLikeCVs"],
  candidate: ["permissionManageProfile", "permissionCreateCVs"],
};

const ROLE_ICONS = {
  admin: "bi-shield-lock",
  recruiter: "bi-briefcase",
  candidate: "bi-person",
};

const STATUS_CONFIG = {
  active: { icon: "bi-circle-fill", color: "#1f9d6b", label: "Active" },
  blocked: { icon: "bi-circle-fill", color: "#c23b3b", label: "Blocked" },
  pending: { icon: "bi-circle-fill", color: "#c9891a", label: "Pending" },
};

function getPrimaryRole(roles = []) {
  let best = "candidate";
  let bestPriority = 0;
  for (const role of roles) {
    const priority = ROLE_PRIORITY[role] || 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      best = role;
    }
  }
  return best;
}

function formatLastLogin(value) {
  if (!value) return { type: "never", text: null };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { type: "never", text: null };
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  if (isToday) return { type: "today", text: time };
  if (isYesterday) return { type: "yesterday", text: time };

  const month = date.toLocaleString(undefined, { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return { type: "date", text: `${month} ${day}, ${year}`, time };
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [blocked, setBlocked] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("DESC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rolesModal, setRolesModal] = useState(null);
  const [roleDraft, setRoleDraft] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: {
          search,
          role: role || undefined,
          blocked: blocked || undefined,
          sortBy,
          sortDir,
          page,
          pageSize,
        },
      });
      setRows(data.data);
      setTotal(data.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [search, role, blocked, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search, role, blocked, sortBy, sortDir, page, pageSize, load]);

  const stats = useMemo(() => {
    const totalUsers = total;
    const candidates = rows.filter((r) => r.roles?.includes("candidate")).length;
    const recruiters = rows.filter((r) => r.roles?.includes("recruiter")).length;
    const admins = rows.filter((r) => r.roles?.includes("admin")).length;
    const blockedUsers = rows.filter((r) => r.isBlocked).length;
    return { totalUsers, candidates, recruiters, admins, blockedUsers };
  }, [rows, total]);

  const avatarSrc = (user) => {
    if (user.photo) return user.photo;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "?";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f6e56&color=fff`;
  };

  const userInitials = (user) => {
    const first = (user.firstName || "").trim();
    const last = (user.lastName || "").trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  };

  const openDrawer = (row) => {
    setDrawerUser(row);
  };

  const closeDrawer = () => {
    setDrawerUser(null);
  };

  const columns = [
    {
      key: "user",
      label: t("users.title"),
      width: "320px",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <div className="user-avatar-circle">
            {r.photo ? (
              <img src={avatarSrc(r)} alt="" className="user-avatar-img" />
            ) : (
              <span className="user-avatar-initials">{userInitials(r)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="user-name-text">
              {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
            </div>
            <div className="user-email-text">{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "primaryRole",
      label: t("users.primaryRole"),
      render: (r) => {
        const primary = getPrimaryRole(r.roles);
        const icon = ROLE_ICONS[primary] || "bi-person";
        const label = t(`users.roleLabels.${primary}`) || primary;
        const desc = t(`users.roleDescription.${primary}`);
        return (
          <div className="d-flex flex-column">
            <span className="badge role-badge role-badge-primary">
              <i className={`bi ${icon} me-1`} />
              {label}
            </span>
            {desc && <span className="text-muted small mt-1">{desc}</span>}
          </div>
        );
      },
    },
    {
      key: "isBlocked",
      label: t("users.blocked"),
      sortable: true,
      render: (r) => {
        const config = r.isBlocked ? STATUS_CONFIG.blocked : STATUS_CONFIG.active;
        return (
          <span className="badge status-badge status-badge-custom" style={{ background: `${config.color}14`, color: config.color, borderColor: `${config.color}35` }}>
            <i className={`bi ${config.icon} me-1`} style={{ fontSize: "0.6rem" }} />
            {t(`users.status.${r.isBlocked ? "blocked" : "active"}`)}
          </span>
        );
      },
    },
    {
      key: "lastLoginAt",
      label: t("users.lastLogin"),
      sortable: true,
      render: (r) => {
        const formatted = formatLastLogin(r.lastLoginAt);
        if (formatted.type === "never") {
          return <span className="text-muted">{t("users.neverLoggedIn")}</span>;
        }
        return (
          <div className="d-flex flex-column">
            <span className="fw-semibold">{t(`users.${formatted.type}`)}</span>
            <span className="text-muted small">{formatted.text}</span>
          </div>
        );
      },
    },
  ];

  const drawerPermissions = useMemo(() => {
    if (!drawerUser) return [];
    const primary = getPrimaryRole(drawerUser.roles);
    return ROLE_PERMISSIONS[primary] || [];
  }, [drawerUser]);

  return (
    <div className="page-shell">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
        <div>
          <h1 className="mb-1">{t("users.title")}</h1>
          <p className="text-muted mb-0 small">{t("users.subtitle")}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <div className="stat-card stat-card-total">
            <div className="stat-card-icon"><i className="bi bi-people" /></div>
            <div>
              <div className="stat-card-value">{stats.totalUsers}</div>
              <div className="stat-card-label">{t("users.stats.total")}</div>
            </div>
          </div>
          <div className="stat-card stat-card-success">
            <div className="stat-card-icon"><i className="bi bi-person" /></div>
            <div>
              <div className="stat-card-value">{stats.candidates}</div>
              <div className="stat-card-label">{t("users.stats.candidates")}</div>
            </div>
          </div>
          <div className="stat-card stat-card-primary">
            <div className="stat-card-icon"><i className="bi bi-briefcase" /></div>
            <div>
              <div className="stat-card-value">{stats.recruiters}</div>
              <div className="stat-card-label">{t("users.stats.recruiters")}</div>
            </div>
          </div>
          <div className="stat-card stat-card-danger">
            <div className="stat-card-icon"><i className="bi bi-shield-lock" /></div>
            <div>
              <div className="stat-card-value">{stats.admins}</div>
              <div className="stat-card-label">{t("users.stats.admins")}</div>
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-card-icon"><i className="bi bi-lock" /></div>
            <div>
              <div className="stat-card-value">{stats.blockedUsers}</div>
              <div className="stat-card-label">{t("users.stats.blocked")}</div>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={search}
        onSearchChange={(v) => {
          setPage(1);
          setSearch(v);
        }}
        searchPlaceholder={t("users.searchPlaceholder")}
        filters={
          <>
            <Form.Select
              value={role}
              onChange={(e) => {
                setPage(1);
                setRole(e.target.value);
              }}
              style={{ maxWidth: 150 }}
            >
              <option value="">{t("users.filterRole")}</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`users.roleLabels.${r}`) || r}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={blocked}
              onChange={(e) => {
                setPage(1);
                setBlocked(e.target.value);
              }}
              style={{ maxWidth: 140 }}
            >
              <option value="">{t("users.filterStatus")}</option>
              <option value="false">{t("users.status.active")}</option>
              <option value="true">{t("users.status.blocked")}</option>
            </Form.Select>
          </>
        }
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(f, d) => {
          setSortBy(f);
          setSortDir(d);
        }}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={openDrawer}
        toolbar={
          selected.length > 0 ? (
            <>
              <ToolbarButton
                icon="bi-slash-circle"
                onClick={async () => {
                  try {
                    await api.post("/users/bulk/block", { ids: selected });
                    toast.success("Blocked");
                    setSelected([]);
                    load();
                  } catch {
                    toast.error("Block failed");
                  }
                }}
              >
                {t("common.block")}
              </ToolbarButton>
              <ToolbarButton
                icon="bi-check2-circle"
                onClick={async () => {
                  try {
                    await api.post("/users/bulk/unblock", { ids: selected });
                    toast.success("Unblocked");
                    setSelected([]);
                    load();
                  } catch {
                    toast.error("Unblock failed");
                  }
                }}
              >
                {t("common.unblock")}
              </ToolbarButton>
              <ToolbarButton
                icon="bi-person-gear"
                onClick={() => {
                  const user = rows.find((r) => r.id === selected[0]);
                  if (!user) return;
                  setRolesModal(user);
                  setRoleDraft([...(user.roles || [])]);
                }}
              >
                {t("users.assignRoles")}
              </ToolbarButton>
              <ToolbarButton icon="bi-trash" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </ToolbarButton>
            </>
          ) : null
        }
        stickyToolbar
        emptyState={
          <div className="empty-state-custom">
            <div className="empty-state-icon">
              <i className="bi bi-people" />
            </div>
            <div className="empty-state-title">{t("users.emptyTitle")}</div>
            <div className="empty-state-hint">{t("users.emptyHint")}</div>
          </div>
        }
      />

      <Offcanvas show={Boolean(drawerUser)} onHide={closeDrawer} placement="end" size="lg">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{t("users.details")}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {drawerUser && (
            <div className="user-drawer">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="user-avatar-circle user-avatar-lg">
                  {drawerUser.photo ? (
                    <img src={avatarSrc(drawerUser)} alt="" className="user-avatar-img" />
                  ) : (
                    <span className="user-avatar-initials">{userInitials(drawerUser)}</span>
                  )}
                </div>
                <div>
                  <div className="fw-bold fs-5">
                    {[drawerUser.firstName, drawerUser.lastName].filter(Boolean).join(" ") || drawerUser.email}
                  </div>
                  <div className="text-muted">{drawerUser.email}</div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">{t("users.primaryRole")}</div>
                  <div className="detail-value">
                    <span className="badge role-badge role-badge-primary">
                      <i className={`bi ${ROLE_ICONS[getPrimaryRole(drawerUser.roles)]} me-1`} />
                      {t(`users.roleLabels.${getPrimaryRole(drawerUser.roles)}`)}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("users.accountStatus")}</div>
                  <div className="detail-value">
                    {drawerUser.isBlocked ? (
                      <span className="badge status-badge status-badge-blocked">{t("users.status.blocked")}</span>
                    ) : (
                      <span className="badge status-badge status-badge-active">{t("users.status.active")}</span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("users.lastLogin")}</div>
                  <div className="detail-value">
                    {drawerUser.lastLoginAt ? new Date(drawerUser.lastLoginAt).toLocaleString() : t("users.neverLoggedIn")}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t("users.createdAt")}</div>
                  <div className="detail-value">
                    {drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>

               <div className="mt-4">
                 <h6 className="fw-bold mb-3">{t("users.permissions")}</h6>
                 <div className="permission-list">
                   {drawerPermissions.map((perm) => (
                     <span key={perm} className="permission-item">
                       <i className="bi bi-check2-circle" />
                       {t(`users.${perm}`)}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={Boolean(rolesModal)} onHide={() => setRolesModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>{t("users.assignRoles")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {ALL_ROLES.map((r) => (
            <Form.Check
              key={r}
              type="checkbox"
              label={t(`users.roleLabels.${r}`) || r}
              checked={roleDraft.includes(r)}
              onChange={(e) => {
                if (e.target.checked) setRoleDraft([...roleDraft, r]);
                else setRoleDraft(roleDraft.filter((x) => x !== r));
              }}
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setRolesModal(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={async () => {
              try {
                await api.put(`/users/${rolesModal.id}/roles`, { roles: roleDraft });
                setRolesModal(null);
                toast.success("Roles updated");
                load();
              } catch {
                toast.error("Failed to update roles");
              }
            }}
          >
            {t("common.save")}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={confirmDelete}
        title={t("common.delete")}
        body={`Delete ${selected.length} user(s)?`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await api.delete("/users/bulk", { data: { ids: selected } });
            const deletedSelf = selected.some((id) => Number(id) === Number(user?.id));
            setConfirmDelete(false);
            setSelected([]);
            if (deletedSelf) {
              toast.success("Your account has been deleted");
              setTimeout(() => {
                window.location.href = "/login";
              }, 1200);
            } else {
              load();
            }
          } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              toast.success("Your account has been deleted");
              setTimeout(() => {
                window.location.href = "/login";
              }, 1200);
            } else {
              toast.error("Delete failed");
            }
          }
        }}
      />
    </div>
  );
}
