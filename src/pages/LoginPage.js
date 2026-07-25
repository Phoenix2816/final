import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Form, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api, { API_URL } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState({ google: false, github: false });
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setAlertVariant] = useState("info");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    const info = searchParams.get("info");
    const error = searchParams.get("error");
    if (info === "confirmed") {
      setAlertMessage(t("auth.confirmEmailSuccess"));
      setAlertVariant("success");
    } else if (info === "already_confirmed") {
      setAlertMessage(t("auth.confirmEmailSuccess"));
      setAlertVariant("success");
    } else if (error === "token_expired") {
      setAlertMessage(t("auth.confirmEmailExpired"));
      setAlertVariant("danger");
    } else if (error === "invalid_token") {
      setAlertMessage(t("auth.confirmEmailInvalid"));
      setAlertVariant("danger");
    } else if (error === "user_blocked") {
      setAlertMessage(t("auth.userBlocked"));
      setAlertVariant("danger");
    }
  }, [searchParams, navigate, t]);

  useEffect(() => {
    api.get("/auth/providers").then((r) => setProviders(r.data)).catch(() => {});
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome");
      navigate("/");
    } catch (err) {
      const errorKey = err.response?.data?.error;
      const errorMessage = errorKey ? t(`auth.${errorKey}`) || errorKey : "Login failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="brand-mark mb-3 justify-content-center">
          <span className="brand-icon">TF</span>
          <span className="brand-text">{t("appName")}</span>
        </div>
        <h1>{t("auth.loginTitle")}</h1>
        {alertMessage && <Alert variant={alertVariant}>{alertMessage}</Alert>}
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="login-email">{t("auth.email")}</Form.Label>
            <Form.Control
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="login-password">{t("auth.password")}</Form.Label>
            <Form.Control
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Form.Group>
          <Button type="submit" className="w-100" disabled={loading}>
            {t("auth.signIn")}
          </Button>
        </Form>

        <div className="auth-divider"><span>{t("auth.orSocial")}</span></div>
        <div className="d-grid gap-2">
          <Button
            variant="outline-secondary"
            disabled={!providers.google}
            onClick={() => {
              window.location.href = `${API_URL}/api/auth/google`;
            }}
          >
            <i className="bi bi-google me-2" />
            Google
          </Button>
          <Button
            variant="outline-secondary"
            disabled={!providers.github}
            onClick={() => {
              window.location.href = `${API_URL}/api/auth/github`;
            }}
          >
            <i className="bi bi-github me-2" />
            GitHub
          </Button>
        </div>
        {!providers.google && !providers.github && (
          <p className="text-muted small mt-2 mb-0">
            Please wait for the server to start
          </p>
        )}

        <p className="mt-3 mb-0 text-center">
          {t("auth.noAccount")} <Link to="/register">{t("auth.signUp")}</Link>
        </p>
      </div>
    </div>
  );
}