import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Navbar, Nav, Container, NavDropdown, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";

export default function AppNavbar() {
  const { t } = useTranslation();
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initialQuery = (() => {
    const m = location.pathname.match(/^\/search\/(.+)$/);
    if (m) return decodeURIComponent(m[1]);
    const p = new URLSearchParams(location.search).get("q");
    return p || "";
  })();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const m = location.pathname.match(/^\/search\/(.+)$/);
    const urlQ = m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get("q") || "";
    setQuery((prev) => (prev === urlQ ? prev : urlQ));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      navigate(`/search/${encodeURIComponent(q)}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, navigate]);

  const tools = (
    <div className="nav-tools d-flex align-items-center gap-2">
      <Button
        variant="outline-secondary"
        size="sm"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
        title={t("nav.theme")}
      >
        <i className={`bi bi-${theme === "dark" ? "sun" : "moon-stars"}`} aria-hidden="true" />
      </Button>

      <NavDropdown
        title={
          <span>
            <i className="bi bi-translate me-1" aria-hidden="true" />
            {language.toUpperCase()}
          </span>
        }
        align="end"
        className="lang-dropdown"
        aria-label={t("nav.language")}
      >
        <NavDropdown.Item active={language === "en"} onClick={() => setLanguage("en")}>
          English
        </NavDropdown.Item>
        <NavDropdown.Item active={language === "ru"} onClick={() => setLanguage("ru")}>
          Русский
        </NavDropdown.Item>
      </NavDropdown>

      {user ? (
        <NavDropdown
          title={
            <span className="user-chip">
              {user.photo ? (
                <img src={user.photo} alt="" className="avatar-xs" />
              ) : (
                <span className="avatar-xs avatar-fallback">
                  {(user.firstName || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="d-none d-md-inline ms-2">{user.firstName || user.email}</span>
            </span>
          }
          align="end"
        >
          <NavDropdown.Item onClick={() => navigate("/profile")}>
            <i className="bi bi-person me-2" />
            {t("nav.profile")}
          </NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <i className="bi bi-box-arrow-right me-2" />
            {t("nav.logout")}
          </NavDropdown.Item>
        </NavDropdown>
      ) : (
        <Button as={Link} to="/login" size="sm" variant="primary">
          {t("nav.login")}
        </Button>
      )}
    </div>
  );

  const searchForm = (
    <Form
      className="global-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) navigate(`/search/${encodeURIComponent(query.trim())}`);
      }}
      aria-label={t("search.title")}
    >
      <div className="input-group">
        <span className="input-group-text" aria-hidden="true">
          <i className="bi bi-search" />
        </span>
        <Form.Control
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
        />
      </div>
    </Form>
  );

  const headerNavLinks = (
    <Nav className="header-nav-links">
      {hasRole("admin") && (
        <Nav.Link as={NavLink} to="/users">
          {t("nav.users")}
        </Nav.Link>
      )}
      <Nav.Link as={NavLink} to="/" end>
        {t("nav.home")}
      </Nav.Link>
      <Nav.Link as={NavLink} to="/positions">
        {t("nav.positions")}
      </Nav.Link>
      {user && (
        <Nav.Link as={NavLink} to="/profile">
          {t("nav.profile")}
        </Nav.Link>
      )}
      {hasRole("recruiter", "admin") && (
        <Nav.Link as={NavLink} to="/attributes">
          {t("nav.attributes")}
        </Nav.Link>
      )}
    </Nav>
  );

  const mobileNavLinks = (
    <Nav className="mobile-nav-links">
      {hasRole("admin") && (
        <Nav.Link as={NavLink} to="/users" onClick={() => setMobileNavOpen(false)}>
          {t("nav.users")}
        </Nav.Link>
      )}
      <Nav.Link as={NavLink} to="/" end onClick={() => setMobileNavOpen(false)}>
        {t("nav.home")}
      </Nav.Link>
      <Nav.Link as={NavLink} to="/positions" onClick={() => setMobileNavOpen(false)}>
        {t("nav.positions")}
      </Nav.Link>
      {user && (
        <Nav.Link as={NavLink} to="/profile" onClick={() => setMobileNavOpen(false)}>
          {t("nav.profile")}
        </Nav.Link>
      )}
      {hasRole("recruiter", "admin") && (
        <Nav.Link as={NavLink} to="/attributes" onClick={() => setMobileNavOpen(false)}>
          {t("nav.attributes")}
        </Nav.Link>
      )}
    </Nav>
  );

  return (
    <>
      <Navbar expand="xl" className="app-navbar sticky-top" variant={theme === "dark" ? "dark" : "light"}>
        <Container fluid className="px-3 px-lg-4">
          <Navbar.Brand as={Link} to="/" className="brand-mark">
            <span className="brand-icon">TF</span>
            <span className="brand-text">{t("appName")}</span>
          </Navbar.Brand>

          <div className="header-nav-row d-none d-xl-flex">
            <Container fluid className="px-3 px-lg-4">
              {headerNavLinks}
            </Container>
          </div>
          
          <div className="nav-search-header">{searchForm}</div>

          <div className="nav-tools-fixed d-flex align-items-center gap-2">
            {tools}
            <Button
              variant=""
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="ms-1 burger-toggle d-xl-none"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            >
              <i className={`bi bi-${mobileNavOpen ? "x" : "list"}`} aria-hidden="true" />
            </Button>
          </div>
        </Container>
      </Navbar>


      <div className={`mobile-nav-panel${mobileNavOpen ? " show" : ""} d-xl-none`}>
        <Container fluid className="px-3 px-lg-4">
          {mobileNavLinks}
        </Container>
      </div>
    </>
  );
}