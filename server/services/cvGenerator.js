const { Op } = require("sequelize");
const {
  Attribute,
  UserAttribute,
  Project,
  Position,
  CV,
  User,
} = require("../models");
const { isEmpty } = require("./accessRules");

const BUILTIN_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "photo", label: "Photo" },
];

async function generateCVPayload(cv, options = {}) {
  const user =
    options.user ||
    (await User.findByPk(cv.userId));
  const position =
    options.position ||
    (await Position.findByPk(cv.positionId));

  if (!user || !position) {
    throw new Error("CV references missing user or position");
  }

  const templateIds = position.attributeTemplate || [];
  const attributes = templateIds.length
    ? await Attribute.findAll({ where: { id: { [Op.in]: templateIds } } })
    : [];

  const userAttrs = await UserAttribute.findAll({
    where: { userId: user.id },
  });
  const attrValueMap = {};
  userAttrs.forEach((ua) => {
    attrValueMap[ua.attributeId] = ua;
  });

  const builtin = BUILTIN_FIELDS.map((f) => {
    const value = user[f.key];
    return {
      key: f.key,
      label: f.label,
      type: f.key === "photo" ? "image" : "string",
      value: value ?? "",
      missing: isEmpty(value),
      builtin: true,
    };
  });

  const custom = attributes.map((attr) => {
    const ua = attrValueMap[attr.id];
    const value = ua ? ua.value : null;
    return {
      attributeId: attr.id,
      key: `attr_${attr.id}`,
      label: attr.name,
      category: attr.category,
      type: attr.type,
      options: attr.options,
      value,
      missing: isEmpty(value),
      builtin: false,
      version: ua ? ua.version : null,
    };
  });

  const projectTags = position.projectTags || [];
  let projects = await Project.findAll({
    where: { userId: user.id },
    order: [["order", "ASC"], ["updatedAt", "DESC"]],
  });

  if (projectTags.length > 0) {
    projects = projects.filter((p) =>
      (p.tags || []).some((t) =>
        projectTags.map((x) => x.toLowerCase()).includes(String(t).toLowerCase())
      )
    );
  }

  const max = position.maxProjects || projects.length;
  const selectedIds = cv.selectedProjectIds || [];
  let selectedProjects;
  if (selectedIds.length) {
    selectedProjects = projects.filter((p) => selectedIds.includes(p.id)).slice(0, max);
  } else {
    selectedProjects = projects.slice(0, max);
  }

  const fields = [...builtin, ...custom];
  const complete = fields.every((f) => !f.missing);

  return {
    cv: {
      id: cv.id,
      status: cv.status,
      likesCount: cv.likesCount,
      version: cv.version,
      selectedProjectIds: selectedProjects.map((p) => p.id),
      updatedAt: cv.updatedAt,
      createdAt: cv.createdAt,
    },
    candidate: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photo: user.photo,
    },
    position: {
      id: position.id,
      title: position.title,
      company: position.company,
      level: position.level,
      shortDescription: position.shortDescription,
      logo: position.logo || null,
      requiredAttributeIds: position.attributeTemplate || [],
      projectTags: position.projectTags || [],
      maxProjects: position.maxProjects || 0,
    },
    fields,
    projects: selectedProjects,
    availableProjects: projects,
    complete,
  };
}

module.exports = { generateCVPayload, BUILTIN_FIELDS };