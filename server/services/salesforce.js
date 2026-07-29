const axios = require("axios");
const { User } = require("../models");

const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD_SECURITY_TOKEN = process.env.SF_PASSWORD_SECURITY_TOKEN;
const SF_LOGIN_URL = (process.env.SF_LOGIN_URL || "https://login.salesforce.com").replace(/\/$/, "");

async function getSalesforceToken() {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET || !SF_USERNAME || !SF_PASSWORD_SECURITY_TOKEN) {
    throw new Error("Salesforce credentials are not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", SF_CLIENT_ID);
  params.append("client_secret", SF_CLIENT_SECRET);
  params.append("username", SF_USERNAME);
  params.append("password", SF_PASSWORD_SECURITY_TOKEN);

  const { data } = await axios.post(`${SF_LOGIN_URL}/services/oauth2/token`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data.access_token || !data.instance_url) {
    throw new Error("Salesforce authentication failed");
  }

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
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
