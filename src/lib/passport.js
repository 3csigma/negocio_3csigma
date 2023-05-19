const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../database')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const stripe = require('stripe')(process.env.CLIENT_SECRET_STRIPE);
const { confirmarRegistro, sendEmail, nuevaEmpresa, nuevoConsultorRegistrado } = require('../lib/mail.config')

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

    const { nombres, apellidos, nombre_empresa, id_afiliado, zh_empresa } = req.body
    // Verificando si el usuario existe o no
    await pool.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {

        // Si ocurre un error
        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un usuario con este Email'))
        } else {
            // Capturando Nombre de usuario con base al email del usuario
            let username = email.split('@')
            username = username[0]

            let tableUsers = await helpers.consultarDatos('users')
            const admin  = tableUsers.find(x => x.rol == 'Super Admin')
            const lastUser = tableUsers[tableUsers.length-1];
            const hashCode = email+(parseInt(lastUser.id_usuarios+1));

            // Generar código MD5 con base a su email
            const codigo = crypto.createHash('md5').update(hashCode).digest("hex");

            // Fecha de Creación
            const fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_empresa })
            const arrayFecha = fecha_creacion.split("/")
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Empresa', codigo }

            // Encriptando la clave
            newUser.clave = await helpers.encryptPass(clave)

            const empresaNueva = { nombres, apellidos, nombre_empresa, email, codigo, fecha_creacion, mes, year }
            
            console.log("ID Afiliado >> ", id_afiliado)
            if (id_afiliado) { 
                let corporativo = await helpers.consultarDatos('consultores')
                corporativo = corporativo.find(x => x.id_corporativo == id_afiliado)
                if (corporativo) {
                    // Validar si el Usuario Primario (Admin o Consultor independiente) tiene subscripción activa o no
                    const subscription = await stripe.subscriptions.retrieve(corporativo.suscription_id);
                    console.log("\n>>> DATOS DE LA SUSCRIPCIÓN:: ", subscription)
                    if (subscription.status != 'active') {
                        req.session.empresa = false;
                        return done(null, false, req.flash('error', 'La cuenta de tu administrador se encuentra suspendida, intenta mas tarde'))
                    }
                    // const actualizarEmpresa = { id_afiliado };
                    // await pool.query('UPDATE empresas SET ? WHERE codigo = ?', [actualizarEmpresa, codigo]);
                    empresaNueva.id_afiliado = id_afiliado;
                    await helpers.insertarDatos('empresas', empresaNueva)
                    // VALIDANDO SI LA EMPRESA QUE SE ESTÁ REGISTRANDO ESTARÁ AFILIADA A UN CONSULTOR INDEPENDIENTE
                    let usuario = await helpers.consultarDatos('users')
                    usuario = usuario.find(u => u.codigo == corporativo.codigo && u.rol == 'Consultor independiente')
                    if (usuario) {
                        let empresa = await helpers.consultarDatos('empresas')
                        empresa = empresa.find(e => e.codigo == codigo)
                        empresa = empresa.id_empresas;
                        // ASIGNANDO CONSULTOR INDEPENDIENTE A TODAS LAS ETAPAS PARA LA NUEVA EMPRESA
                        for (let i = 1; i <= 4; i++) {
                            let etapa = ''
                            if (i == 1) {
                                etapa = 'Diagnóstico'
                            } else if (i == 2) {
                                etapa = 'Análisis'
                            } else if (i == 3) {
                                etapa = 'Proyecto de Consultoría'
                            } else {
                                etapa = 'Plan Estratégico'
                            }
                            
                            const datos = {consultor: corporativo.id_consultores, empresa, etapa, orden: i}
                            await helpers.insertarDatos('consultores_asignados', datos)
                        }
                    }
                }
            } else {
                await helpers.insertarDatos('empresas', empresaNueva)
            }
            // Obtener la plantilla de Email
            const template = confirmarRegistro(nombres, nombre_empresa, codigo);
            const templateNuevaEmpresa = nuevaEmpresa('Carlos', nombre_empresa)

            // Guardar en la base de datos
            await helpers.insertarDatos('users', newUser)

            // Enviar Email 
            const resultEmail = await sendEmail(email, 'Confirma tu registro en PAOM System', template)
            console.log("\nEnviando email al admin de nueva empresa registrada..\n")
            const resultEmail2 = await sendEmail(admin.email, '¡Se ha registrado una nueva empresa!', templateNuevaEmpresa)
            if (resultEmail == false || resultEmail2 == false) {
                return done(null, false, req.flash('message', 'Ocurrió algo inesperado al enviar el registro'))
            } else {
                return done(null, false, req.flash('registro', 'Registro enviado, revisa tu correo en unos minutos y activa tu cuenta.'))
            }
            
        }
    })
}))

// Registro de Consultores
passport.use('local.registroConsultores', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, email, clave, done) => {

    const { nombres, apellidos, countryCode, telConsul, direccion_consultor, experiencia_years, id_afiliado, zh_consultor } = req.body
    pool.query('SELECT * FROM users WHERE email = ?', [email,], async (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            return done(null, false, req.flash('message', 'Ya existe un consultor con este Email'));
        } else {

            let tableUsers = await helpers.consultarDatos('users')
            const admin  = tableUsers.find(x => x.rol == 'Super Admin')
            const lastUser = tableUsers[tableUsers.length-1];
            const hashCode = email+(parseInt(lastUser.id_usuarios+1));

            // Generar código MD5 con base a su email
            let codigo = crypto.createHash('md5').update(hashCode).digest("hex");
            clave = codigo.slice(5, 13);            

            // Fecha de Creación
            const fecha_creacion = new Date().toLocaleDateString("en-US", { timeZone: zh_consultor })
            const arrayFecha = fecha_creacion.split("/")
            const mes = arrayFecha[0] ;
            const year = arrayFecha[2];

            // Capturando Certificado de Consul Group
            const certificado = '../certificados_consultores/' + urlCertificado

            // Objeto de Usuario
            const newUser = { nombres, apellidos, email, clave, rol: 'Consultor', codigo, estadoEmail: 1, estadoAdm: 0 };

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
                // Objeto para crear el Consultor
                const tel_consultor = "+" + countryCode + " " + telConsul
                const nuevoConsultor = { nombres, apellidos, email, tel_consultor, direccion_consultor, experiencia_years, certificado, codigo, fecha_creacion, mes, year };
                console.log("ID AFILIADO >> ", id_afiliado);
                if (id_afiliado) { 
                    let corporativo = await helpers.consultarDatos('consultores')
                    corporativo = corporativo.find(c => c.id_corporativo == id_afiliado)
                    if (corporativo) {
                        console.log("Existe un consultor con id_corporativo");
                        // Validar si el Usuario Primario (Admin o Consultor independiente) tiene subscripción activa o no
                        const subscription = await stripe.subscriptions.retrieve(corporativo.suscription_id);
                        console.log("\n>>> DATOS DE LA SUSCRIPCIÓN:: ", subscription)
                        if (subscription.status != 'active') {
                            req.session.empresa = false;
                            return done(null, false, req.flash('error', 'La cuenta de tu administrador se encuentra suspendida, intenta mas tarde.'))
                        }
                        let usuario = await helpers.consultarDatos('users')
                        usuario = usuario.find(u => u.codigo == corporativo.codigo)
                        if (usuario.rol == 'Admin') {
                            nuevoConsultor.id_afiliado = id_afiliado;
                            await helpers.insertarDatos('consultores', nuevoConsultor);
                        }
                    }
                } else {
                    await helpers.insertarDatos('consultores', nuevoConsultor);
                }
                // Guardar en la base de datos
                await helpers.insertarDatos('users', newUser);

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

    const users = await helpers.consultarDatos('users')
    const usuario = users.find(x => x.email == email)

    if (usuario) {
        const claveValida = await helpers.matchPass(clave, usuario.clave)

        if (claveValida) {
            // USUARIO EMPRESA
            if (usuario.rol == 'Empresa') { 
                console.log("\n**************");
                console.log("EMPRESA LOGUEADA >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    let empresa = await helpers.consultarDatos('empresas')
                    empresa = empresa.find(e => e.codigo == usuario.codigo)
                    let corporativo = await helpers.consultarDatos('consultores')
                    corporativo = corporativo.find(c => c.id_corporativo == empresa.id_afiliado)
                    if (corporativo) {
                        const user_consultor = users.find(u => u.codigo == corporativo.codigo && (u.rol == 'Admin' || u.rol == 'Consultor independiente'))
                        if (user_consultor) {
                            // Validar si el Usuario Primario (Admin o Consultor independiente) tiene subscripción activa o no
                            const subscription = await stripe.subscriptions.retrieve(corporativo.suscription_id);
                            console.log("\n>>> DATOS DE LA SUSCRIPCIÓN:: ", subscription)
                            if (subscription.status != 'active') {
                                req.session.empresa = false;
                                return done(null, false, req.flash('error', 'La cuenta de tu administrador se encuentra suspendida, intenta mas tarde'))
                            }
                        }
                    }
                    req.session.empresa = true;
                    return done(null, usuario, req.flash('success', 'Bienvenido Usuario Empresa'))
                    
                } else if (usuario.estadoAdm == 0) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada o no ha sido activada. Contacta a un administrador.'))
                } else {
                    return done(null, false, req.flash('message', 'Aún no has verificado la cuenta desde tu email.'))
                }
            // USUARIO CONSULTOR REGULAR
            } else if (usuario.rol == 'Consultor') {
                console.log("\n**************");
                console.log("CONSULTOR REGULAR LOGUEADO >>> ");
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
            // USUARIO ADMIN (Empresario dueño de franquicia) 
            } else if (usuario.rol == 'Admin') {
                console.log("\n**************");
                console.log("ADMIN - Empresario dueño de franquicia LOGUEADO >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    let corporativo = await helpers.consultarDatos('consultores')
                    corporativo = corporativo.find(c => c.codigo == usuario.codigo)
                    // Validar si el Usuario Primario (Admin o Consultor independiente) tiene subscripción activa o no
                    const subscription = await stripe.subscriptions.retrieve(corporativo.suscription_id);
                    console.log("\n>>> DATOS DE LA SUSCRIPCIÓN:: ", subscription)
                    if (subscription.status != 'active') {
                        req.session.consultor = false;
                        return done(null, false, req.flash('error', 'Tu cuenta no tiene una suscripción activa'))
                    } else {
                        req.session.consultor = true;
                        return done(null, usuario, req.flash('success', 'CONSULTOR INDEPENDIENTE'))
                    }
                } else if (usuario.estadoAdm == 2) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada. Contacta a un administrador.'))
                } else if (usuario.estadoAdm == 3) {
                    return done(null, false, req.flash('message', 'Tu cuenta fue rechazada.'))
                } else {
                    return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
                }
            // USUARIO CONSULTOR INDEPENDIENTE
            } else if (usuario.rol == 'Consultor independiente') {
                console.log("\n**************");
                console.log("CONSULTOR INDEPENDIENTE LOGUEADO >>> ");
                console.log("**************");
                if (usuario.estadoEmail == 1 && usuario.estadoAdm == '1') {
                    let corporativo = await helpers.consultarDatos('consultores')
                    corporativo = corporativo.find(c => c.codigo == usuario.codigo)
                    // Validar si el Usuario Primario (Admin o Consultor independiente) tiene subscripción activa o no
                    const subscription = await stripe.subscriptions.retrieve(corporativo.suscription_id);
                    console.log("\n>>> DATOS DE LA SUSCRIPCIÓN:: ", subscription)
                    if (subscription.status != 'active') {
                        req.session.consultor = false;
                        return done(null, false, req.flash('error', 'Tu cuenta no tiene una suscripción activa'))
                    } else {
                        req.session.consultor = true;
                        return done(null, usuario, req.flash('success', 'CONSULTOR INDEPENDIENTE'))
                    }
                } else if (usuario.estadoAdm == 2) {
                    return done(null, false, req.flash('message', 'Tu cuenta esta bloqueada. Contacta a un administrador.'))
                } else if (usuario.estadoAdm == 3) {
                    return done(null, false, req.flash('message', 'Tu cuenta fue rechazada.'))
                } else {
                    return done(null, false, req.flash('message', 'Tu cuenta está suspendida o aún no ha sido activada.'))
                }
            // USUARIO SUPER ADMINISTRADOR
            } else {
                console.log("\n**************");
                console.log("SUPER ADMINISTRADOR PAOM LOGUEADO >>> ");
                console.log("**************");
                if (req.session.initialised) {
                    req.session.admin = true;
                }
                return done(null, usuario, req.flash('success', 'Bienvenido Super Admin'))
            }

        } else {
            return done(null, false, req.flash('message', 'Contraseña inválida'))
        }

    } else {
        return done(null, false, req.flash('message', 'No existe este usuario'))
    }

}))