const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const { getTemplate, sendEmail } = require('../lib/mail.config')

passport.serializeUser((user, done) => { // Almacenar usuario en una sesión de forma codificada
    done(null, user.id_usuarios);
})

passport.deserializeUser(async (id, done) => { // Deserialización
    await pool.query('SELECT * FROM users WHERE id_usuarios = ?', [id], (err, filas) => {
        done(err, filas[0])
    });
})


// Registro de Usuarios (Empresa)
passport.use('local.registro', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {

    const { nombres, apellidos, nombre_empresa, zh_empresa } = req.body
    const rol = 'Empresa'
    await pool.query('SELECT * FROM users WHERE email = ? AND rol = ?', [email, rol], async (err, result) => { // Verificando si el usuario existe o no

        if (err) throw err; // Si ocurre un error

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un usuario con este Email'))
        } else {
            // Capturando Nombre de usuario con base al email del usuario
            let username = email.split('@')
            username = username[0]

            // Generar código MD5 con base a su email
            const codigo = crypto.createHash('md5').update(email).digest("hex");

            // Fecha de Creación
            let fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_empresa })
            const arrayFecha = fecha_creacion.split("/")
            fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Empresa', codigo }

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
            const fila = await pool.query('INSERT INTO users SET ?', [newUser])
            const empresa = { nombres, apellidos, nombre_empresa, email, codigo, fecha_creacion }
            if (fila.affectedRows > 0) {
                await pool.query('INSERT INTO empresas SET ?', [empresa])
            }
            return done(null, false, req.flash('registro', 'Registro enviado, revisa tu correo en unos minutos y activa tu cuenta.'))
        }
    })
}))

// Registro de Consultores
passport.use('local.registroConsultores', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {

    const { nombres, apellidos, tel_consultor, direccion_consultor, experiencia_years, zh_consultor } = req.body
    const rol = 'Consultor'
    pool.query('SELECT * FROM users WHERE email = ? AND rol = ?', [email, rol], async (err, result) => {

        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un consultor con este Email'));
        } else {

            // Capturando Nombre de usuario con base al email del usuario
            let usuario_calendly = email.split('@')
            usuario_calendly = usuario_calendly[0]+''
            usuario_calendly = usuario_calendly.replace(".", "-");
            usuario_calendly = "https://calendly.com/"+usuario_calendly;

            // Generar código MD5 con base a su email
            let codigo = crypto.createHash('md5').update(email).digest("hex");
            clave = codigo.slice(5, 13);

            // Fecha de Creación
            let fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_consultor })
            const arrayFecha = fecha_creacion.split("/")
            fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]

            // Capturando Certificado de Consul Group
            const certificado = '../certificados_consultores/' + urlCertificado

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Consultor', codigo, estadoEmail: 1, estadoAdm: 0 };
            const nuevoConsultor = { nombres, apellidos, email, usuario_calendly, tel_consultor, direccion_consultor, experiencia_years, certificado, codigo, fecha_creacion };

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave);

            // Guardar en la base de datos
            const fila1 = await pool.query('INSERT INTO users SET ?', [newUser]);
            if (fila1.affectedRows > 0) {
                await pool.query('INSERT INTO consultores SET ?', [nuevoConsultor]);
            }

            return done(null, false, req.flash('registro', 'Registro enviado. Recibirás una confirmación en tu correo cuando tu cuenta sea aprobada por un administrador'));
        }
    })
}))

// Login de Usuarios (Empresa, Consultores, Admin)
passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {

    const usuarios = await pool.query('SELECT * FROM users WHERE email = ?', [email])

    req.session.empresa = false;
    req.session.consultor = false;
    req.session.admin = false;

    if (usuarios.length > 0) {
        const user = usuarios[0]
        const claveValida = await helpers.matchPass(clave, user.clave)

        if (claveValida) {

            if (user.rol == 'Empresa') { // Usuario Empresa
                if (user.estadoEmail == 1 && user.estadoAdm == 1) {
                    req.session.empresa = true;
                    return done(null, user, req.flash('success', 'Bienvenido Usuario Empresa'))
                } else if (user.estadoAdm == 0) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada o no ha sido activada. Contacta a un administrador.'))
                } else {
                    return done(null, false, req.flash('message', 'Aún no has verificado la cuenta desde tu email.'))
                }
            } else if (user.rol == 'Consultor') { // Usuario Consultor
                if (user.estadoEmail == 1) {
                    req.session.consultor = true;
                    req.session.empresa = false;
                    req.session.admin = false;
                    return done(null, user, req.flash('success', 'Bienvenido Consultor'))
                } else if (user.estadoAdm == 0) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada. Contacta a un administrador.'))
                } else {
                    return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
                }
            } else if (user.rol == 'Admin') { // Administrador
                req.session.consultor = false;
                req.session.empresa = false;
                req.session.admin = true;
                return done(null, user, req.flash('success', 'Bienvenido Admin'))
            }

        } else {
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }

    } else {
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }

}))