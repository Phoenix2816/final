const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD_SECURITY_TOKEN = process.env.SF_PASSWORD_SECURITY_TOKEN;
const SF_LOGIN_URL = (process.env.SF_LOGIN_URL || "https://login.salesforce.com").replace(/\/$/, "");

const SF_JWT_ISSUER = process.env.SF_JWT_ISSUER || SF_CLIENT_ID;
const SF_JWT_SUBJECT = process.env.SF_JWT_SUBJECT || SF_USERNAME;
const SF_JWT_CERT = process.env.SF_JWT_CERT;

function buildJwtAssertion() {
  if (!SF_JWT_ISSUER || !SF_JWT_SUBJECT || !SF_JWT_CERT) {
    throw new Error("Salesforce JWT credentials are not configured");
  }

  const privateKey = extractPrivateKey(SF_JWT_CERT);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: SF_JWT_ISSUER,
    sub: SF_JWT_SUBJECT,
    aud: SF_LOGIN_URL,
    exp: now + 300,
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

function extractPrivateKey(pem) {
  const cleaned = pem.replace(/\\n/g, "\n").trim();
  const match = cleaned.match(
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----([\s\S]*?)-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/
  );
  if (!match) {
    throw new Error(
      "SF_JWT_CERT must contain a PEM-encoded RSA private key. Generate one with: openssl genrsa -out private.pem 2048"
    );
  }
  return match[0];
}

async function getSalesforceTokenViaJwt() {
  const assertion = buildJwtAssertion();

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  params.append("assertion", assertion);

  const response = await axios.post(
    `${SF_LOGIN_URL}/services/oauth2/token`,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, validateStatus: () => true }
  );

  const data = response.data;

  if (!data.access_token || !data.instance_url) {
    const description = data.error_description || "Salesforce JWT authentication failed";
    const err = new Error(description);
    err.salesforceError = data.error;
    err.status = response.status;
    err.salesforceRaw = data;
    throw err;
  }

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

async function getSalesforceTokenViaPassword() {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET || !SF_USERNAME || !SF_PASSWORD_SECURITY_TOKEN) {
    throw new Error("Salesforce credentials are not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", SF_CLIENT_ID);
  params.append("client_secret", SF_CLIENT_SECRET);
  params.append("username", SF_USERNAME);
  params.append("password", SF_PASSWORD_SECURITY_TOKEN);

  const response = await axios.post(
    `${SF_LOGIN_URL}/services/oauth2/token`,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, validateStatus: () => true }
  );

  const data = response.data;

  if (!data.access_token || !data.instance_url) {
    const description = data.error_description || "Salesforce authentication failed";
    const err = new Error(description);
    err.salesforceError = data.error;
    err.status = response.status;
    throw err;
  }

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

async function getSalesforceTokenViaClientCredentials() {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
    throw new Error("Salesforce client credentials are not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", SF_CLIENT_ID);
  params.append("client_secret", SF_CLIENT_SECRET);

  const response = await axios.post(
    `${SF_LOGIN_URL}/services/oauth2/token`,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, validateStatus: () => true }
  );

  const data = response.data;

  if (!data.access_token) {
    const description = data.error_description || "Salesforce client credentials authentication failed";
    const err = new Error(description);
    err.salesforceError = data.error;
    err.status = response.status;
    err.salesforceRaw = data;
    throw err;
  }

  return { accessToken: data.access_token, instanceUrl: data.instance_url || SF_LOGIN_URL };
}

function isOrgFarmRestriction(err) {
  const raw = err.salesforceRaw || {};
  const desc = String(raw.error_description || err.message || "").toLowerCase();
  return (
    desc.includes("no client credentials user enabled") ||
    desc.includes("user hasn't approved this consumer") ||
    desc.includes("username-password flow disabled")
  );
}

async function getSalesforceToken() {
  try {
    return await getSalesforceTokenViaClientCredentials();
  } catch (e) {
    console.error("CLIENT_CREDENTIALS ERROR:", e.status);
    console.error("CLIENT_CREDENTIALS RAW:", e.salesforceRaw);

    if (isOrgFarmRestriction(e)) {
      const err = new Error("Salesforce integration is unavailable in this org because server-to-server OAuth flows are restricted. Use a standard Developer Edition org to enable CRM sync.");
      err.code = "SF_ORG_RESTRICTED";
      err.salesforceError = e.salesforceError;
      err.status = e.status || 400;
      err.salesforceRaw = e.salesforceRaw;
      throw err;
    }

    throw e;
  }
}

async function createSObject(accessToken, instanceUrl, sobjectType, payload) {
  const url = `${instanceUrl}/services/data/v59.0/sobjects/${sobjectType}/`;
  const { data } = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (data[0]?.success === false) {
    const err = new Error(data[0]?.message || "Salesforce insert failed");
    err.salesforceErrors = data;
    throw err;
  }

  return data;
}

async function syncUserToSalesforce(userId, extra = {}) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const { accessToken, instanceUrl } = await getSalesforceToken();

  const accountName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

  const account = await createSObject(accessToken, instanceUrl, "Account", {
    Name: accountName,
    BillingCity: extra.company || user.location || null,
    Website: user.photo || null,
    Description: extra.description || null,
  });

  const contact = await createSObject(accessToken, instanceUrl, "Contact", {
    FirstName: user.firstName || null,
    LastName: user.lastName || null,
    Email: user.email || null,
    Phone: user.phone || null,
    Title: extra.jobTitle || null,
    Description: extra.description || null,
    AccountId: account.id,
    MailingCity: user.location || null,
  });

  return {
    user: user.toSafeJSON(),
    account,
    contact,
  };
}

module.exports = {
  syncUserToSalesforce,
  getSalesforceToken,
};
