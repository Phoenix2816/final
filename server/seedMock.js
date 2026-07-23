/**
 * Enrich DB with mock data and ensure kirlilog@yandex.ru is admin.
 * Does NOT wipe existing users (preserves OAuth accounts).
 *
 * Usage: node seedMock.js
 */
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Attribute,
  UserAttribute,
  Project,
  Position,
  CV,
  CVLike,
  DiscussionMessage,
} = require("./models");

const ADMIN_EMAIL = "kirlilog@yandex.ru";

const EXTRA_CANDIDATES = [
  { email: "maria.chen@example.com", firstName: "Maria", lastName: "Chen", location: "Singapore", phone: "+65 8123 4567" },
  { email: "omar.hassan@example.com", firstName: "Omar", lastName: "Hassan", location: "Dubai, UAE", phone: "+971 50 123 4567" },
  { email: "lena.kowalski@example.com", firstName: "Lena", lastName: "Kowalski", location: "Warsaw, PL", phone: "+48 600 100 200" },
  { email: "dev.patel@example.com", firstName: "Dev", lastName: "Patel", location: "Bangalore, IN", phone: "+91 98765 43210" },
  { email: "sofia.rossi@example.com", firstName: "Sofia", lastName: "Rossi", location: "Milan, IT", phone: "+39 333 111 2222" },
  { email: "james.okonkwo@example.com", firstName: "James", lastName: "Okonkwo", location: "Lagos, NG", phone: "+234 801 234 5678" },
  { email: "anna.berg@example.com", firstName: "Anna", lastName: "Berg", location: "Stockholm, SE", phone: "+46 70 123 45 67" },
  { email: "carlos.mendez@example.com", firstName: "Carlos", lastName: "Mendez", location: "Mexico City", phone: "+52 55 1234 5678" },
];

const EXTRA_RECRUITERS = [
  { email: "hiring@northstar.example", firstName: "Nina", lastName: "Torres", location: "Chicago, USA", phone: "+1 312 555 0199" },
  { email: "talent@launchpad.example", firstName: "Ben", lastName: "Wright", location: "London, UK", phone: "+44 7700 900123" },
];

const EXTRA_POSITIONS = [
  {
    title: "Backend Engineer (Node.js)",
    company: "Northstar Talent",
    level: "mid",
    shortDescription: "Design APIs, queues, and data models for high-volume hiring workflows.",
    projectTags: ["Node.js", "PostgreSQL", "Redis"],
    maxProjects: 4,
    viewCount: 33,
  },
  {
    title: "React Native Mobile Engineer",
    company: "Launchpad Labs",
    level: "mid",
    shortDescription: "Ship candidate mobile experiences for iOS and Android.",
    projectTags: ["React", "TypeScript"],
    maxProjects: 3,
    viewCount: 21,
  },
  {
    title: "DevOps / Platform Specialist",
    company: "Workstream Inc",
    level: "senior",
    shortDescription: "Own CI/CD, observability, and Kubernetes for recruitment products.",
    projectTags: ["Docker", "Kubernetes", "AWS"],
    maxProjects: 3,
    viewCount: 47,
  },
  {
    title: "QA Automation Engineer",
    company: "Northstar Talent",
    level: "junior",
    shortDescription: "Build Playwright/Cypress suites for critical hiring flows.",
    projectTags: ["JavaScript", "Cypress"],
    maxProjects: 2,
    viewCount: 12,
  },
  {
    title: "Product Designer (Recruitment UX)",
    company: "Launchpad Labs",
    level: "senior",
    shortDescription: "Lead end-to-end design for recruiter dashboards and candidate journeys.",
    projectTags: ["Figma", "React"],
    maxProjects: 4,
    viewCount: 39,
  },
  {
    title: "Data Engineer",
    company: "Workstream Inc",
    level: "mid",
    shortDescription: "Build pipelines that power talent analytics and matching scores.",
    projectTags: ["Python", "SQL", "Airflow"],
    maxProjects: 3,
    viewCount: 26,
  },
];

const TECH_POOL = [
  "React", "Node.js", "TypeScript", "Python", "PostgreSQL", "MongoDB", "Docker",
  "Kubernetes", "AWS", "GraphQL", "Redis", "Django", "Java", "Go", "Cypress", "Figma",
];

function avatar(first, last) {
  const name = encodeURIComponent(`${first} ${last}`);
  const bg = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff`;
}

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

async function ensureUser(data, passwordHash) {
  let user = await User.findOne({ where: { email: data.email } });
  if (user) {
    if (!user.emailConfirmed) {
      user.emailConfirmed = true;
      await user.save();
    }
    return user;
  }
  user = await User.create({
    ...data,
    passwordHash,
    photo: data.photo || avatar(data.firstName, data.lastName),
    roles: data.roles || ["candidate"],
    emailConfirmed: true,
  });
  return user;
}

async function ensureAttribute(def, createdById) {
  let attr = await Attribute.findOne({ where: { name: def.name, category: def.category } });
  if (attr) return attr;
  return Attribute.create({ ...def, createdById });
}

async function seedMock() {
  await sequelize.sync();
  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Promote / create admin ---
  let adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (adminUser) {
    adminUser.roles = ["admin", "recruiter", "candidate"];
    if (!adminUser.firstName) adminUser.firstName = "Kirill";
    await adminUser.save();
    console.log(`Updated ${ADMIN_EMAIL} → admin`);
  } else {
    adminUser = await User.create({
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: "Kirill",
      lastName: "Admin",
      phone: "+375 29 000 0000",
      location: "Minsk",
      photo: avatar("Kirill", "Admin"),
      roles: ["admin", "recruiter", "candidate"],
      theme: "dark",
      language: "en",
      emailConfirmed: true,
    });
    console.log(`Created ${ADMIN_EMAIL} as admin (password: password123)`);
  }

  // Demo accounts
  const demoAdmin = await ensureUser(
    {
      email: "admin@cv.local",
      firstName: "Alex",
      lastName: "Admin",
      phone: "+1 555 0100",
      location: "New York, USA",
      roles: ["admin", "recruiter", "candidate"],
    },
    passwordHash
  );
  const recruiter = await ensureUser(
    {
      email: "recruiter@cv.local",
      firstName: "Riley",
      lastName: "Recruiter",
      phone: "+1 555 0101",
      location: "Austin, USA",
      roles: ["recruiter", "candidate"],
    },
    passwordHash
  );
  const candidate = await ensureUser(
    {
      email: "candidate@cv.local",
      firstName: "Casey",
      lastName: "Candidate",
      phone: "+1 555 0102",
      location: "Remote",
      roles: ["candidate"],
    },
    passwordHash
  );
  await ensureUser(
    {
      email: "jane@cv.local",
      firstName: "Jane",
      lastName: "Developer",
      phone: "+1 555 0103",
      location: "Berlin, DE",
      roles: ["candidate"],
    },
    passwordHash
  );

  const recruiters = [recruiter, adminUser, demoAdmin];
  for (const r of EXTRA_RECRUITERS) {
    recruiters.push(
      await ensureUser({ ...r, roles: ["recruiter", "candidate"] }, passwordHash)
    );
  }

  const candidates = [candidate];
  for (const c of EXTRA_CANDIDATES) {
    candidates.push(await ensureUser({ ...c, roles: ["candidate"] }, passwordHash));
  }

  // --- Attributes ---
  const attrDefs = [
    { category: "Languages", name: "IELTS", description: "IELTS overall band score", type: "number" },
    { category: "Work Preferences", name: "Remote Work", description: "Open to remote work", type: "boolean" },
    {
      category: "Soft Skills",
      name: "Presentation Skills",
      description: "Ability to present to stakeholders",
      type: "dropdown",
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
    },
    { category: "Technical", name: "Years of Experience", description: "Professional experience in years", type: "number" },
    { category: "Technical", name: "Primary Stack", description: "Main technology stack", type: "string" },
    {
      category: "Education",
      name: "Degree",
      description: "Highest degree obtained",
      type: "dropdown",
      options: ["Bachelor", "Master", "PhD", "Other"],
    },
    { category: "Technical", name: "Portfolio Summary", description: "Markdown summary of portfolio", type: "markdown" },
    { category: "Availability", name: "Available From", description: "Earliest start date", type: "date" },
    { category: "Availability", name: "Notice Period", description: "Notice period range", type: "period" },
    { category: "Profile", name: "Certificate Image", description: "Upload a certificate image", type: "image" },
    {
      category: "Languages",
      name: "English Level",
      description: "Spoken English proficiency",
      type: "dropdown",
      options: ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
    { category: "Technical", name: "GitHub Profile", description: "Link to GitHub", type: "string" },
    { category: "Work Preferences", name: "Salary Expectation (USD)", description: "Expected annual salary", type: "number" },
    {
      category: "Soft Skills",
      name: "Leadership",
      description: "Team leadership level",
      type: "dropdown",
      options: ["None", "Mentoring", "Team Lead", "Manager"],
    },
  ];

  const attrs = {};
  for (const def of attrDefs) {
    const a = await ensureAttribute(def, recruiter.id);
    attrs[a.name] = a;
  }

  const stacks = [
    "React / Node.js",
    "Python / Django",
    "Java / Spring",
    "Go / Kubernetes",
    "React Native",
    "TypeScript / GraphQL",
  ];
  const degrees = ["Bachelor", "Master", "PhD", "Other"];
  const presentations = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const english = ["B1", "B2", "C1", "C2"];

  for (const [i, user] of candidates.entries()) {
    const years = 1 + (i % 10);
    const values = [
      { attributeId: attrs.IELTS.id, value: 6 + (i % 4) * 0.5 },
      { attributeId: attrs["Remote Work"].id, value: i % 3 !== 0 },
      { attributeId: attrs["Presentation Skills"].id, value: presentations[i % presentations.length] },
      { attributeId: attrs["Years of Experience"].id, value: years },
      { attributeId: attrs["Primary Stack"].id, value: stacks[i % stacks.length] },
      { attributeId: attrs.Degree.id, value: degrees[i % degrees.length] },
      {
        attributeId: attrs["Portfolio Summary"].id,
        value: `## About\nExperienced engineer focused on ${stacks[i % stacks.length]}.\n\n- Delivered production systems\n- Mentored juniors`,
      },
      { attributeId: attrs["Available From"].id, value: "2026-08-15" },
      {
        attributeId: attrs["Notice Period"].id,
        value: { from: "2026-07-20", to: "2026-08-10" },
      },
      { attributeId: attrs["English Level"].id, value: english[i % english.length] },
      { attributeId: attrs["GitHub Profile"].id, value: `https://github.com/${user.firstName.toLowerCase()}${i}` },
      { attributeId: attrs["Salary Expectation (USD)"].id, value: 60000 + years * 8000 },
      { attributeId: attrs.Leadership.id, value: years > 5 ? "Team Lead" : years > 2 ? "Mentoring" : "None" },
    ];

    for (const item of values) {
      const existing = await UserAttribute.findOne({
        where: { userId: user.id, attributeId: item.attributeId },
      });
      if (existing) {
        existing.value = item.value;
        await existing.save();
      } else {
        await UserAttribute.create({ userId: user.id, ...item });
      }
    }

    const projectCount = await Project.count({ where: { userId: user.id } });
    if (projectCount < 2) {
      const tags1 = pick(TECH_POOL, 3 + (i % 3));
      const tags2 = pick(TECH_POOL, 2 + (i % 2));
      await Project.bulkCreate([
        {
          userId: user.id,
          name: `${user.firstName}'s Platform Project`,
          startDate: "2023-01-01",
          endDate: "2024-06-01",
          order: 1,
          description: `Built a scalable module using **${tags1[0]}** and **${tags1[1]}**.`,
          tags: tags1,
        },
        {
          userId: user.id,
          name: `${user.firstName}'s Analytics Tool`,
          startDate: "2024-07-01",
          currentlyWorking: true,
          order: 0,
          description: `Delivered dashboards and APIs with ${tags2.join(", ")}.`,
          tags: tags2,
        },
      ]);
    }
  }

  // Admin profile extras
  for (const item of [
    { attributeId: attrs["Years of Experience"].id, value: 8 },
    { attributeId: attrs["Primary Stack"].id, value: "React / Node.js" },
    { attributeId: attrs["Remote Work"].id, value: true },
    { attributeId: attrs["Presentation Skills"].id, value: "Advanced" },
    { attributeId: attrs.IELTS.id, value: 7.5 },
    { attributeId: attrs["English Level"].id, value: "C1" },
  ]) {
    const existing = await UserAttribute.findOne({
      where: { userId: adminUser.id, attributeId: item.attributeId },
    });
    if (!existing) await UserAttribute.create({ userId: adminUser.id, ...item });
  }
    if ((await Project.count({ where: { userId: adminUser.id } })) === 0) {
      await Project.create({
        userId: adminUser.id,
        name: "TalentFlow CV Platform",
        startDate: "2025-01-01",
        currentlyWorking: true,
        order: 0,
        description: "Full-stack recruitment platform with roles, CVs, and live discussions.",
        tags: ["React", "Express", "MySQL", "Socket.IO"],
      });
    }

  // --- Positions ---
  const templateIds = [
    attrs["Years of Experience"].id,
    attrs["Primary Stack"].id,
    attrs["Presentation Skills"].id,
    attrs["Remote Work"].id,
    attrs["English Level"].id,
  ];

  async function ensurePosition(data) {
    let pos = await Position.findOne({ where: { title: data.title, company: data.company } });
    if (pos) return pos;
    return Position.create({
      visibility: "public",
      attributeTemplate: templateIds,
      accessRules: data.accessRules || [],
      projectTags: data.projectTags || ["React"],
      maxProjects: data.maxProjects || 3,
      createdById: data.createdById || recruiter.id,
      viewCount: data.viewCount || 10,
      level: data.level || "mid",
      title: data.title,
      company: data.company,
      shortDescription: data.shortDescription || "",
    });
  }

  const positions = [];
  positions.push(
    await ensurePosition({
      title: "Senior Frontend Engineer",
      company: "Northstar Talent",
      level: "senior",
      shortDescription:
        "Own the candidate experience UI for our recruitment platform. Strong React skills required.",
      projectTags: ["React", "TypeScript", "Node.js"],
      maxProjects: 3,
      viewCount: 42,
      accessRules: [
        { attributeId: attrs["Years of Experience"].id, operator: ">=", value: 3, type: "number" },
        { attributeId: attrs["Remote Work"].id, operator: "=", value: true, type: "boolean" },
      ],
    })
  );
  positions.push(
    await ensurePosition({
      title: "Full-Stack Developer",
      company: "Northstar Talent",
      level: "mid",
      shortDescription: "Ship end-to-end features across React and Express.",
      projectTags: ["React", "Node.js"],
      maxProjects: 4,
      viewCount: 28,
      accessRules: [{ attributeId: attrs.IELTS.id, operator: ">", value: 7, type: "number" }],
      attributeTemplate: [
        attrs["Years of Experience"].id,
        attrs["Primary Stack"].id,
        attrs.IELTS.id,
        attrs.Degree.id,
      ],
    })
  );
  // fix attributeTemplate for fullstack if created fresh - already in create above via ensurePosition defaults
  const fullstack = positions[1];
  if (fullstack) {
    fullstack.attributeTemplate = [
      attrs["Years of Experience"].id,
      attrs["Primary Stack"].id,
      attrs.IELTS.id,
      attrs.Degree.id,
    ];
    await fullstack.save();
  }

  positions.push(
    await ensurePosition({
      title: "Software Engineering Intern",
      company: "Launchpad Labs",
      level: "junior",
      shortDescription: "Join a product squad and learn modern hiring tech.",
      projectTags: ["React", "Python"],
      maxProjects: 2,
      viewCount: 15,
      createdById: demoAdmin.id,
    })
  );
  positions.push(
    await ensurePosition({
      title: "Staff Platform Engineer",
      company: "Workstream Inc",
      level: "lead",
      shortDescription: "Lead platform architecture for high-scale recruitment tooling.",
      projectTags: ["Node.js", "PostgreSQL", "WebSockets"],
      maxProjects: 5,
      viewCount: 61,
      accessRules: [
        { attributeId: attrs["Years of Experience"].id, operator: ">=", value: 7, type: "number" },
        { attributeId: attrs["Presentation Skills"].id, operator: "=", value: "Advanced", type: "dropdown" },
      ],
    })
  );

  for (const p of EXTRA_POSITIONS) {
    positions.push(
      await ensurePosition({
        ...p,
        createdById: recruiters[Math.floor(Math.random() * recruiters.length)].id,
        accessRules:
          p.level === "senior" || p.level === "lead"
            ? [{ attributeId: attrs["Years of Experience"].id, operator: ">=", value: 4, type: "number" }]
            : [],
      })
    );
  }

  // --- CVs + likes + discussions ---
  let cvCreated = 0;
  for (const user of [...candidates, adminUser]) {
    const targets = pick(positions, 2 + (user.id % 2));
    for (const [idx, pos] of targets.entries()) {
      let cv = await CV.findOne({ where: { userId: user.id, positionId: pos.id } });
      if (!cv) {
        cv = await CV.create({
          userId: user.id,
          positionId: pos.id,
          status: idx === 0 ? "published" : "draft",
          likesCount: 0,
        });
        cvCreated += 1;
      }
      if (cv.status === "published") {
        for (const rec of pick(recruiters, 1 + (user.id % 2))) {
          if (rec.id === user.id) continue;
          const existing = await CVLike.findOne({
            where: { cvId: cv.id, recruiterId: rec.id },
          });
          if (!existing) {
            await CVLike.create({ cvId: cv.id, recruiterId: rec.id });
            cv.likesCount = (cv.likesCount || 0) + 1;
            await cv.save();
          }
        }
      }
    }
  }

  for (const pos of positions.slice(0, 6)) {
    const msgCount = await DiscussionMessage.count({ where: { positionId: pos.id } });
    if (msgCount === 0) {
      const authorRec = recruiters[0];
      const authorCand = candidates[pos.id % candidates.length];
      await DiscussionMessage.bulkCreate([
        {
          positionId: pos.id,
          userId: authorRec.id,
          content: `Welcome to **${pos.title}** discussion. Ask anything about the role at ${pos.company}.`,
        },
        {
          positionId: pos.id,
          userId: authorCand.id,
          content: "What does the interview process look like?",
        },
        {
          positionId: pos.id,
          userId: authorRec.id,
          content: "1) Screening call → 2) Technical task → 3) Final panel. Timeline ~2 weeks.",
        },
      ]);
    }
  }

  const summary = {
    users: await User.count(),
    attributes: await Attribute.count(),
    projects: await Project.count(),
    positions: await Position.count(),
    cvs: await CV.count(),
    likes: await CVLike.count(),
    messages: await DiscussionMessage.count(),
    newCvsThisRun: cvCreated,
  };

  console.log("Mock data ready:");
  console.log(summary);
  console.log(`Admin: ${ADMIN_EMAIL} roles=`, (await User.findOne({ where: { email: ADMIN_EMAIL } })).roles);
  process.exit(0);
}

seedMock().catch((err) => {
  console.error(err);
  process.exit(1);
});
