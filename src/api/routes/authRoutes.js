const express = require('express');
const authController = require('../controllers/login');
const authenticateToken = require('../middleware/checkAuth');
const router = express.Router();

// Rutas de autenticación
router.post('/signup', authenticateToken, authController.signup);
router.post('/login', authController.login);
router.get('/perfil', authenticateToken, authController.getProfile);
router.put('/update', authenticateToken, authController.updatePassword);

module.exports = router;
