// controllers/subSuperAdminController.js

const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ============ CREATE SUB-SUPERADMIN ============
exports.createSubSuperAdmin = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            accessControls
        } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'name, email, and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Default access controls (all permissions enabled by default)
        const defaultAccessControls = {
            canViewDashboard: true,
            canViewTransactions: true,
            canManageTransactions: true,
            canSettleTransactions: true,
            canViewPayouts: true,
            canApprovePayouts: true,
            canRejectPayouts: true,
            canProcessPayouts: true,
            canViewMerchants: true,
            canManageMerchants: true,
            canDeleteMerchants: false,
            canBlockMerchantFunds: true,
            canChangeMerchantPassword: true,
            canViewAdmins: true,
            canCreateAdmins: true,
            canEditAdmins: true,
            canDeleteAdmins: true,
            canViewSettings: true,
            canManageSettings: false,
            canManageSubSuperAdmins: false,
            ...accessControls // Override with provided access controls
        };

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create sub-superadmin user
        const subSuperAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'subSuperAdmin',
            businessName: name,
            accessControls: defaultAccessControls,
            createdBy: req.user.id, // Track which superAdmin created this user
            status: 'active'
        });

        await subSuperAdmin.save();

        console.log(`✅ Sub-SuperAdmin created by ${req.user.name}: ${email}`);

        // Return user without password
        const userResponse = subSuperAdmin.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            user: userResponse,
            message: 'Sub-SuperAdmin created successfully'
        });

    } catch (error) {
        console.error('Create Sub-SuperAdmin Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ============ GET ALL SUB-SUPERADMINS ============
exports.getAllSubSuperAdmins = async (req, res) => {
    try {
        const subSuperAdmins = await User.find({ role: 'subSuperAdmin' })
            .select('-password')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            subSuperAdmins,
            count: subSuperAdmins.length
        });

    } catch (error) {
        console.error('Get Sub-SuperAdmins Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ============ GET SUB-SUPERADMIN BY ID ============
exports.getSubSuperAdminById = async (req, res) => {
    try {
        const { subSuperAdminId } = req.params;

        const subSuperAdmin = await User.findOne({
            _id: subSuperAdminId,
            role: 'subSuperAdmin'
        })
            .select('-password')
            .populate('createdBy', 'name email');

        if (!subSuperAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Sub-SuperAdmin not found'
            });
        }

        res.json({
            success: true,
            subSuperAdmin
        });

    } catch (error) {
        console.error('Get Sub-SuperAdmin Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ============ UPDATE SUB-SUPERADMIN ============
exports.updateSubSuperAdmin = async (req, res) => {
    try {
        const { subSuperAdminId } = req.params;
        const { name, email, accessControls, status } = req.body;

        const subSuperAdmin = await User.findOne({
            _id: subSuperAdminId,
            role: 'subSuperAdmin'
        });

        if (!subSuperAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Sub-SuperAdmin not found'
            });
        }

        // Update fields
        if (name) subSuperAdmin.name = name;
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: subSuperAdminId } 
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
            subSuperAdmin.email = email;
        }
        if (accessControls) {
            subSuperAdmin.accessControls = {
                ...subSuperAdmin.accessControls,
                ...accessControls
            };
        }
        if (status) {
            if (!['active', 'inactive', 'suspended'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                });
            }
            subSuperAdmin.status = status;
        }

        await subSuperAdmin.save();

        console.log(`✅ Sub-SuperAdmin updated by ${req.user.name}: ${subSuperAdmin.email}`);

        const userResponse = subSuperAdmin.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            user: userResponse,
            message: 'Sub-SuperAdmin updated successfully'
        });

    } catch (error) {
        console.error('Update Sub-SuperAdmin Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ============ DELETE SUB-SUPERADMIN ============
exports.deleteSubSuperAdmin = async (req, res) => {
    try {
        const { subSuperAdminId } = req.params;

        const subSuperAdmin = await User.findOne({
            _id: subSuperAdminId,
            role: 'subSuperAdmin'
        });

        if (!subSuperAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Sub-SuperAdmin not found'
            });
        }

        // Prevent deleting yourself
        if (subSuperAdmin._id.toString() === req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        await User.findByIdAndDelete(subSuperAdminId);

        console.log(`✅ Sub-SuperAdmin deleted by ${req.user.name}: ${subSuperAdmin.email}`);

        res.json({
            success: true,
            message: 'Sub-SuperAdmin deleted successfully'
        });

    } catch (error) {
        console.error('Delete Sub-SuperAdmin Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// ============ CHANGE SUB-SUPERADMIN PASSWORD ============
exports.changeSubSuperAdminPassword = async (req, res) => {
    try {
        const { subSuperAdminId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        const subSuperAdmin = await User.findOne({
            _id: subSuperAdminId,
            role: 'subSuperAdmin'
        });

        if (!subSuperAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Sub-SuperAdmin not found'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        subSuperAdmin.password = await bcrypt.hash(newPassword, salt);

        await subSuperAdmin.save();

        console.log(`✅ Sub-SuperAdmin password changed by ${req.user.name}: ${subSuperAdmin.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change Sub-SuperAdmin Password Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

