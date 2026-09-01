const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Define routes and map to controller methods
router.route('/')
    .get(categoryController.getCategoriesByCompany)
    .post(categoryController.createCategory);

router.route('/:id')
    .put(categoryController.updateCategory)
    .delete(categoryController.deleteCategory);

module.exports = router;