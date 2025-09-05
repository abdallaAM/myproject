const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

router.get('/admin/users', verifyAdmin, adminController.getAllUsers);
router.delete('/admin/users/:id', verifyAdmin, adminController.deleteUser);
router.put('/admin/users/:id', verifyAdmin, adminController.updateUser);
router.patch('/admin/users/:id/promote', verifyAdmin, adminController.promoteUser);
router.patch('/admin/users/:id/toggle-active', verifyAdmin, adminController.toggleActive);
router.patch('/admin/users/:id/demote', verifyAdmin, adminController.demoteUser);

module.exports = router;
