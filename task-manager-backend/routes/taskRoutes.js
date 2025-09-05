const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middlewares/authMiddleware');

// مهام
router.get('/tasks/:userId', verifyToken, taskController.getTasks);
router.get('/tasks/:userId/subtasks/:parentId', verifyToken, taskController.getSubtasks);
router.post('/tasks', verifyToken, taskController.createTask);
router.put('/tasks/:id', verifyToken, taskController.updateTask);
router.delete('/tasks/:id', verifyToken, taskController.deleteTask);
router.patch('/tasks/:id/completed', verifyToken, taskController.markCompleted);
router.patch('/tasks/:id/date', verifyToken, taskController.updateEndDate);

module.exports = router;
