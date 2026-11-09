const prisma = require('../prisma/client');
const { saveUser } = require('../services/userService');

exports.getRegistration = (req, res) => {
  res.render('register', { error: null, email: '' });
};

exports.register = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  let error = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
    error = 'Bitte gib eine gültige E-Mail-Adresse ein.';
  } else if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    error = 'Das Passwort muss mindestens 8 Zeichen und höchstens 72 Bytes haben.';
  }
  if (error) {
    return res.status(400).render('register', { error, email });
  }

  try {
    await prisma.$transaction(async database => {
      const admin = await database.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } });
      if (!admin) {
        throw new Error('NO_ADMIN');
      }
      const user = await saveUser({ email, password }, database);
      const dueDate = new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }));
      dueDate.setUTCDate(dueDate.getUTCDate() + 2);
      await database.task.create({
        data: {
          title: 'Profilbild hochladen',
          description: 'Lade ein Profilbild für dein Benutzerkonto hoch.',
          dueDate,
          creatorId: admin.id,
          assigneeId: user.id
        }
      });
    });
    res.redirect('/');
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).render('register', { error: 'Diese E-Mail-Adresse wird bereits verwendet.', email });
    }
    const message = error.message === 'NO_ADMIN'
      ? 'Es gibt keinen Admin. Bitte führe zuerst den Seed aus.'
      : 'Die Registrierung konnte nicht gespeichert werden. Bitte prüfe die Datenbank.';
    console.error('Registrierung:', error.code || error.name);
    res.status(503).render('register', { error: message, email });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, profileImage: true, role: true },
      orderBy: { id: 'asc' }
    });
    res.render('users', { users });
  } catch (error) {
    console.error('Benutzer laden:', error.code || error.name);
    res.status(503).send('Die Benutzer konnten nicht geladen werden. Bitte prüfe die Datenbank.');
  }
};

exports.changeRole = async (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role;
  if (!Number.isSafeInteger(id) || id < 1 || !['admin', 'user'].includes(role)) {
    return res.status(400).send('Ungültiger Benutzer oder ungültige Rolle.');
  }
  try {
    await prisma.user.update({ where: { id }, data: { role } });
    res.redirect('/users');
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).send('Diesen Benutzer gibt es nicht.');
    }
    console.error('Rolle ändern:', error.code || error.name);
    res.status(503).send('Die Rolle konnte nicht gespeichert werden.');
  }
};
