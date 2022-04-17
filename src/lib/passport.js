const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy  // Autenticación por Facebook
// const GoogleStrategy = require('passport-google-oauth20').Strategy      // Autenticación por Google
const pool = require('../database')
const helpers = require('../lib/helpers')
const {config} = require('../keys') // Importar Api Keys Secret

passport.serializeUser((user, done) => { // Almacenar usuario en una sesión de forma codificada
    done(null, user.id);
})

passport.deserializeUser(async (id, done) => { // Deserialización
    const filas = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, filas[0])
})

passport.use('local.registro', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => { //Callback luego de la configuración
    const { nombre_empresa } = req.body
    let username = email.split('@')
    username = username[0]
    const newUser = {
        nombre_empresa,
        username,
        email,
        clave,
        rol: 'User',
    }
    newUser.clave = await helpers.encryptPass(clave)
    const result = await pool.query('INSERT INTO users SET ?', [newUser])
    newUser.id = result.insertId
    return done(null, newUser, req.flash('success', 'Bienvenido a la plataforma de consultoría 3C Sigma'))
}))

passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => { //Callback luego de la configuración para indicar que más hacer
    // console.log(req.body)
    const filas = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    if (filas.length > 0) {
        const user = filas[0]
        const claveValida = await helpers.matchPass(clave, user.clave)
        if (claveValida){
            return done(null, user, req.flash('success', 'Bienvenido a la plataforma'))
        } else {
            req.AuthTokenApi = false;
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }
    } else {
        req.AuthTokenApi = false;
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }
}))

passport.use('facebook.auth', new FacebookStrategy({
    clientID: config.facebook.id,
    clientSecret: config.facebook.secret,
    // callbackURL: '/auth/facebook/secrets'
  },
  (accessToken, refreshToken, profile, done) => {
      console.log(profile)
    // const filas = await pool.query('SELECT * FROM users WHERE email = ?', [email])
  }
  
));