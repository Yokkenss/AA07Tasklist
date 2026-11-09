const express = require('express');
const router = express.Router();
const controller = require('../controllers/taskController');

router.get('/', controller.getAllTasks);
router.get('/tasks/new', controller.getNewTaskForm);
router.post('/tasks', controller.createTask);
router.post('/tasks/:id/complete', controller.completeTask);
router.post('/tasks/:id/delete', controller.deleteTask);
router.post('/tasks/:id/assign', controller.assignTask);

module.exports = router;
