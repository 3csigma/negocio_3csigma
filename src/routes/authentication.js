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

// Social Login - Facebook & Google
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

// router.get('/login/google', passport.authenticate('google', {
//     scope: ['email']
// }));

// app.get('/oauth2/redirect/google', passport.authenticate('google', {
//     failureRedirect: '/login', 
//     failureMessage: true 
// }),(req, res, next) => {
//     res.redirect('/');
// });

router.get('/auth/google', noLogueado, passport.authenticate('google.auth', {
    // scope: ['email', 'profile']
    scope: [
        "https://www.googleapis.com/auth/userinfo.profile", // Ver su dirección de correo electrónico
        "https://www.googleapis.com/auth/userinfo.email" //Ver su información personal, incluida la información personal que haya puesto a disposición del público.
    ],
    // session: false
}))

router.get('/auth/google/secrets',
    passport.authenticate('google.auth', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })
)
/** Cerrar Sesión */
router.get('/logout', estaLogueado, (req, res) => {
    req.logOut();
    res.redirect('/login');
})

module.exports = router;