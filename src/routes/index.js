const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')
const dashboardController = require('../controllers/dashboardController');

/** Dashboard Principal */
router.get('/', estaLogueado, dashboardController.index)

router.get('/registro-de-consultores', noLogueado, dashboardController.registroConsultores)

module.exports = router;