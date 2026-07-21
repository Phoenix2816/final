import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      toast.success(t("auth.registerSuccess"));
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>{t("auth.registerTitle")}</h1>
        <Form onSubmit={onSubmit}>
          <div className="row g-2">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label htmlFor="register-firstName">{t("auth.firstName")}</Form.Label>
                <Form.Control
                  id="register-firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  autoComplete="given-name"
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label htmlFor="register-lastName">{t("auth.lastName")}</Form.Label>
                <Form.Control
                  id="register-lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  autoComplete="family-name"
                />
              </Form.Group>
            </div>
          </div>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="register-email">{t("auth.email")}</Form.Label>
            <Form.Control
              id="register-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="register-password">{t("auth.password")}</Form.Label>
            <Form.Control
              id="register-password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Form.Group>
          <Button type="submit" className="w-100" disabled={loading}>
            {t("auth.signUp")}
          </Button>
        </Form>
        <p className="mt-3 mb-0 text-center">
          {t("auth.hasAccount")} <Link to="/login">{t("auth.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}