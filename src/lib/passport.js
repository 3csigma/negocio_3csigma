const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const { confirmarRegistro, sendEmail, nuevaEmpresa, nuevoConsultorRegistrado } = require('../lib/mail.config')
const { consultarDatos, insertarDatos } = require('../lib/helpers')

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

    const { nombres, apellidos, nombre_empresa, zh_empresa, codeEstudiante } = req.body
    // Verificando si el usuario existe o no
    await pool.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) =>{

        // Si ocurre un error
        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un usuario con este Email'))
        } else {
            // Capturando Nombre de usuario con base al email del usuario
            let username = email.split('@')
            username = username[0]

            let tableUsers = await consultarDatos('users')
            const admin  = tableUsers.find(x => x.rol == 'Admin')
            const lastUser = tableUsers[tableUsers.length-1];
            const hashCode = email+(parseInt(lastUser.id_usuarios+1));
            console.log("ultimo usuario ID >> ", lastUser);

            // Generar código MD5 con base a su email
            const codigo = crypto.createHash('md5').update(hashCode).digest("hex");

            // Fecha de Creación
            const fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_empresa })
            const arrayFecha = fecha_creacion.split("/")
            // fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Empresa', codigo }

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave)

            // Obtener la plantilla de Email
            const template = confirmarRegistro(nombres, nombre_empresa, codigo);
            const templateNuevaEmpresa = nuevaEmpresa('Carlos', nombre_empresa)

            console.log("\nEnviando email al admin de nueva empresa registrada..\n")

            // Enviar Email
            const resultEmail = await sendEmail(email, 'Confirma tu registro en PAOM System', template)
            const resultEmail2 = await sendEmail(admin.email, '¡Se ha registrado una nueva empresa!', templateNuevaEmpresa)

            if (resultEmail == false || resultEmail2 == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            }

            // Guardar en la base de datos
            // const fila = await pool.query('INSERT INTO users SET ?', [newUser])
            const fila = await insertarDatos('users', newUser)
            let consultor, etapa, orden
            if (codeEstudiante) {
                let student = await pool.query('SELECT * FROM  consultores WHERE codigo = ?', [codeEstudiante])
                student = student[0]
                
                consultor = student.id_consultores
                etapa = "Diagnóstico"
                orden = 1
            }
            
            const datosEmpresa = { nombres, apellidos, nombre_empresa, email, codigo, codeEstudiante, fecha_creacion, mes, year }
          
            if (fila.affectedRows > 0) {
                // await pool.query('INSERT INTO empresas SET ?', [empresa])
                await insertarDatos('empresas', datosEmpresa)
                let resEmpresa = await pool.query('SELECT * FROM  empresas WHERE codigo = ?', [codigo])
                resEmpresa = resEmpresa[0]
                const empresa = resEmpresa.id_empresas
                if (codeEstudiante) {
                    let consulAsignado = { consultor, empresa , etapa, orden  }
                    await insertarDatos('consultores_asignados', consulAsignado)
                }

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

    const { nombres, apellidos, countryCode, telConsul, direccion_consultor, /*empresa_seleccionada,*/ zh_consultor } = req.body
    await pool.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {

        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un consultor con este Email'));
        } else {

            let tableUsers = await consultarDatos('users')
            const admin  = tableUsers.find(x => x.rol == 'Admin')
            const lastUser = tableUsers[tableUsers.length-1];
            const hashCode = email+(parseInt(lastUser.id_usuarios+1));
            console.log("ultimo usuario ID >> ", lastUser);

            // Generar código MD5 con base a su email
            let codigo = crypto.createHash('md5').update(hashCode).digest("hex");
            clave = codigo.slice(5, 13);

            // Fecha de Creación
            const fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_consultor })
            const arrayFecha = fecha_creacion.split("/")
            // fecha_creacion = arrayFecha[0] + "/" + arrayFecha[2]
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Capturando Certificado de Consul Group
            // const certificado = '../certificados_consultores/' + urlCertificado

            // Objeto de Usuario
            const tel_consultor = "+" + countryCode + " " + telConsul
            const newUser = { nombres, apellidos, email, clave, rol: 'Estudiante', codigo, estadoEmail: 1, estadoAdm: 0 };
            const nuevoConsultor = { nombres, apellidos, email, tel_consultor, direccion_consultor, /*empresa_seleccionada,*/ codigo, id_tutor:'', tutor_asignado:'', fecha_creacion, mes, year };

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave);

            // Enviando email al admin del registro
            console.log("\nEnviando email al admin del registro de un consultor nuevo..\n")
            const nombreCompleto = nombres + ' ' + apellidos
            const templateConsul = nuevoConsultorRegistrado('Carlos', nombreCompleto)
            const resultEmail = await sendEmail(admin.email, '¡Se ha registrado una nuevo consultor!', templateConsul)

            if (resultEmail == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            } else {
                // Guardar en la base de datos
                // const fila1 = await pool.query('INSERT INTO users SET ?', [newUser]);
                const fila1 = await insertarDatos('users', newUser);
                if (fila1.affectedRows > 0) {
                    // await pool.query('INSERT INTO consultores SET ?', [nuevoConsultor]);
                    await insertarDatos('consultores', nuevoConsultor);
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
            } else if (usuario.rol == 'Estudiante') { // Usuario Estudiante
                console.log("\n**************");
                console.log("Estudiante LOGUEADO >>> ");
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
            }else if(usuario.rol == 'Tutor') {
                console.log("\n**************");
                console.log("Tutor LOGUEADO >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    req.session.tutor = true;
                    return done(null, usuario, req.flash('success', 'Bienvenido Tutor'))
                } else if (usuario.estadoAdm == 2) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada. Contacta a un administrador.'))
                } else if (usuario.estadoAdm == 3) {
                    return done(null, false, req.flash('message', 'Tu cuenta fue rechazada.'))
                } else {
                    return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
                }
            }else if (usuario.rol == 'Admin') { // Administrador
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