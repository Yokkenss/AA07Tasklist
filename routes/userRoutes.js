const router = require('express').Router();
const controller = require('../controllers/userController');

router.get('/register', controller.getRegistration);
router.post('/register', controller.register);
router.get('/users', controller.getUsers);
router.post('/users/:id/role', controller.changeRole);

module.exports = router;
