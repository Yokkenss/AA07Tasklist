require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Alle Änderungen passieren in einer eigenen, kurzlebigen Testdatenbank.
test('Tasklist v3 mit MySQL', async t => {
  const connection = new URL(process.env.DATABASE_URL);
  const databaseName = 'tasklist_test_' + Date.now();
  const connectionForSetup = new PrismaClient();
  await connectionForSetup.$executeRawUnsafe('CREATE DATABASE `' + databaseName + '`');
  connection.pathname = '/' + databaseName;
  process.env.DATABASE_URL = connection.toString();

  const prisma = require('../prisma/client');
  let server;
  function cli(...args) {
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
      env: process.env, stdio: 'pipe'
    });
  }
  function sql(query) {
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'], {
      env: process.env, stdio: 'pipe', input: query
    });
  }

  try {
    await prisma.$executeRawUnsafe(fs.readFileSync('prisma/migrations/20261012103918_create_task/migration.sql', 'utf8'));
    await prisma.$executeRaw`INSERT INTO Task (title, description, dueDate, done) VALUES ('Alte Aufgabe', 'Aus v2', '2020-01-01', false)`;
    cli('migrate', 'resolve', '--applied', '20261012103918_create_task');
    cli('migrate', 'deploy');
    cli('db', 'seed');
    cli('db', 'seed');

    const admin = await prisma.user.findUnique({ where: { email: 'admin@tasklist.local' } });
    await t.test('Migration erhält alte Aufgaben, Seed erzeugt keinen zweiten Admin', async () => {
      const old = await prisma.task.findFirst();
      assert.equal(old.title, 'Alte Aufgabe');
      assert.equal(old.description, 'Aus v2');
      assert.equal(old.dueDate.toISOString().slice(0, 10), '2020-01-01');
      assert.equal(old.creatorId, admin.id);
      assert.equal(old.assigneeId, null);
      assert.equal(await prisma.user.count(), 1);
      assert.equal(admin.role, 'admin');
      assert.match(admin.password, /^\$2[aby]\$12\$/);
    });

    server = require('../server').listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const post = (url, body) => fetch(base + url, {
      method: 'POST', body: new URLSearchParams(body), redirect: 'manual'
    });
    const password = 'test-password-123';
    let first, second, task;

    await t.test('Seiten und Stylesheet werden geladen', async () => {
      for (const url of ['/', '/tasks/new', '/register', '/users', '/css/styles.css']) {
        const response = await fetch(base + url);
        assert.equal(response.status, 200, url);
        await response.text();
      }
    });

    await t.test('Registrierung speichert Hash und zugewiesene Profilbild-Aufgabe', async () => {
      const response = await post('/register', { email: 'FIRST@example.test', password, role: 'admin' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), '/');
      first = await prisma.user.findUnique({ where: { email: 'first@example.test' } });
      assert.equal(first.role, 'user');
      assert.equal(first.profileImage, null);
      assert.notEqual(first.password, password);
      assert.ok(await bcrypt.compare(password, first.password));
      const profileTask = await prisma.task.findFirst({ where: { assigneeId: first.id } });
      assert.equal(profileTask.title, 'Profilbild hochladen');
      assert.equal(profileTask.creatorId, admin.id);
      const deadline = new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }));
      deadline.setUTCDate(deadline.getUTCDate() + 2);
      assert.equal(profileTask.dueDate.toISOString(), deadline.toISOString());
    });

    await t.test('Doppelte E-Mail und ungültige Eingaben hinterlassen keine Daten', async () => {
      const count = await prisma.task.count();
      const duplicate = await post('/register', { email: '  First@EXAMPLE.test ', password });
      assert.equal(duplicate.status, 409);
      assert.match(await duplicate.text(), /bereits verwendet/);
      for (const body of [{ email: 'invalid', password }, { email: 'x@example.test', password: 'short' },
        { email: 'x@example.test', password: 'ä'.repeat(40) }]) {
        assert.equal((await post('/register', body)).status, 400);
      }
      assert.equal(await prisma.task.count(), count);
      assert.equal(await prisma.user.count(), 2);
    });

    await t.test('Fehler beim Anlegen der Aufgabe rollt auch den Benutzer zurück', async () => {
      const count = await prisma.task.count();
      sql("CREATE TRIGGER fail_task BEFORE INSERT ON Task FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test: Aufgabe fehlgeschlagen'");
      try {
        assert.equal((await post('/register', { email: 'rollback@example.test', password })).status, 503);
        assert.equal(await prisma.user.findUnique({ where: { email: 'rollback@example.test' } }), null);
        assert.equal(await prisma.task.count(), count);
      } finally {
        sql('DROP TRIGGER fail_task');
      }
    });

    await t.test('Rollen werden geändert und gespeichert', async () => {
      assert.equal((await post('/register', { email: 'second@example.test', password })).status, 302);
      second = await prisma.user.findUnique({ where: { email: 'second@example.test' } });
      for (const role of ['admin', 'user']) {
        assert.equal((await post('/users/' + second.id + '/role', { role })).status, 302);
        assert.equal((await prisma.user.findUnique({ where: { id: second.id } })).role, role);
      }
      assert.equal((await post('/users/' + second.id + '/role', { role: 'owner' })).status, 400);
    });

    await t.test('Neue Aufgabe gehört dem Admin und ist nicht zugewiesen', async () => {
      const response = await post('/tasks', { title: 'Neue Aufgabe', description: '', dueDate: '2099-01-01', creatorId: first.id, assigneeId: first.id });
      assert.equal(response.status, 302);
      task = await prisma.task.findFirst({ where: { title: 'Neue Aufgabe' } });
      assert.equal(task.creatorId, admin.id);
      assert.equal(task.assigneeId, null);
    });

    await t.test('Zuweisen, Wechseln und Entfernen ändern den Ersteller nicht', async () => {
      for (const assigneeId of [first.id, second.id, '']) {
        assert.equal((await post('/tasks/' + task.id + '/assign', { assigneeId })).status, 302);
        const saved = await prisma.task.findUnique({ where: { id: task.id } });
        assert.equal(saved.assigneeId, assigneeId === '' ? null : assigneeId);
        assert.equal(saved.creatorId, admin.id);
      }
      assert.equal((await post('/tasks/' + task.id + '/assign', { assigneeId: 9999999 })).status, 404);
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).assigneeId, null);
    });

    await t.test('Datum, Textlänge und Aufgaben-IDs werden geprüft', async () => {
      for (const dueDate of ['2020-01-01', '2099-02-30', 'invalid']) {
        assert.equal((await post('/tasks', { title: 'Test', dueDate })).status, 400);
      }
      for (const title of ['   ', 'a'.repeat(192)]) {
        assert.equal((await post('/tasks', { title, dueDate: '2099-01-01' })).status, 400);
      }
      for (const action of ['complete', 'delete']) {
        assert.equal((await post('/tasks/-1/' + action, {})).status, 400);
        assert.equal((await post('/tasks/9999999/' + action, {})).status, 404);
      }
      assert.equal((await post('/tasks/' + task.id + '/complete', {})).status, 302);
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).done, true);
      assert.equal((await post('/tasks/' + task.id + '/delete', {})).status, 302);
      assert.equal(await prisma.task.findUnique({ where: { id: task.id } }), null);
    });

    await t.test('Keine Passwort-Hashes auf den Seiten', async () => {
      for (const url of ['/', '/users']) {
        const html = await (await fetch(base + url)).text();
        assert.ok(html.includes(first.email));
        assert.ok(!html.includes(first.password));
      }
    });

    await t.test('Ohne Admin gibt es eine verständliche Meldung und keine halben Daten', async () => {
      await prisma.user.updateMany({ data: { role: 'user' } });
      assert.equal((await post('/tasks', { title: 'Test', dueDate: '2099-01-01' })).status, 409);
      assert.equal((await post('/register', { email: 'noadmin@example.test', password })).status, 503);
      assert.equal(await prisma.user.findUnique({ where: { email: 'noadmin@example.test' } }), null);
      assert.equal((await post('/users/' + admin.id + '/role', { role: 'admin' })).status, 302);
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await prisma.$disconnect();
    await connectionForSetup.$executeRawUnsafe('DROP DATABASE `' + databaseName + '`');
    await connectionForSetup.$disconnect();
  }
});
