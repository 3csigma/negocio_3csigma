const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const { getTemplate, sendEmail, nuevaEmpresa, nuevoConsultorRegistrado } = require('../lib/mail.config')
const { consultarDatos } = require('../lib/helpers')
// const emailAdmin = 'dalo.beta@gmail.com'
const emailAdmin = '3csigmagroup@gmail.com'

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
    // Verificando si el usuario existe o no
    await pool.query('SELECT * FROM users WHERE email = ? AND rol = ?', [email, rol], async (err, result) => {

        // Si ocurre un error
        if (err) throw err;

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
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Empresa', codigo }

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave)

            // Obtener la plantilla de Email
            const template = getTemplate(nombres, nombre_empresa, codigo);
            const templateNuevaEmpresa = nuevaEmpresa('Carlos', nombre_empresa)

            // Enviar Email
            const resultEmail = await sendEmail(email, 'Confirma tu registro en 3C Sigma', template)
            const resultEmail2 = await sendEmail(emailAdmin, '¡Se ha registrado una nueva empresa!', templateNuevaEmpresa)

            if (resultEmail == false || resultEmail2 == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            }

            // Guardar en la base de datos
            const fila = await pool.query('INSERT INTO users SET ?', [newUser])
            const empresa = { nombres, apellidos, nombre_empresa, email, codigo, fecha_creacion, mes, year }
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

    const { nombres, apellidos, countryCode, telConsul, direccion_consultor, experiencia_years, zh_consultor } = req.body
    const rol = 'Consultor'
    pool.query('SELECT * FROM users WHERE email = ? AND rol = ?', [email, rol], async (err, result) => {

        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un consultor con este Email'));
        } else {

            // Generar código MD5 con base a su email
            let codigo = crypto.createHash('md5').update(email).digest("hex");
            clave = codigo.slice(5, 13);

            // Fecha de Creación
            let fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_consultor })
            const arrayFecha = fecha_creacion.split("/")
            fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Capturando Certificado de Consul Group
            const certificado = '../certificados_consultores/' + urlCertificado

            // Objeto de Usuario
            const tel_consultor = "+" + countryCode + " " + telConsul
            const newUser = { nombres, apellidos, email, clave, rol: 'Consultor', codigo, estadoEmail: 1, estadoAdm: 0 };
            const nuevoConsultor = { nombres, apellidos, email, tel_consultor, direccion_consultor, experiencia_years, certificado, codigo, fecha_creacion, mes, year };

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave);

            // Enviando email al admin del registro
            const nombreCompleto = nombres + ' ' + apellidos
            const templateConsul = nuevoConsultorRegistrado('Carlos', nombreCompleto)
            const resultEmail = await sendEmail(emailAdmin, '¡Se ha registrado una nuevo consultor!', templateConsul)

            if (resultEmail == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            } else {
                // Guardar en la base de datos
                const fila1 = await pool.query('INSERT INTO users SET ?', [newUser]);
                if (fila1.affectedRows > 0) {
                    await pool.query('INSERT INTO consultores SET ?', [nuevoConsultor]);
                }

                return done(null, false, req.flash('registro', 'Registro enviado. Recibirás una confirmación en tu correo cuando tu cuenta sea aprobada por un administrador'));
            }

        }
    })
}))

// Login de Usuarios (Empresa, Consultores, Admin)
passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {

    let usuario = await consultarDatos('users')
    usuario = usuario.find(x => x.email == email)

    if (usuario) {
        const claveValida = await helpers.matchPass(clave, usuario.clave)

        if (claveValida) {

            if (usuario.rol == 'Empresa') { // Usuario Empresa
                console.log("\n**************");
                console.log("EMPRESA LOGUEADO >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    req.session.empresa = true;
                    return done(null, usuario, req.flash('success', 'Bienvenido Usuario Empresa'))
                } else if (usuario.estadoAdm == 0) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada o no ha sido activada. Contacta a un administrador.'))
                } else {
                    return done(null, false, req.flash('message', 'Aún no has verificado la cuenta desde tu email.'))
                }
            } else if (usuario.rol == 'Consultor') { // Usuario Consultor
                console.log("\n**************");
                console.log("Consultor LOGUEADO >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    req.session.consultor = true;
                    return done(null, usuario, req.flash('success', 'Bienvenido Consultor'))
                } else if (usuario.estadoAdm == 2) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada. Contacta a un administrador.'))
                } else if (usuario.estadoAdm == 3) {
                    return done(null, false, req.flash('message', 'Tu cuenta fue rechazada.'))
                } else {
                    return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
                }
            } else if (usuario.rol == 'Admin') { // Administrador
                console.log("\n**************");
                console.log("Admin LOGUEADO >>> ");
                console.log("**************");
                if (req.session.initialised) {
                    req.session.admin = true;
                }
                console.group("\nDESDE PASSPORT");
                console.log(req.session);
                console.groupEnd();
                return done(null, usuario, req.flash('success', 'Bienvenido Admin'))
            }

        } else {
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }

    } else {
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }

}))