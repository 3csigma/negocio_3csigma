const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const {getTemplate, sendEmail} = require('../lib/mail.config')
let userEmpresa = false, userConsultor = false;

passport.serializeUser((user, done) => { // Almacenar usuario en una sesión de forma codificada
    done(null, user.id);
})

passport.deserializeUser(async (id, done) => { // Deserialización
    if (userEmpresa){
        const empresa = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        done(null, empresa[0])
    } else {
        const consultor = await pool.query('SELECT * FROM consultores WHERE id = ?', [id]);
        done(null, consultor[0])
    }
})


// Registro de Usuarios (Empresa)
passport.use('local.registro', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {
    
    const { nombres, apellidos, nombre_empresa, zh_empresa } = req.body
    
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

            // Fecha de Creación
            let fecha_creacion = new Date().toLocaleDateString("en-US", {timeZone: zh_empresa})
            const arrayFecha = fecha_creacion.split("/")
            fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]
            
            // Objeto de Usuario
            const newUser = { nombres, apellidos, nombre_empresa, username, email, clave, codigo, fecha_creacion }
            
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

// Registro de Consultores
passport.use('local.registroConsultores', new LocalStrategy({
    usernameField: 'email_consultor',
    passwordField: 'clave_consultor',
    passReqToCallback: true
}, async (req, email_consultor, clave_consultor, done) => {
    
    const { nombres_consultor, apellidos_consultor, tel_consultor, direccion_consultor, experiencia_years, zh_consultor } = req.body
    
    pool.query('SELECT * FROM consultores WHERE email_consultor = ?', [email_consultor], async (err, result) => {

        if (err)
            throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un consultor con este Email'));
        } else {

            // Generar código MD5
            let codigo = crypto.createHash('md5').update(email_consultor).digest("hex");
            clave_consultor = codigo.slice(5, 13);

            // Fecha de Creación
            let fecha_creacion = new Date().toLocaleDateString("en-US", {timeZone: zh_consultor})
            const arrayFecha = fecha_creacion.split("/")
            fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]

            // Objeto de Usuario
            const nuevoConsultor = { nombres_consultor, apellidos_consultor, email_consultor, clave_consultor, tel_consultor, direccion_consultor, experiencia_years, fecha_creacion, codigo };

            // Encriptando la clave
            nuevoConsultor.clave_consultor = await helpers.encryptPass(clave_consultor);

            // Guardar en la base de datos
            const resultado = await pool.query('INSERT INTO consultores SET ?', [nuevoConsultor]);
            nuevoConsultor.id = resultado.insertId;
            return done(null, false, req.flash('registro', 'Registro enviado. Recibirás una confirmación en tu correo cuando tu cuenta sea aprobada por un administrador'));
        }
    })
}))

passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {
    
    const usuarios = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    const consultores = await pool.query('SELECT * FROM consultores WHERE email_consultor = ?', [email])

    userEmpresa = req.session.empresa = false;
    req.session.consultor = false;
    req.session.admin = false;

    if (usuarios.length > 0) {

        const user = usuarios[0]
        const claveValida = await helpers.matchPass(clave, user.clave)

        if (claveValida){
            req.userEmail = true;
            if (user.estado == 1) {
                userEmpresa = req.session.empresa = true;
                req.session.consultor = false;
                req.session.admin = false;
                return done(null, user, req.flash('success', 'Bienvenido Usuario Empresa'))
            } else {
                return done(null, false, req.flash('message', 'Aún no has verificado la cuenta desde tu email.'))
            }
        } else {
            req.userEmail = false;
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }

    } else if (consultores.length > 0) {
        userEmpresa = false;
        const consultor = consultores[0]
        const claveValida = await helpers.matchPass(clave, consultor.clave_consultor)
        if (claveValida){
            if (consultor.estado == 1) {
                req.session.empresa = false;
                req.session.consultor = false;
                req.session.admin = true;
                return done(null, consultor, req.flash('success', 'Bienvenido Consultor'))
            } else {
                return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
            }
        } else {
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }
        
    } else {
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }
}))