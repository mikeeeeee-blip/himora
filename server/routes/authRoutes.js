
const express = require('express');
const auth = require('../middleware/auth');
const superAdminAuth = require('../middleware/superAdminAuth');

const router = express.Router();
const {
    signup,
    login,
    getProfile,
    updateProfile,
    deleteUser,
    changeUserPassword
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// SuperAdmin only routes
router.delete('/users/:userId', superAdminAuth, deleteUser);
router.put('/users/:userId/password', superAdminAuth, changeUserPassword);

module.exports = router;
