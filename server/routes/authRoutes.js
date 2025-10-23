
const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();
const {
    signup,
    login,
    getProfile,
    updateProfile
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;
