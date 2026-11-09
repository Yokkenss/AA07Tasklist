
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const taskTimeZone = 'Europe/Zurich';

function getToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: taskTimeZone });
}

exports.getAllTasks = async (req, res) => {
   try {
    const databaseTasks = await prisma.task.findMany({
      orderBy: [
        { done: 'asc' },
        { dueDate: 'asc' }
      ]
    });

     const tasks = databaseTasks.map(task => ({
      ...task,
      status: task.done ? 'erledigt' : 'nicht erledigt',
      dueDate: task.dueDate.toLocaleDateString('de-CH', { timeZone: taskTimeZone })
    }));

    res.render('index', {
      tasks,
      error: null
    });
  } catch (error) {
console.error("Genauer Fehler: " +  error)

    res.status(500).send(
    'Die Aufgaben konnten nicht aus der Datenbank geladen werden.'
    );
  }
};

exports.getNewTaskForm = (req, res) => {
  res.render('new-Task', { minDueDate: getToday() });
};

exports.createTask = async (req, res) => {
  const { title, description, dueDate } = req.body || {};

  if (!title || !description || typeof dueDate !== 'string' || !dueDate) {
    return res.status(400).send('Bitte füllen Sie alle Felder aus.');
  }

  const date = new Date(`${dueDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate ||
      dueDate < getToday()) {
    return res.status(400).send('Bitte wähle ein gültiges Datum ab heute.');
  }

  try {
    await prisma.task.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        dueDate: date
      }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Aufgabe konnte nicht gespeichert werden:', error);

    res.status(500).send(
      'Die Aufgabe konnte nicht in der Datenbank gespeichert werden.'
    );
  }
};

exports.completeTask = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).send('Ungültige Aufgaben-ID.');
  }
  
  try {
    await prisma.task.update({
      where: { id },
      data: { done: true }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Aufgabe konnte nicht aktualisiert werden:', error);

    res.status(500).send(
      'Die Aufgabe konnte nicht als erledigt gespeichert werden.'
    );
  }
};

exports.deleteTask = async (req, res) => {
   const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).send('Ungültige Aufgaben-ID.');
  }

  try {
    await prisma.task.delete({
      where: { id }
    });

    res.redirect('/');
  } catch (error) {
    console.error('Aufgabe konnte nicht gelöscht werden:', error);

    res.status(500).send(
      'Die Aufgabe konnte nicht aus der Datenbank gelöscht werden.'
    );
  }
};
