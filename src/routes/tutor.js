const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const tutorController = require('../controllers/tutorController');
const { checkLogin } = require('../lib/auth')

router.get('/estudiantes-asignados', checkLogin, tutorController.estudiantesAsignados)
router.get('/empresas-relacionadas', checkLogin, tutorController.empresasAsignadas)



module.exports = router