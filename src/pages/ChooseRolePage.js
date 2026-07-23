import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../api/client";

export default function ChooseRolePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const chooseRole = async (role) => {
    setLoading(true);
    try {
      await api.post("/users/me/role", { role });
      toast.success("Role saved");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>{t("auth.chooseRoleTitle")}</h1>
        <p className="text-muted mb-4">{t("auth.chooseRoleHint")}</p>
        <div className="d-grid gap-3">
          <Card className="role-card" onClick={() => chooseRole("candidate")} style={{ cursor: "pointer" }}>
            <Card.Body className="text-center">
              <i className="bi bi-person role-card-icon" />
              <Card.Title>{t("users.roleLabels.candidate")}</Card.Title>
              <Card.Text className="text-muted small">Find jobs, build your CV, and apply to positions.</Card.Text>
            </Card.Body>
          </Card>
          <Card className="role-card" onClick={() => chooseRole("recruiter")} style={{ cursor: "pointer" }}>
            <Card.Body className="text-center">
              <i className="bi bi-briefcase role-card-icon" />
              <Card.Title>{t("users.roleLabels.recruiter")}</Card.Title>
              <Card.Text className="text-muted small">Post positions, review CVs, and manage candidates.</Card.Text>
            </Card.Body>
          </Card>
        </div>
        {loading && <p className="text-center mt-3 mb-0">{t("common.loading")}</p>}
      </div>
    </div>
  );
}
