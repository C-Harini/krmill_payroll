const db = require("./models");

async function dumpUsers() {
  try {
    const users = await db.User.findAll();
    console.log("USERS_DUMP_START");
    console.log(JSON.stringify(users.map(u => ({
      id: u.id,
      email: u.email,
      phoneNumber: u.phoneNumber,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.status,
      companyId: u.companyId
    })), null, 2));
    console.log("USERS_DUMP_END");
    process.exit(0);
  } catch (error) {
    console.error("Error dumping users:", error);
    process.exit(1);
  }
}

dumpUsers();
