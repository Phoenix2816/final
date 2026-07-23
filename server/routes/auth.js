const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const { User, Attribute, UserAttribute, PasswordReset, RefreshToken } = require("../models");
const { authRequired, signToken, generateRefreshToken, refreshAccessToken, revokeRefreshTokens } = require("../middleware/auth");
const { sendPasswordChangeEmail } = require("../services/email");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || process.env.REACT_APP_CLIENT_URL || "http://localhost:3000";

function configurePassport() {
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_REDIRECT_URI ||
            "https://final-dhkq.onrender.com/api/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email =
              profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            let user = await User.findOne({ where: { googleId: profile.id } });
            if (!user && email) user = await User.findOne({ where: { email } });
            if (!user) {
              user = await User.create({
                email: email || `google_${profile.id}@oauth.local`,
                googleId: profile.id,
                firstName: profile.name?.givenName || profile.displayName || "User",
                lastName: profile.name?.familyName || "",
                photo: profile.photos?.[0]?.value || null,
                roles: ["candidate"],
                emailConfirmed: true,
              });
            } else {
              user.googleId = profile.id;
              if (!user.photo && profile.photos?.[0]?.value) {
                user.photo = profile.photos[0].value;
              }
              if (!user.emailConfirmed) {
                user.emailConfirmed = true;
                user.emailConfirmToken = null;
                user.emailConfirmExpires = null;
              }
              await user.save();
            }
            user.lastLoginAt = new Date();
            await user.save();
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL:
            process.env.GITHUB_REDIRECT_URI ||
            "https://final-dhkq.onrender.com/api/auth/github/callback",
          scope: ["user:email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email =
              profile.emails && profile.emails[0]
                ? profile.emails[0].value
                : `github_${profile.id}@oauth.local`;
            let user = await User.findOne({ where: { githubId: profile.id } });
            if (!user) user = await User.findOne({ where: { email } });
            if (!user) {
              const names = (profile.displayName || profile.username || "User").split(" ");
              user = await User.create({
                email,
                githubId: profile.id,
                firstName: names[0] || "User",
                lastName: names.slice(1).join(" ") || "",
                photo: profile.photos?.[0]?.value || null,
                roles: ["candidate"],
                emailConfirmed: true,
              });
            } else {
              user.githubId = profile.id;
              if (!user.emailConfirmed) {
                user.emailConfirmed = true;
                user.emailConfirmToken = null;
                user.emailConfirmExpires = null;
              }
              await user.save();
            }
            user.lastLoginAt = new Date();
            await user.save();
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  }
}

configurePassport();

router.get("/providers", (_req, res) => {
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  });
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      email,
      passwordHash,
      firstName: firstName || "",
      lastName: lastName || "",
      roles: ["candidate"],
      emailConfirmed: false,
      emailConfirmToken: token,
      emailConfirmExpires: expiresAt,
    });

    const allAttrs = await Attribute.findAll({ where: { kind: "attribute" } });
    if (allAttrs.length > 0) {
      await UserAttribute.bulkCreate(
        allAttrs.map((a) => ({ userId: user.id, attributeId: a.id, value: null })),
        { ignoreDuplicates: true }
      );
    }

    const confirmLink = `${CLIENT_URL}/auth/confirm-email?token=${token}`;
    const message = `Hello ${firstName || email},\n\nClick the link below to confirm your email address:\n${confirmLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, ignore this email.`;

    try {
      await sendPasswordChangeEmail(email, firstName || email, confirmLink);
    } catch {
      console.warn("Confirmation email failed to send");
    }

    const accessToken = signToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.status(201).json({
      message: "Account created. Please check your email to confirm your account.",
      token: accessToken,
      refreshToken,
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "accountNotFound" });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: "accountNotFound" });
    }
    if (user.isBlocked) return res.status(403).json({ error: "User is blocked" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalidPassword" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    const refreshToken = await generateRefreshToken(user);
    res.json({ token, refreshToken, user: user.toSafeJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }
    const result = await refreshAccessToken(refreshToken);
    if (!result) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Token refresh failed" });
  }
});

router.post("/logout", authRequired, async (req, res) => {
  try {
    await revokeRefreshTokens(req.user.id);
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Logout failed" });
  }
});

router.get("/me", authRequired, (req, res) => {
  res.json(req.user.toSafeJSON());
});

router.patch("/me/preferences", authRequired, async (req, res) => {
  try {
    const { theme, language } = req.body;
    if (theme) req.user.theme = theme;
    if (language) req.user.language = language;
    await req.user.save();
    res.json(req.user.toSafeJSON());
  } catch (err) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

router.post("/password/request", authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (!req.user.passwordHash) {
      return res.status(400).json({ error: "Password is not set for this account" });
    }

    const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.create({
      userId: req.user.id,
      email: req.user.email,
      token,
      newPasswordHash,
      expiresAt,
    });

    const confirmLink = `${CLIENT_URL}/profile?confirm-password=${token}`;
    try {
      await sendPasswordChangeEmail(req.user.email, req.user.firstName || req.user.email, confirmLink);
    } catch (emailErr) {
      console.error("Password change email failed:", emailErr);
    }

    res.json({ message: "Confirmation email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to request password change" });
  }
});

router.post("/password/confirm", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const reset = await PasswordReset.findOne({ where: { token } });
    if (!reset) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (reset.used) {
      return res.status(400).json({ error: "Token already used" });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    const user = await User.findByPk(reset.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.passwordHash = reset.newPasswordHash;
    await user.save();

    reset.used = true;
    await reset.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm password change" });
  }
});

router.get("/confirm-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${CLIENT_URL}/login?error=invalid_token`);
    }

    const user = await User.findOne({ where: { emailConfirmToken: token } });
    if (!user) {
      return res.redirect(`${CLIENT_URL}/login?error=invalid_token`);
    }

    if (user.emailConfirmed) {
      return res.redirect(`${CLIENT_URL}/login?info=already_confirmed`);
    }

    if (user.emailConfirmExpires < new Date()) {
      return res.redirect(`${CLIENT_URL}/login?error=token_expired`);
    }

    user.emailConfirmed = true;
    user.emailConfirmToken = null;
    user.emailConfirmExpires = null;
    await user.save();

    res.redirect(`${CLIENT_URL}/login?info=confirmed`);
  } catch (err) {
    console.error(err);
    res.redirect(`${CLIENT_URL}/login?error=confirmation_failed`);
  }
});

function oauthCallback(req, res) {
  const token = signToken(req.user);
  const refreshToken = generateRefreshToken(req.user).then((rt) => {
    res.redirect(`${CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${rt}`);
  });
}

router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_unavailable`);
    }
    passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}/login` })(
      req,
      res,
      next
    );
  },
  oauthCallback
);

router.get("/github", (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(503).json({ error: "GitHub OAuth not configured" });
  }
  passport.authenticate("github", { scope: ["user:email"], session: false })(req, res, next);
});

router.get(
  "/github/callback",
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_unavailable`);
    }
    passport.authenticate("github", { session: false, failureRedirect: `${CLIENT_URL}/login` })(
      req,
      res,
      next
    );
  },
  oauthCallback
);

module.exports = router;