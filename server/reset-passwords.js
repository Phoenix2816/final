const bcrypt = require("bcrypt");
const { sequelize, User } = require("./models");

async function resetPasswords() {
  try {
    await sequelize.authenticate();
    console.log("Database connected:", sequelize.getDialect());

    const hash = await bcrypt.hash("123123", 10);
    const result = await User.update(
      { passwordHash: hash },
      { where: {} }
    );

    console.log(`Updated passwords for ${result[0]} users.`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to reset passwords:", err);
    process.exit(1);
  }
}

resetPasswords();
