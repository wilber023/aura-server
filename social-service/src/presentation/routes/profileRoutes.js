const express = require('express');
const router = express.Router();

// Middlewares
const { authenticateToken } = require('../../infrastructure/middleware/authMiddleware');
const { uploadAvatar } = require('../../infrastructure/middleware/uploadMiddleware');
const { 
  validateMultipartContentType,
  validateProfileData 
} = require('../../infrastructure/middleware/profileValidationMiddleware');

// Controller
const UserProfileController = require('../controllers/UserProfileController');

// Importar caso de uso que funciona
const CreateUserProfileUseCase = require('../../application/use-cases/userProfile/CreateUserProfileUseCase');

// Instanciar controlador con dependencias mínimas
const userProfileController = new UserProfileController(
  new CreateUserProfileUseCase(), // createUserProfileUseCase 
  null, // updateProfileUseCase - no usado por ahora
  null, // updateInterestsUseCase
  null, // addFriendUseCase
  null, // removeFriendUseCase
  null, // blockUserUseCase
  null  // unblockUserUseCase
);

/**
 * POST /profiles
 * Crear perfil de usuario con avatar
 * 
 * Middleware chain:
 * 1. authenticateToken - Validar JWT y extraer user_id
 * 2. validateMultipartContentType - Verificar Content-Type
 * 3. uploadAvatar - Procesar archivo avatar con Multer/Cloudinary
 * 4. validateProfileData - Validar todos los campos del perfil
 * 5. userProfileController.createProfile - Crear perfil en BD
 */
router.post('/profiles', 
  authenticateToken,
  validateMultipartContentType,
  uploadAvatar,
  ...validateProfileData,
  userProfileController.createProfile
);

/**
 * PUT /profiles/:id
 * Actualizar perfil existente (para futuras implementaciones)
 */
router.put('/profiles/:id', 
  authenticateToken,
  userProfileController.updateProfile
);

/**
 * GET /profiles/:id
 * Obtener perfil por ID (para futuras implementaciones)
 */
router.get('/profiles/:id', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Endpoint no implementado aún'
  });
});

/**
 * DELETE /profiles/:id
 * Eliminar perfil (para futuras implementaciones)
 */
router.delete('/profiles/:id', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Endpoint no implementado aún'
  });
});

module.exports = router;