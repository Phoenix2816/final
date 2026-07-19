import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      toast.error("OAuth failed");
      navigate("/login");
      return;
    }
    loginWithToken(token)
      .then(() => {
        toast.success("Signed in");
        navigate("/");
      })
      .catch(() => {
        toast.error("OAuth failed");
        navigate("/login");
      });
  }, [params, loginWithToken, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div className="spinner-border" />
        <p className="mt-3 mb-0">Completing sign-in…</p>
      </div>
    </div>
  );
}