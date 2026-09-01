const { Category, Company } = require('../models');

// @desc    Get all categories for a specific company
// @route   GET /api/categories?companyId=1
// @access  Private
exports.getCategoriesByCompany = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const categories = await Category.findAll({
            where: { companyId },
            include: [
                {
                    model: Company,
                    as: 'Company',
                    attributes: ['id', 'name'],
                },
            ],
            order: [['categoryName', 'ASC']],
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
    const { categoryName, categoryCode, description, status, companyId } = req.body;

    if (!categoryName || !categoryCode || !companyId) {
        return res.status(400).json({
            message: 'Missing required fields: categoryName, categoryCode, companyId',
        });
    }

    try {
        const newCategory = await Category.create({
            categoryName,
            categoryCode,
            description,
            status: status || 'Active',
            companyId,
        });

        const created = await Category.findByPk(newCategory.id, {
            include: [
                { model: Company, as: 'Company', attributes: ['id', 'name'] },
            ],
        });

        res.status(201).json(created);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { categoryName, categoryCode, description, status, companyId } = req.body;

    try {
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.update({ categoryName, categoryCode, description, status, companyId });

        const updated = await Category.findByPk(id, {
            include: [
                { model: Company, as: 'Company', attributes: ['id', 'name'] },
            ],
        });

        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.destroy();
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
