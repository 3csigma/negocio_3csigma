const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const dashboardController = require('../controllers/dashboardController');

/** Dashboard Principal */
router.get('/', estaLogueado, dashboardController.index)

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('profile', {user_dash: true, wizarx: false, login: false})
})

module.exports = router;