const express = require('express');
const router = express.Router();
const passport = require('passport')
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/registro', noLogueado, (req, res) => {
    res.render('auth/registro', {login: true, wizarx: false, dashx: false})
})

router.post('/registro', noLogueado, passport.authenticate('local.registro', {
    successRedirect: '/negocio',
    failureRedirect: '/registro',
    failureFlash: true
}))

router.get('/login', noLogueado, (req, res) => {
    res.render('auth/login', {login: true, wizarx: false, dashx: false})
})

router.post('/login', noLogueado, (req, res, next) => {
    passport.authenticate('local.login', {
        successRedirect: '/negocio',
        failureRedirect: '/negocio/login',
        failureFlash: true
    })(req, res, next)
})

router.get('/perfil', estaLogueado, (req, res) => {
    res.send('Este es su perfil')
})

router.get('/logout', estaLogueado, (req, res) => {
    req.logOut()
    res.redirect('/negocio/login')
})

module.exports = router;