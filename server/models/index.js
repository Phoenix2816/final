const { sequelize } = require("../config/database");
const UserModel = require("./User");
const AttributeModel = require("./Attribute");
const UserAttributeModel = require("./UserAttribute");
const ProjectModel = require("./Project");
const PositionModel = require("./Position");
const CVModel = require("./CV");
const CVLikeModel = require("./CVLike");
const DiscussionMessageModel = require("./DiscussionMessage");
const RecentAttributeModel = require("./RecentAttribute");
const PasswordResetModel = require("./PasswordReset");

const User = UserModel(sequelize);
const Attribute = AttributeModel(sequelize);
const UserAttribute = UserAttributeModel(sequelize);
const Project = ProjectModel(sequelize);
const Position = PositionModel(sequelize);
const CV = CVModel(sequelize);
const CVLike = CVLikeModel(sequelize);
const DiscussionMessage = DiscussionMessageModel(sequelize);
const RecentAttribute = RecentAttributeModel(sequelize);
const PasswordReset = PasswordResetModel(sequelize);

User.hasMany(UserAttribute, { foreignKey: "userId", as: "attributes", onDelete: "CASCADE" });
UserAttribute.belongsTo(User, { foreignKey: "userId" });
UserAttribute.belongsTo(Attribute, { foreignKey: "attributeId", as: "attribute" });
Attribute.hasMany(UserAttribute, { foreignKey: "attributeId" });

User.hasMany(Project, { foreignKey: "userId", as: "projects", onDelete: "CASCADE" });
Project.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Position, { foreignKey: "createdById", as: "createdPositions" });
Position.belongsTo(User, { foreignKey: "createdById", as: "creator" });

User.hasMany(CV, { foreignKey: "userId", as: "cvs", onDelete: "CASCADE" });
CV.belongsTo(User, { foreignKey: "userId", as: "candidate" });
CV.belongsTo(Position, { foreignKey: "positionId", as: "position" });
Position.hasMany(CV, { foreignKey: "positionId", as: "cvs", onDelete: "CASCADE" });

CV.hasMany(CVLike, { foreignKey: "cvId", as: "likes", onDelete: "CASCADE" });
CVLike.belongsTo(CV, { foreignKey: "cvId" });
CVLike.belongsTo(User, { foreignKey: "recruiterId", as: "recruiter" });

Position.hasMany(DiscussionMessage, {
  foreignKey: "positionId",
  as: "messages",
  onDelete: "CASCADE",
});
DiscussionMessage.belongsTo(Position, { foreignKey: "positionId" });
DiscussionMessage.belongsTo(User, { foreignKey: "userId", as: "author" });

User.hasMany(RecentAttribute, { foreignKey: "userId", onDelete: "CASCADE" });
RecentAttribute.belongsTo(User, { foreignKey: "userId", as: "attribute" });
Attribute.hasMany(RecentAttribute, { foreignKey: "createdById", as: "creator" });

User.hasMany(PasswordReset, { foreignKey: "userId", onDelete: "CASCADE" });
PasswordReset.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  sequelize,
  User,
  Attribute,
  UserAttribute,
  Project,
  Position,
  CV,
  CVLike,
  DiscussionMessage,
  RecentAttribute,
  PasswordReset,
};