const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const prisma = require('./client');
const { saveUser } = require('../services/userService');

async function main() {
  const email = 'admin@tasklist.local';
  const password = process.env.ADMIN_PASSWORD || randomBytes(24).toString('hex');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD muss mindestens 8 Zeichen und höchstens 72 Bytes haben.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const admin = await saveUser({ id: existing?.id, email, password, role: 'admin' });
  if (admin.role !== 'admin' || !await bcrypt.compare(password, admin.password)) {
    throw new Error('Der Admin konnte nicht überprüft werden.');
  }
  console.log(`Admin gespeichert und Passwort-Hash geprüft: ${admin.email} (ID ${admin.id})`);
}

main()
  .catch(error => {
    console.error('Seed fehlgeschlagen:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
