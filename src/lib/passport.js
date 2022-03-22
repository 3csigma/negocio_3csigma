const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const pool = require('../database')
const helpers = require('../lib/helpers')

passport.use('local.registro', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => { //Callback luego de la configuración para indicar que más hacer
    const { nombre_empresa } = req.body
    let username = email.split('@')
    username = username[0]
    const newUser = {
        nombre_empresa,
        username,
        email,
        clave,
        rol: 'User'
    }
    newUser.clave = await helpers.encryptPass(clave)
    const result = await pool.query('INSERT INTO users SET ?', [newUser])
    newUser.id = result.insertId
    // console.log(result)
    return done(null, newUser)
}))

passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => { //Callback luego de la configuración para indicar que más hacer
    console.log(req.body)
    console.log(email)
    console.log(clave)
}))

passport.serializeUser((user, done) => { // Almacenar usuario en una sesión de forma codificada
    done(null, user.id);
})

passport.deserializeUser(async (id, done) => { // Deserialización
    const filas = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, filas[0])
})