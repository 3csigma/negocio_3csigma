const express = require('express');
const router = express.Router();
const passport = require('passport')

router.get('/registro', (req, res) => {
    res.render('auth/registro', {login: true})
})

router.post('/registro', passport.authenticate('local.registro', {
    successRedirect: '/perfil',
    failureRedirect: '/registro',
    failureFlash: true
}))

router.get('/login', (req, res) => {
    res.render('auth/login', {login: true})
})

router.post('/login', (req, res, next) => {
    passport.authenticate('local.login', {
        successRedirect: '/perfil',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next)
})

router.get('/perfil', (req, res) => {
    res.send('Este es su perfil')
})

module.exports = router;