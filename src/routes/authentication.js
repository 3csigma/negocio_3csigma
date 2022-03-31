const express = require('express');
const router = express.Router();
const passport = require('passport')
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/registro', noLogueado, (req, res) => {
    res.render('auth/registro', { login: true, wizarx: false, dashx: false })
})

router.post('/registro', noLogueado, passport.authenticate('local.registro', {
    successRedirect: '/',
    failureRedirect: '/registro',
    failureFlash: true
}))

router.get('/login', noLogueado, (req, res) => {
    res.render('auth/login', { login: true, wizarx: false, dashx: false })
})

router.post('/login', noLogueado, (req, res, next) => {
    passport.authenticate('local.login', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true,
    })(req, res, next)
})

// Social Login
router.get('/auth/facebook', noLogueado, passport.authenticate('facebook.auth', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

// router.get('/auth/facebook/secrets', noLogueado, passport.authenticate('facebook.auth', {
//     successRedirect: '/',
//     failureRedirect: '/login',
//     failureFlash: true
// }))

router.get('/login/google', passport.authenticate('google', {
    scope: ['email']
}));

app.get('/oauth2/redirect/google', passport.authenticate('google', {
    failureRedirect: '/login', 
    failureMessage: true 
}),(req, res, next) => {
    res.redirect('/');
});

router.get('/logout', estaLogueado, (req, res) => {
    cerrado = true;
    req.logOut()
    res.redirect('/login')
})

module.exports = router;