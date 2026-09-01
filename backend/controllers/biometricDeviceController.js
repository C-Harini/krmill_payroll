const { BiometricDevice, Company } = require('../models');

// @desc    Get all biometric devices for a specific company
// @route   GET /api/biometric-devices?companyId=1
// @access  Private
exports.getBiometricDevicesByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const devices = await BiometricDevice.findAll({
            where: { companyId },
            order: [['name', 'ASC']],
        });
        res.status(200).json(devices);
    } catch (error) {
        console.error('Error fetching biometric devices:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single biometric device by ID
// @route   GET /api/biometric-devices/:id
// @access  Private
exports.getBiometricDeviceById = async (req, res) => {
    const { id } = req.params;
    try {
        const device = await BiometricDevice.findByPk(id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name'],
                    required: false,
                }
            ],
        });
        
        if (!device) return res.status(404).json({ message: 'Biometric Device not found' });
        
        res.status(200).json(device);
    } catch (error) {
        console.error('Error fetching biometric device:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new biometric device
// @route   POST /api/biometric-devices
// @access  Private
exports.createBiometricDevice = async (req, res) => {
    try {
        const newDevice = await BiometricDevice.create(req.body);
        res.status(201).json(newDevice);
    } catch (error) {
        console.error('Error creating biometric device:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A biometric device with this name already exists for this company.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update a biometric device
// @route   PUT /api/biometric-devices/:id
// @access  Private
exports.updateBiometricDevice = async (req, res) => {
    const { id } = req.params;
    try {
        const device = await BiometricDevice.findByPk(id);
        if (!device) return res.status(404).json({ message: 'Biometric Device not found' });

        await device.update(req.body);
        res.status(200).json(device);
    } catch (error) {
        console.error('Error updating biometric device:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete a biometric device
// @route   DELETE /api/biometric-devices/:id
// @access  Private
exports.deleteBiometricDevice = async (req, res) => {
    const { id } = req.params;
    try {
        const device = await BiometricDevice.findByPk(id);
        if (!device) return res.status(404).json({ message: 'Biometric Device not found' });

        // TODO: Add a check here to prevent deletion if the device is linked to attendance records
        await device.destroy();
        res.status(200).json({ message: 'Biometric Device deleted successfully' });
    } catch (error) {
        console.error('Error deleting biometric device:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle biometric device status (Active/Inactive)
// @route   PATCH /api/biometric-devices/:id/toggle-status
// @access  Private
exports.toggleBiometricDeviceStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const device = await BiometricDevice.findByPk(id);
        if (!device) return res.status(404).json({ message: 'Biometric Device not found' });

        const newStatus = device.status === 'Active' ? 'Inactive' : 'Active';
        await device.update({ status: newStatus });
        
        res.status(200).json({ 
            message: `Biometric Device status changed to ${newStatus}`,
            device: device 
        });
    } catch (error) {
        console.error('Error toggling biometric device status:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

