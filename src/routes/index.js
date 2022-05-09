const express = require('express');
const router = express.Router();
const { checkLogin, noLogueado, adminLogueado } = require('../lib/auth')
const dashboardController = require('../controllers/dashboardController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

// Dashboard Principal
router.get('/', checkLogin, dashboardController.index)

router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.addConsultores)

router.get('/consultores', checkLogin, adminLogueado, dashboardController.mostrarConsultores)
router.get('/consultores/:codigo', checkLogin, adminLogueado, dashboardController.editarConsultor)
router.get('/empresas', checkLogin, adminLogueado, dashboardController.mostrarEmpresas)

module.exports = router;