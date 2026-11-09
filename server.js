const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const app = express();
const port = 3000;

const prisma = new PrismaClient();


let tasks = [
 
];

// Middlewares
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make tasks available to routes
app.use((req, res, next) => {
  req.tasks = tasks;
  req.setTasks = (newTasks) => { tasks = newTasks; };
  next();
});

// Routes
const taskRoutes = require('./routes/taskRoutes');
app.use('/', taskRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});