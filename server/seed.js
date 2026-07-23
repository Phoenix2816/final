const bcrypt = require("bcrypt");
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

async function resetSchema() {
  const dialect = sequelize.getDialect();
  try {
    if (dialect === "mysql") {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
      await sequelize.sync({ force: true });
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    } else if (dialect === "postgres") {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ force: true });
    }
  } catch (err) {
    if (dialect === "mysql") {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    }
    throw err;
  }
}

async function seed({ force = true } = {}) {
  if (force) {
    await resetSchema();
  } else {
    await sequelize.sync();
  }

  const existing = await User.count();
  if (!force && existing > 0) {
    console.log("Database already has users — skip seeding.");
    return;
  }

  const passwordHash = await bcrypt.hash("123123", 10);

  const admin = await User.create({
    email: "admin@cv.local",
    passwordHash,
    firstName: "Alex",
    lastName: "Admin",
    phone: "+1 555 0100",
    location: "New York, USA",
    roles: ["admin", "recruiter", "candidate"],
    theme: "light",
    language: "en",
    emailConfirmed: true,
  });

  const recruiter = await User.create({
    email: "recruiter@cv.local",
    passwordHash,
    firstName: "Riley",
    lastName: "Recruiter",
    phone: "+1 555 0101",
    location: "Austin, USA",
    roles: ["recruiter", "candidate"],
    emailConfirmed: true,
  });

  const candidate = await User.create({
    email: "candidate@cv.local",
    passwordHash,
    firstName: "Casey",
    lastName: "Candidate",
    phone: "+1 555 0102",
    location: "Remote",
    photo: "https://ui-avatars.com/api/?name=Casey+Candidate&background=0f6e56&color=fff",
    roles: ["candidate"],
    emailConfirmed: true,
  });

  const candidate2 = await User.create({
    email: "jane@cv.local",
    passwordHash,
    firstName: "Jane",
    lastName: "Developer",
    phone: "+1 555 0103",
    location: "Berlin, DE",
    photo: "https://ui-avatars.com/api/?name=Jane+Developer&background=2463a0&color=fff",
    roles: ["candidate"],
    emailConfirmed: true,
  });

  const attrs = await Attribute.bulkCreate([
    {
      category: "Languages",
      name: "IELTS",
      description: "IELTS overall band score",
      type: "number",
      createdById: recruiter.id,
    },
    {
      category: "Work Preferences",
      name: "Remote Work",
      description: "Open to remote work",
      type: "boolean",
      createdById: recruiter.id,
    },
    {
      category: "Soft Skills",
      name: "Presentation Skills",
      description: "Ability to present to stakeholders",
      type: "dropdown",
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
      createdById: recruiter.id,
    },
    {
      category: "Technical",
      name: "Years of Experience",
      description: "Professional experience in years",
      type: "number",
      createdById: recruiter.id,
    },
    {
      category: "Technical",
      name: "Primary Stack",
      description: "Main technology stack",
      type: "string",
      createdById: recruiter.id,
    },
    {
      category: "Education",
      name: "Degree",
      description: "Highest degree obtained",
      type: "dropdown",
      options: ["Bachelor", "Master", "PhD", "Other"],
      createdById: recruiter.id,
    },
    {
      category: "Technical",
      name: "Portfolio Summary",
      description: "Markdown summary of portfolio",
      type: "markdown",
      createdById: recruiter.id,
    },
    {
      category: "Availability",
      name: "Available From",
      description: "Earliest start date",
      type: "date",
      createdById: recruiter.id,
    },
    {
      category: "Availability",
      name: "Notice Period",
      description: "Notice period range",
      type: "period",
      createdById: recruiter.id,
    },
    {
      category: "Profile",
      name: "Certificate Image",
      description: "Upload a certificate image",
      type: "image",
      createdById: recruiter.id,
    },
    {
      category: "Profile",
      name: "Additional Information",
      description: "Any extra details you want to share",
      type: "markdown",
      createdById: recruiter.id,
    },
  ]);

  const techs = await Attribute.bulkCreate([
    { category: "Programming Languages", name: "JavaScript", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "TypeScript", type: "string", kind: "technology", description: "Typed superset of JavaScript", createdById: recruiter.id },
    { category: "Programming Languages", name: "Python", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Java", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Go", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Rust", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "C++", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "C#", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "PHP", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Ruby", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Swift", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Kotlin", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Scala", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "Dart", type: "string", kind: "technology", description: "Programming language", createdById: recruiter.id },
    { category: "Programming Languages", name: "SQL", type: "string", kind: "technology", description: "Query language", createdById: recruiter.id },
    { category: "Frontend", name: "React", type: "string", kind: "technology", description: "Frontend library", createdById: recruiter.id },
    { category: "Frontend", name: "Vue", type: "string", kind: "technology", description: "Frontend framework", createdById: recruiter.id },
    { category: "Frontend", name: "Angular", type: "string", kind: "technology", description: "Frontend framework", createdById: recruiter.id },
    { category: "Frontend", name: "Next.js", type: "string", kind: "technology", description: "React framework", createdById: recruiter.id },
    { category: "Frontend", name: "Nuxt.js", type: "string", kind: "technology", description: "Vue framework", createdById: recruiter.id },
    { category: "Frontend", name: "Svelte", type: "string", kind: "technology", description: "Frontend framework", createdById: recruiter.id },
    { category: "Frontend", name: "jQuery", type: "string", kind: "technology", description: "JavaScript library", createdById: recruiter.id },
    { category: "Frontend", name: "Bootstrap", type: "string", kind: "technology", description: "CSS framework", createdById: recruiter.id },
    { category: "Frontend", name: "Tailwind CSS", type: "string", kind: "technology", description: "Utility-first CSS framework", createdById: recruiter.id },
    { category: "Frontend", name: "Redux", type: "string", kind: "technology", description: "State management", createdById: recruiter.id },
    { category: "Frontend", name: "MobX", type: "string", kind: "technology", description: "State management", createdById: recruiter.id },
    { category: "Frontend", name: "Zustand", type: "string", kind: "technology", description: "State management", createdById: recruiter.id },
    { category: "Frontend", name: "Flutter", type: "string", kind: "technology", description: "UI framework", createdById: recruiter.id },
    { category: "Frontend", name: "React Native", type: "string", kind: "technology", description: "Mobile framework", createdById: recruiter.id },
    { category: "Backend", name: "Node.js", type: "string", kind: "technology", description: "JavaScript runtime", createdById: recruiter.id },
    { category: "Backend", name: "Express", type: "string", kind: "technology", description: "Node.js web framework", createdById: recruiter.id },
    { category: "Backend", name: "NestJS", type: "string", kind: "technology", description: "Node.js enterprise framework", createdById: recruiter.id },
    { category: "Backend", name: "Django", type: "string", kind: "technology", description: "Python web framework", createdById: recruiter.id },
    { category: "Backend", name: "FastAPI", type: "string", kind: "technology", description: "Python API framework", createdById: recruiter.id },
    { category: "Backend", name: "Spring Boot", type: "string", kind: "technology", description: "Java framework", createdById: recruiter.id },
    { category: "Backend", name: "Laravel", type: "string", kind: "technology", description: "PHP framework", createdById: recruiter.id },
    { category: "Backend", name: "Ruby on Rails", type: "string", kind: "technology", description: "Ruby framework", createdById: recruiter.id },
    { category: "Backend", name: "ASP.NET Core", type: "string", kind: "technology", description: ".NET web framework", createdById: recruiter.id },
    { category: "Backend", name: "Gin", type: "string", kind: "technology", description: "Go web framework", createdById: recruiter.id },
    { category: "Backend", name: "Echo", type: "string", kind: "technology", description: "Go web framework", createdById: recruiter.id },
    { category: "Databases", name: "PostgreSQL", type: "string", kind: "technology", description: "Relational database", createdById: recruiter.id },
    { category: "Databases", name: "MySQL", type: "string", kind: "technology", description: "Relational database", createdById: recruiter.id },
    { category: "Databases", name: "MongoDB", type: "string", kind: "technology", description: "NoSQL database", createdById: recruiter.id },
    { category: "Databases", name: "Redis", type: "string", kind: "technology", description: "In-memory database", createdById: recruiter.id },
    { category: "Databases", name: "SQLite", type: "string", kind: "technology", description: "Embedded database", createdById: recruiter.id },
    { category: "Databases", name: "Elasticsearch", type: "string", kind: "technology", description: "Search engine", createdById: recruiter.id },
    { category: "Databases", name: "Firebase", type: "string", kind: "technology", description: "Backend-as-a-Service", createdById: recruiter.id },
    { category: "Databases", name: "Supabase", type: "string", kind: "technology", description: "Open-source Firebase alternative", createdById: recruiter.id },
    { category: "Databases", name: "Prisma", type: "string", kind: "technology", description: "Database ORM", createdById: recruiter.id },
    { category: "Databases", name: "TypeORM", type: "string", kind: "technology", description: "ORM for TypeScript", createdById: recruiter.id },
    { category: "Databases", name: "Sequelize", type: "string", kind: "technology", description: "ORM for Node.js", createdById: recruiter.id },
    { category: "Cloud", name: "AWS", type: "string", kind: "technology", description: "Cloud platform", createdById: recruiter.id },
    { category: "Cloud", name: "Azure", type: "string", kind: "technology", description: "Cloud platform", createdById: recruiter.id },
    { category: "Cloud", name: "Google Cloud", type: "string", kind: "technology", description: "Cloud platform", createdById: recruiter.id },
    { category: "Cloud", name: "Vercel", type: "string", kind: "technology", description: "Frontend deployment", createdById: recruiter.id },
    { category: "Cloud", name: "Netlify", type: "string", kind: "technology", description: "Frontend deployment", createdById: recruiter.id },
    { category: "Cloud", name: "Heroku", type: "string", kind: "technology", description: "Cloud platform", createdById: recruiter.id },
    { category: "Cloud", name: "DigitalOcean", type: "string", kind: "technology", description: "Cloud platform", createdById: recruiter.id },
    { category: "Cloud", name: "Cloudflare", type: "string", kind: "technology", description: "CDN and edge network", createdById: recruiter.id },
    { category: "DevOps", name: "Docker", type: "string", kind: "technology", description: "Containerization platform", createdById: recruiter.id },
    { category: "DevOps", name: "Kubernetes", type: "string", kind: "technology", description: "Container orchestration", createdById: recruiter.id },
    { category: "DevOps", name: "Terraform", type: "string", kind: "technology", description: "Infrastructure as code", createdById: recruiter.id },
    { category: "DevOps", name: "Ansible", type: "string", kind: "technology", description: "Configuration management", createdById: recruiter.id },
    { category: "DevOps", name: "Jenkins", type: "string", kind: "technology", description: "CI/CD server", createdById: recruiter.id },
    { category: "DevOps", name: "GitHub Actions", type: "string", kind: "technology", description: "CI/CD", createdById: recruiter.id },
    { category: "DevOps", name: "GitLab CI", type: "string", kind: "technology", description: "CI/CD", createdById: recruiter.id },
    { category: "DevOps", name: "CircleCI", type: "string", kind: "technology", description: "CI/CD", createdById: recruiter.id },
    { category: "DevOps", name: "Argo CD", type: "string", kind: "technology", description: "GitOps continuous delivery", createdById: recruiter.id },
    { category: "DevOps", name: "Helm", type: "string", kind: "technology", description: "Kubernetes package manager", createdById: recruiter.id },
    { category: "DevOps", name: "Prometheus", type: "string", kind: "technology", description: "Monitoring", createdById: recruiter.id },
    { category: "DevOps", name: "Grafana", type: "string", kind: "technology", description: "Visualization", createdById: recruiter.id },
    { category: "Tools", name: "Git", type: "string", kind: "technology", description: "Version control", createdById: recruiter.id },
    { category: "Tools", name: "GitHub", type: "string", kind: "technology", description: "Code hosting platform", createdById: recruiter.id },
    { category: "Tools", name: "GitLab", type: "string", kind: "technology", description: "DevOps platform", createdById: recruiter.id },
    { category: "Tools", name: "Bitbucket", type: "string", kind: "technology", description: "Code hosting", createdById: recruiter.id },
    { category: "Tools", name: "Jira", type: "string", kind: "technology", description: "Project management", createdById: recruiter.id },
    { category: "Tools", name: "Confluence", type: "string", kind: "technology", description: "Documentation", createdById: recruiter.id },
    { category: "Tools", name: "Slack", type: "string", kind: "technology", description: "Communication", createdById: recruiter.id },
    { category: "Tools", name: "Figma", type: "string", kind: "technology", description: "Design tool", createdById: recruiter.id },
    { category: "Tools", name: "Postman", type: "string", kind: "technology", description: "API testing", createdById: recruiter.id },
    { category: "Tools", name: "Swagger", type: "string", kind: "technology", description: "API documentation", createdById: recruiter.id },
    { category: "Tools", name: "Linux", type: "string", kind: "technology", description: "Operating system", createdById: recruiter.id },
    { category: "Tools", name: "Nginx", type: "string", kind: "technology", description: "Web server", createdById: recruiter.id },
    { category: "Tools", name: "Apache", type: "string", kind: "technology", description: "Web server", createdById: recruiter.id },
    { category: "API Technologies", name: "GraphQL", type: "string", kind: "technology", description: "Query language for APIs", createdById: recruiter.id },
    { category: "API Technologies", name: "REST API", type: "string", kind: "technology", description: "API architecture style", createdById: recruiter.id },
    { category: "API Technologies", name: "gRPC", type: "string", kind: "technology", description: "RPC framework", createdById: recruiter.id },
    { category: "API Technologies", name: "WebSocket", type: "string", kind: "technology", description: "Communication protocol", createdById: recruiter.id },
    { category: "API Technologies", name: "Webhook", type: "string", kind: "technology", description: "HTTP callback", createdById: recruiter.id },
    { category: "API Technologies", name: "OpenAPI", type: "string", kind: "technology", description: "API specification", createdById: recruiter.id },
    { category: "API Technologies", name: "tRPC", type: "string", kind: "technology", description: "Type-safe API", createdById: recruiter.id },
    { category: "API Technologies", name: "Socket.IO", type: "string", kind: "technology", description: "Real-time engine", createdById: recruiter.id },
    { category: "Testing", name: "Jest", type: "string", kind: "technology", description: "Testing framework", createdById: recruiter.id },
    { category: "Testing", name: "Mocha", type: "string", kind: "technology", description: "Testing framework", createdById: recruiter.id },
    { category: "Testing", name: "Cypress", type: "string", kind: "technology", description: "E2E testing", createdById: recruiter.id },
    { category: "Testing", name: "Playwright", type: "string", kind: "technology", description: "E2E testing", createdById: recruiter.id },
    { category: "Testing", name: "Selenium", type: "string", kind: "technology", description: "Browser automation", createdById: recruiter.id },
    { category: "Testing", name: "JUnit", type: "string", kind: "technology", description: "Java testing", createdById: recruiter.id },
    { category: "Testing", name: "PyTest", type: "string", kind: "technology", description: "Python testing", createdById: recruiter.id },
    { category: "Testing", name: "Vitest", type: "string", kind: "technology", description: "Vite-native testing", createdById: recruiter.id },
    { category: "Testing", name: "Storybook", type: "string", kind: "technology", description: "Component explorer", createdById: recruiter.id },
    { category: "Testing", name: "Postman", type: "string", kind: "technology", description: "API testing", createdById: recruiter.id },
    { category: "Mobile", name: "React Native", type: "string", kind: "technology", description: "Mobile framework", createdById: recruiter.id },
    { category: "Mobile", name: "Flutter", type: "string", kind: "technology", description: "Mobile UI framework", createdById: recruiter.id },
    { category: "Mobile", name: "SwiftUI", type: "string", kind: "technology", description: "iOS UI framework", createdById: recruiter.id },
    { category: "Mobile", name: "Jetpack Compose", type: "string", kind: "technology", description: "Android UI framework", createdById: recruiter.id },
    { category: "Mobile", name: "Expo", type: "string", kind: "technology", description: "React Native platform", createdById: recruiter.id },
    { category: "Mobile", name: "Ionic", type: "string", kind: "technology", description: "Hybrid mobile framework", createdById: recruiter.id },
    { category: "Mobile", name: "Xamarin", type: "string", kind: "technology", description: ".NET mobile framework", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "TensorFlow", type: "string", kind: "technology", description: "Machine learning framework", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "PyTorch", type: "string", kind: "technology", description: "Machine learning framework", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "Keras", type: "string", kind: "technology", description: "Deep learning API", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "Scikit-learn", type: "string", kind: "technology", description: "ML library", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "OpenCV", type: "string", kind: "technology", description: "Computer vision", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "Hugging Face", type: "string", kind: "technology", description: "ML platform", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "LangChain", type: "string", kind: "technology", description: "LLM framework", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "OpenAI", type: "string", kind: "technology", description: "AI API", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "Stable Diffusion", type: "string", kind: "technology", description: "Image generation", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "Pandas", type: "string", kind: "technology", description: "Data analysis", createdById: recruiter.id },
    { category: "AI / Machine Learning", name: "NumPy", type: "string", kind: "technology", description: "Numerical computing", createdById: recruiter.id },
    { category: "CMS", name: "WordPress", type: "string", kind: "technology", description: "CMS", createdById: recruiter.id },
    { category: "CMS", name: "Drupal", type: "string", kind: "technology", description: "CMS", createdById: recruiter.id },
    { category: "CMS", name: "Joomla", type: "string", kind: "technology", description: "CMS", createdById: recruiter.id },
    { category: "CMS", name: "Strapi", type: "string", kind: "technology", description: "Headless CMS", createdById: recruiter.id },
    { category: "CMS", name: "Contentful", type: "string", kind: "technology", description: "Headless CMS", createdById: recruiter.id },
    { category: "CMS", name: "Sanity", type: "string", kind: "technology", description: "Headless CMS", createdById: recruiter.id },
    { category: "Build Tools", name: "Webpack", type: "string", kind: "technology", description: "Bundler", createdById: recruiter.id },
    { category: "Build Tools", name: "Vite", type: "string", kind: "technology", description: "Build tool", createdById: recruiter.id },
    { category: "Build Tools", name: "Rollup", type: "string", kind: "technology", description: "Bundler", createdById: recruiter.id },
    { category: "Build Tools", name: "esbuild", type: "string", kind: "technology", description: "Bundler", createdById: recruiter.id },
    { category: "Build Tools", name: "Babel", type: "string", kind: "technology", description: "Compiler", createdById: recruiter.id },
    { category: "Build Tools", name: "Gradle", type: "string", kind: "technology", description: "Build automation", createdById: recruiter.id },
    { category: "Build Tools", name: "Maven", type: "string", kind: "technology", description: "Build automation", createdById: recruiter.id },
    { category: "Build Tools", name: "npm", type: "string", kind: "technology", description: "Package manager", createdById: recruiter.id },
    { category: "Build Tools", name: "Yarn", type: "string", kind: "technology", description: "Package manager", createdById: recruiter.id },
    { category: "Build Tools", name: "pnpm", type: "string", kind: "technology", description: "Package manager", createdById: recruiter.id },
    { category: "Message Brokers", name: "RabbitMQ", type: "string", kind: "technology", description: "Message broker", createdById: recruiter.id },
    { category: "Message Brokers", name: "Apache Kafka", type: "string", kind: "technology", description: "Distributed streaming", createdById: recruiter.id },
    { category: "Message Brokers", name: "Redis Streams", type: "string", kind: "technology", description: "Streaming", createdById: recruiter.id },
    { category: "Message Brokers", name: "Amazon SQS", type: "string", kind: "technology", description: "Message queue", createdById: recruiter.id },
    { category: "Message Brokers", name: "Google Pub/Sub", type: "string", kind: "technology", description: "Messaging service", createdById: recruiter.id },
    { category: "Operating Systems", name: "Linux", type: "string", kind: "technology", description: "Operating system", createdById: recruiter.id },
    { category: "Operating Systems", name: "Ubuntu", type: "string", kind: "technology", description: "Linux distribution", createdById: recruiter.id },
    { category: "Operating Systems", name: "Debian", type: "string", kind: "technology", description: "Linux distribution", createdById: recruiter.id },
    { category: "Operating Systems", name: "Windows Server", type: "string", kind: "technology", description: "Operating system", createdById: recruiter.id },
    { category: "Operating Systems", name: "macOS", type: "string", kind: "technology", description: "Operating system", createdById: recruiter.id },
    { category: "Operating Systems", name: "Android", type: "string", kind: "technology", description: "Mobile OS", createdById: recruiter.id },
    { category: "Operating Systems", name: "iOS", type: "string", kind: "technology", description: "Mobile OS", createdById: recruiter.id },
  ]);

  const [ielts, remote, presentation, years, stack, degree, portfolio, available, notice] =
    attrs;

  await UserAttribute.bulkCreate([
    { userId: candidate.id, attributeId: ielts.id, value: 7.5 },
    { userId: candidate.id, attributeId: remote.id, value: true },
    { userId: candidate.id, attributeId: presentation.id, value: "Advanced" },
    { userId: candidate.id, attributeId: years.id, value: 5 },
    { userId: candidate.id, attributeId: stack.id, value: "React / Node.js" },
    { userId: candidate.id, attributeId: degree.id, value: "Master" },
    {
      userId: candidate.id,
      attributeId: portfolio.id,
      value: "## Highlights\n- Built recruitment platforms\n- Led frontend architecture",
    },
    { userId: candidate.id, attributeId: available.id, value: "2026-08-01" },
    {
      userId: candidate.id,
      attributeId: notice.id,
      value: { from: "2026-07-01", to: "2026-07-31" },
    },
    { userId: candidate2.id, attributeId: ielts.id, value: 6.5 },
    { userId: candidate2.id, attributeId: remote.id, value: true },
    { userId: candidate2.id, attributeId: presentation.id, value: "Intermediate" },
    { userId: candidate2.id, attributeId: years.id, value: 3 },
    { userId: candidate2.id, attributeId: stack.id, value: "Python / Django" },
  ]);

  await Project.bulkCreate([
    {
      userId: candidate.id,
      name: "TalentFlow CV Platform",
      startDate: "2025-01-01",
      currentlyWorking: true,
      order: 0,
      description:
        "## Full-stack recruitment platform\n- Automatic CV generation from profile data\n- Live recruiter discussions via WebSockets\n- Role-based access for candidates and recruiters",
      tags: ["React", "TypeScript", "Express", "MySQL", "Socket.IO", "Bootstrap"],
    },
    {
      userId: candidate.id,
      name: "Talent Hub Portal",
      startDate: "2024-01-01",
      endDate: "2024-09-01",
      order: 1,
      description:
        "Built a multi-tenant hiring portal with searchable candidate profiles and role-based access.",
      tags: ["React", "Node.js", "PostgreSQL", "WebSockets"],
    },
    {
      userId: candidate.id,
      name: "Analytics Dashboard",
      startDate: "2023-03-01",
      endDate: "2023-11-01",
      order: 2,
      description: "Designed interactive charts and real-time KPI widgets for recruiters.",
      tags: ["React", "D3", "TypeScript"],
    },
    {
      userId: candidate.id,
      name: "Mobile Onboarding App",
      startDate: "2022-06-01",
      endDate: "2023-01-01",
      order: 3,
      description:
        "Cross-platform onboarding app with offline support and push notifications.",
      tags: ["React", "Redux", "Firebase", "REST API"],
    },
    {
      userId: candidate2.id,
      name: "ML Resume Screener",
      startDate: "2024-02-01",
      currentlyWorking: true,
      order: 0,
      description:
        "## Automated resume ranking\n- NLP pipelines for skill extraction\n- Scoring against open positions\n- Admin review queue",
      tags: ["Python", "PyTorch", "Django", "PostgreSQL", "Docker"],
    },
    {
      userId: candidate2.id,
      name: "Data Pipeline Toolkit",
      startDate: "2023-04-01",
      endDate: "2024-01-01",
      order: 1,
      description: "Batch and streaming ETL toolkit with scheduling and observability.",
      tags: ["Python", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS"],
    },
    {
      userId: candidate2.id,
      name: "Internal Wiki Service",
      startDate: "2022-09-01",
      endDate: "2023-03-01",
      order: 2,
      description: "Markdown-based knowledge base with full-text search.",
      tags: ["Vue", "Express", "MongoDB", "Elasticsearch"],
    },
  ]);

  const frontendPos = await Position.create({
    title: "Senior Frontend Engineer",
    shortDescription:
      "Own the candidate experience UI for our recruitment platform. Strong React skills required.",
    company: "Northstar Talent",
    level: "senior",
    visibility: "public",
    attributeTemplate: [years.id, stack.id, presentation.id, remote.id, portfolio.id],
    accessRules: [
      { attributeId: years.id, operator: ">=", value: 3, type: "number" },
      { attributeId: remote.id, operator: "=", value: true, type: "boolean" },
    ],
    projectTags: ["React", "TypeScript", "Node.js"],
    maxProjects: 3,
    createdById: recruiter.id,
    viewCount: 42,
  });

  const fullstackPos = await Position.create({
    title: "Full-Stack Developer",
    shortDescription: "Ship end-to-end features across React and Express.",
    company: "Northstar Talent",
    level: "mid",
    visibility: "public",
    attributeTemplate: [years.id, stack.id, ielts.id, degree.id],
    accessRules: [{ attributeId: ielts.id, operator: ">", value: 7, type: "number" }],
    projectTags: ["React", "Node.js"],
    maxProjects: 4,
    createdById: recruiter.id,
    viewCount: 28,
  });

  const internPos = await Position.create({
    title: "Software Engineering Intern",
    shortDescription: "Join a product squad and learn modern hiring tech.",
    company: "Launchpad Labs",
    level: "junior",
    visibility: "public",
    attributeTemplate: [stack.id, degree.id, presentation.id],
    accessRules: [],
    projectTags: ["React", "Python"],
    maxProjects: 2,
    createdById: admin.id,
    viewCount: 15,
  });

  await Position.create({
    title: "Staff Platform Engineer",
    shortDescription: "Lead platform architecture for high-scale recruitment tooling.",
    company: "Workstream Inc",
    level: "lead",
    visibility: "public",
    attributeTemplate: [years.id, stack.id, presentation.id, remote.id],
    accessRules: [
      { attributeId: years.id, operator: ">=", value: 7, type: "number" },
      { attributeId: presentation.id, operator: "=", value: "Advanced", type: "dropdown" },
    ],
    projectTags: ["Node.js", "PostgreSQL", "WebSockets"],
    maxProjects: 5,
    createdById: recruiter.id,
    viewCount: 61,
  });

  const cv1 = await CV.create({
    userId: candidate.id,
    positionId: frontendPos.id,
    status: "published",
    likesCount: 1,
  });

  await CV.create({
    userId: candidate.id,
    positionId: fullstackPos.id,
    status: "draft",
  });

  await CV.create({
    userId: candidate2.id,
    positionId: internPos.id,
    status: "published",
    likesCount: 0,
  });

  await CVLike.create({ cvId: cv1.id, recruiterId: recruiter.id });

  await DiscussionMessage.bulkCreate([
    {
      positionId: frontendPos.id,
      userId: recruiter.id,
      content: "Welcome candidates! Please share questions about the role here.",
    },
    {
      positionId: frontendPos.id,
      userId: candidate.id,
      content: "Is the role fully remote, or hybrid?",
    },
    {
      positionId: frontendPos.id,
      userId: recruiter.id,
      content: "Fully remote within overlapping EU/US hours.",
    },
  ]);

  const baseAttrs = await Attribute.findAll({ where: { kind: "attribute" } });
  const demoUsers = [admin, recruiter, candidate, candidate2];
  for (const user of demoUsers) {
    if (baseAttrs.length > 0) {
      await UserAttribute.bulkCreate(
        baseAttrs.map((a) => ({ userId: user.id, attributeId: a.id, value: null })),
        { ignoreDuplicates: true }
      );
    }
  }

  if (!admin.skills?.length) admin.skills = ["Vue", "JavaScript", "TypeScript", "C++", "c#", "Amazon SQS", "PyTest"];
  await admin.save();

  const candidate2Skills = ["React", "Python", "PyTorch", "Django", "PostgreSQL", "Docker"];
  const candidate2Current = candidate2.skills || [];
  const mergedCandidate2 = [...new Set([...candidate2Skills, ...candidate2Current])];
  if (mergedCandidate2.length !== candidate2Current.length) {
    candidate2.skills = mergedCandidate2;
    await candidate2.save();
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password: password123):");
  console.log("  admin@cv.local");
  console.log("  recruiter@cv.local");
  console.log("  candidate@cv.local");
  console.log("  jane@cv.local");
}

if (require.main === module) {
  seed({ force: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };