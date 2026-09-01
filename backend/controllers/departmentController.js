const { Department, Company, Category } = require('../models');
const { Op } = require("sequelize");

// @desc    Get all departments for a specific company
// @route   GET /api/departments?companyId=1
// @access  Private
exports.getDepartmentsByCompany = async (req, res) => {
  const { companyId, page = 1, limit = 100, search = "" } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "Company ID is required" });
  }

  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await Department.findAndCountAll({
      where: {
        companyId,
        ...(search && {
          [Op.or]: [
            {
              departmentname: {
                [Op.like]: `%${search}%`,
              },
            },
            {
              acronym: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        }),
      },

      include: [
        {
          model: Category,
          as: "category", // ⚠️ must match your association alias
          attributes: ["id", "categoryName"],
        },
      ],

      limit: Number(limit),
      offset: Number(offset),
      order: [["slno", "ASC"]],

      attributes: [
        "id",
        "slno",
        "departmentname",
        "acronym",
        "isTrain",
        "strengthRequired",
        "categoryId",
        "companyId",
      ],
    });

    res.status(200).json({
      data: rows,
      total: count,
      currentPage: Number(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// @desc    Create a new department
// @route   POST /api/departments
// @access  Private
exports.createDepartment = async (req, res) => {
    const { slno, departmentname, acronym, isTrain, strengthRequired, companyId, categoryId } = req.body;

    if (!slno || !departmentname || !acronym || !companyId || !categoryId) {
        return res.status(400).json({
            message: 'Missing required fields: slno, departmentname, acronym, companyId, categoryId',
        });
    }

    try {
        const newDepartment = await Department.create({
            slno,
            departmentname,
            acronym,
            isTrain: isTrain ?? false,
            strengthRequired: strengthRequired ?? 0,
            companyId,
            categoryId,
        });
        res.status(201).json(newDepartment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private
exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { slno, departmentname, acronym, isTrain, strengthRequired, companyId, categoryId } = req.body;

    try {
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        await department.update({
            slno,
            departmentname,
            acronym,
            isTrain,
            strengthRequired,
            companyId,
            categoryId,
        });

        res.status(200).json(department);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private
exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;

    try {
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        await department.destroy();
        res.status(200).json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get count of departments
// @route   GET /api/departments/count/active
// @access  Private
exports.getDepartmentCount = async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const count = await Department.count({
      where: { companyId }
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching department count:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};