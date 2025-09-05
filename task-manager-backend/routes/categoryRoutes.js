const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/categories', verifyToken, categoryController.getCategories);
router.post('/categories', verifyToken, categoryController.createCategory);
router.delete('/categories/:id', verifyToken, categoryController.deleteCategory);
router.get('/categories/:id/usage', verifyToken, categoryController.checkCategoryUsage);

module.exports = router;
