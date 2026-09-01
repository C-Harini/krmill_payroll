const { Bus, Company } = require('../models');

// @desc    Get all buses for a specific company
// @route   GET /api/buses?companyId=1
// @access  Private
exports.getBusesByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const buses = await Bus.findAll({
            where: { companyId },
            order: [['name', 'ASC']],
        });
        res.status(200).json(buses);
    } catch (error) {
        console.error('Error fetching buses:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single bus by ID
// @route   GET /api/buses/:id
// @access  Private
exports.getBusById = async (req, res) => {
    const { id } = req.params;
    try {
        const bus = await Bus.findByPk(id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name'],
                    required: false,
                }
            ],
        });
        
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        
        res.status(200).json(bus);
    } catch (error) {
        console.error('Error fetching bus:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new bus
// @route   POST /api/buses
// @access  Private
exports.createBus = async (req, res) => {
    try {
        const newBus = await Bus.create(req.body);
        res.status(201).json(newBus);
    } catch (error) {
        console.error('Error creating bus:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A bus with this name already exists for this company.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update a bus
// @route   PUT /api/buses/:id
// @access  Private
exports.updateBus = async (req, res) => {
    const { id } = req.params;
    try {
        const bus = await Bus.findByPk(id);
        if (!bus) return res.status(404).json({ message: 'Bus not found' });

        await bus.update(req.body);
        res.status(200).json(bus);
    } catch (error) {
        console.error('Error updating bus:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete a bus
// @route   DELETE /api/buses/:id
// @access  Private
exports.deleteBus = async (req, res) => {
    const { id } = req.params;
    try {
        const bus = await Bus.findByPk(id);
        if (!bus) return res.status(404).json({ message: 'Bus not found' });

        // TODO: Add a check here to prevent deletion if the bus is linked to routes or schedules
        await bus.destroy();
        res.status(200).json({ message: 'Bus deleted successfully' });
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle bus status (Active/Inactive)
// @route   PATCH /api/buses/:id/toggle-status
// @access  Private
exports.toggleBusStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const bus = await Bus.findByPk(id);
        if (!bus) return res.status(404).json({ message: 'Bus not found' });

        const newStatus = bus.status === 'Active' ? 'Inactive' : 'Active';
        await bus.update({ status: newStatus });
        
        res.status(200).json({ 
            message: `Bus status changed to ${newStatus}`,
            bus: bus 
        });
    } catch (error) {
        console.error('Error toggling bus status:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};