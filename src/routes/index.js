const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');


/** Dashboard Principal */
router.get('/', estaLogueado, empresaController.dashboard)

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('perfil', {dashx: true, wizarx: false, login: false})
})

module.exports = router;