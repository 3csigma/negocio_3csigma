const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const {getTemplate, sendEmail} = require('../lib/mail.config')
// const {config} = require('../keys') // Importar Api Keys Secret Google & Facebook
// const FacebookStrategy = require('passport-facebook').Strategy  // Autenticación por Facebook
// const { Strategy } = require('passport-google-oauth20');
// const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;      
// const GoogleStrategy = require('passport-google-oidc');

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
    
    const { nombres, apellidos, nombre_empresa } = req.body
    
    await pool.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => { // Verificando si el usuario existe o no
        
        if (err) throw err; // Si ocurre un error
        
        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un usuario con este Email'))
        } else {
            // Capturando Nombre de usuario con base al email del usuario
            let username = email.split('@')
            username = username[0]

            // Generar código MD5
            const codigo = crypto.createHash('md5').update(email).digest("hex");
            
            // Objeto de Usuario
            const newUser = {nombres, apellidos, nombre_empresa, username, email, clave, rol: 'User', codigo}
            
            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave)
            
            // Obtener la plantilla de Email
            const template = getTemplate(nombres, nombre_empresa, codigo);
            
            // Enviar Email
            const resultEmail = await sendEmail(email, 'Confirma tu registro en 3C Sigma', template)

            if (resultEmail == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            }

            // Guardar en la base de datos
            const resultado = await pool.query('INSERT INTO users SET ?', [newUser])
            newUser.id = resultado.insertId
            return done(null, false, req.flash('registro', 'Registro enviado, revisa tu correo en unos minutos y activa tu cuenta.'))
        }
    })
}))

passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => { //Callback para indicar más procesos
    
    const filas = await pool.query('SELECT * FROM users WHERE email = ?', [email])

    if (filas.length > 0) {

        const user = filas[0]
        const claveValida = await helpers.matchPass(clave, user.clave)

        if (claveValida){
            req.userEmail = true;
            if (user.estado == 1) {
                return done(null, user, req.flash('success', 'Bienvenido a la plataforma'))
            } else {
                return done(null, false, req.flash('message', 'Aún no has verificado la cuenta desde tu email.'))
            }
        } else {
            req.userEmail = false;
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }
    } else {
        req.userEmail = false;
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }
}))

// passport.use('facebook.auth', new FacebookStrategy({
//     clientID: config.facebook.id,
//     clientSecret: config.facebook.secret,
//     // callbackURL: '/auth/facebook/secrets'
//   },
//   (accessToken, refreshToken, profile, done) => {
//       console.log(profile)
//     // const filas = await pool.query('SELECT * FROM users WHERE email = ?', [email])
//   }
  
// ));

// passport.use('google.auth', new GoogleStrategy({
//     clientID: config.google.id,
//     clientSecret: config.google.secret,
//     callbackURL: '/auth/google/secrets'
//   },
//   async (accessToken, refreshToken, profile, done) => {
//         console.log(profile)
//         const newUser = {
//             nombre_empresa: 'xxxxx',
//             nombres: profile.name.givenName,
//             apellidos: profile.name.familyName,
//             imagen: profile.photos[0].value,
//             email: profile.emails[0].value,
//             id_google: profile.id
//         }

//         console.log("\n<<<DATOS A INSERTAR>>> ", newUser)

//         try {
//             const oldUser = await pool.query('SELECT * FROM users WHERE id_google = ?', [newUser.id_google])
//             if (oldUser) {
//                 return done(null, oldUser)
//             } else {
//                 const user = await pool.query('INSERT INTO users SET ?', [newUser])
//                 return done(null, user)
//             }
//         } catch (error) {
//             console.log(error)
//         }
//   }
  
// ));

// passport.use('google.auth', new Strategy({
//     clientID: config.google.id,
//     clientSecret: config.google.secret,
//     callbackURL: '/auth/google/secrets'
// },
//     async (accessToken, refreshToken, profile, done) => {
//         // console.log(profile);
//         const newUser = {
//             id: 5,
//             nombre_empresa: 'xxxxx',
//             nombres: profile.givenName,
//             apellidos: profile.familyName,
//             imagen: profile.photos[0].value,
//             email: profile.emails[0].value,
//             id_google: profile.id
//         }
//         await pool.query('SELECT * FROM users WHERE id_google = ?', [newUser.id_google], async (err, result) => {
//             if (err) { return done(err); }
//             if (!result) {
//                 pool.query('INSERT INTO users SET ?', [newUser], (err, result) => {
//                     if (err) { return done(err); }
//                     console.log("RESULTADO >>>", result);
//                     return done(null, newUser);
//                 })
//             } else {
//                 pool.query('SELECT * FROM users WHERE id = ?', [newUser.id], (err, result) => {
//                     if (err) { return done(err); }
//                     if (!result) {return done(null, false);}
//                     return done(null, newUser);
//                 })
//             }
//         })
//     }
// ));

// passport.serializeUser((user, done) => {
//     done(null, user);
//   });
  
//   passport.deserializeUser((obj, done) => {
//     done(null, obj);
//   });