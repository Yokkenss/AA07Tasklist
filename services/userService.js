const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

async function saveUser({ id, email, password, role = 'user' }, database = prisma) {
  const data = {
    email: email.trim().toLowerCase(),
    password: await bcrypt.hash(password, 12),
    role
  };

  if (id) {
    return database.user.update({ where: { id }, data });
  }
  return database.user.create({ data });
}

module.exports = { saveUser };
