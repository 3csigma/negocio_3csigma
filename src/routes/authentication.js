const express = require('express');
const router = express.Router();
const passport = require('passport')
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/registro', noLogueado, (req, res) => {
    res.render('auth/registro', {login: true, wizarx: false, dashx: false})
})

router.post('/registro', noLogueado, passport.authenticate('local.registro', {
    successRedirect: '/',
    failureRedirect: '/registro',
    failureFlash: true
}))

router.get('/login', noLogueado, (req, res) => {
    res.render('auth/login', {login: true, wizarx: false, dashx: true})
})

router.post('/login', noLogueado, (req, res, next) => {
    passport.authenticate('local.login', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next)
})

router.get('/logout', estaLogueado, (req, res) => {
    req.logOut()
    res.redirect('/login')
})

module.exports = router;