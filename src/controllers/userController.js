const pool = require('../database')
const passport = require('passport')
const bcrypt = require('bcryptjs');
const { restablecerCuentaHTML, sendEmail } = require('../lib/mail.config')
const randtoken = require('rand-token');
const userController = exports;

// Cerrar Sesión
userController.cerrarSesion = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
}

userController.getRegistro = (req, res) => {
    req.userEmail = false;
    res.render('auth/registro', { wizarx: false, user_dash: false, csrfToken: req.csrfToken() });
}

userController.postRegistro = (req, res, next) => {
    passport.authenticate('local.registro', {
        successRedirect: '/registro',
        failureRedirect: '/registro',
        failureFlash: true
    })(req, res, next)
}

userController.getLogin = (req, res) => {
    res.render('auth/login', { wizarx: false, user_dash: false, login: false, confirmarLogin: false, csrfToken: req.csrfToken() })
}

userController.confirmarRegistro = async (req, res) => {
    try {
        // Obtener el código
        const { codigo } = req.params;

        // Verificar existencia del usuario por medio del código
        const user = await pool.query("SELECT * FROM users WHERE codigo = ?", [codigo])

        if (user === null) {
            return res.json({
                success: false,
                msg: 'Lo sentimos, este usuario no existe en nuestra base de datos'
            });
        }

        // Verificar el código
        if (codigo !== user[0].codigo) {
            return res.json({
                success: false,
                msg: 'Error al confirmar el registro, los códigos no coinciden'
            });
        }

        const updateEstado = { estadoEmail: 1 }
        // Actualizando el estado del usuario - Activo (1)
        await pool.query('UPDATE users SET ? WHERE codigo = ?', [updateEstado, codigo])

        // Redirigir al Login con un mensaje de alerta de que ya confirmó su cuenta
        res.render('auth/login', { wizarx: false, user_dash: false, confirmarLogin: true, csrfToken: req.csrfToken() })

    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            msg: 'Error al confirmar usuario - ' + error
        });
    }
}

/**************************************************************************************************************** */
// --------------------------------------- RESTABLECER CONTRASEÑA ----------------------------------------------

userController.getrestablecerClave = (req, res) => {
    res.render('auth/restablecer-clave', { csrfToken: req.csrfToken() });
}

userController.getresetPassword = (req, res) => {
    res.render('auth/reset-password', { csrfToken: req.csrfToken(), token: req.query.token });
}

userController.resetPassword = async (req, res, next) => {
    let { email } = req.body;

    pool.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) throw err;
        let type = ''
        let msg = ''
        if (result.length > 0) {
            const token = randtoken.generate(20);
            // ! ************* PROCESO DEL EMAIL PARA VENDEDOR ************
            const asunto = "Reestablece tu contraseña en PAOM System"
            const plantilla = restablecerCuentaHTML(token)
            // Enviar email
            const resultEmail = sendEmail(email, asunto, plantilla)

            if (!resultEmail) {
                type = 'error';
                msg = 'Ocurrió un error. Inténtalo de nuevo';
                // res.json("Ocurrio un error inesperado al enviar el email al vendedor")
            } else {
                const data = {
                    token: token
                }
                pool.query("UPDATE users SET ? WHERE email = ?", [data, email], (err, result) => {
                    if (err) throw err
                })
                type = 'success';
                msg = 'Revisa tu bandeja de entrada';
            }
            // ! **************************************************************
        } else {
            console.log('2');
            type = 'error';
            msg = 'Este correo no está registrado';
        }
        req.flash(type, msg);
        res.redirect('/restablecer-clave');
    });
}

userController.updatePassword = async (req, res, next) => {
    const { clave, token } = req.body;

    await pool.query('SELECT * FROM users WHERE token = ?', [token], (err, result) => {
        if (err) throw err;
        let type
        let msg
        if (result.length > 0) {
            const email = result[0].email
            console.log("¡¡¡¡¡¡¡¡¡¡¡¡= EMAIL =¡¡¡¡¡¡¡¡¡¡¡¡:::>>>>", email);
            const saltRounds = 10;
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) throw err;
                bcrypt.hash(clave, salt, (err, hash) => {
                    if (err) throw err;
                    const data = { clave: hash }
                    console.log("¡¡¡¡¡¡¡¡¡¡¡¡= DATA =¡¡¡¡¡¡¡¡¡¡¡¡:::>>>>", data);
                    pool.query('UPDATE users SET ? WHERE email = ?', [data, email], (err, result) => {
                        if (err) throw err
                    });
                });
            });
            type = 'success';
            msg = 'Contraseña actualizada correctamente';
        } else {
            console.log('2 Soy una respuesta negativa');
            console.log("\n")

            type = 'error';
            msg = 'Link inválido. Inténtalo de nuevo';
        }
        req.flash(type, msg);
        res.render('auth/login', { msgSuccessClave: true, csrfToken: req.csrfToken() })
    });
}

/******************************************************************************************* */
// Actualizar datos de usuarios
userController.update_user = async (req, res) => {
    let { rol, codigo } = req.user;

    // Aactualizar datos de empresa
    if (rol == 'Empresa') {
        user_dash = true;
        let { nombres_empresa, apellidos_empresa, nombre_empresa, email_empresa,clave_empresa } = req.body;
        let nombres = nombres_empresa
        let apellidos = apellidos_empresa
        let email = email_empresa
        let clave = clave_empresa

        let resultDatos = await pool.query("SELECT u.nombres, u.apellidos, u.email, u.clave, e.nombre_empresa FROM users u JOIN empresas e ON u.email = e.email WHERE u.codigo = ? ", [codigo]);
        resultDatos = resultDatos[0];
        const nombres_db = resultDatos.nombres;
        const apellidos_db = resultDatos.apellidos;
        const empresa_db = resultDatos.nombre_empresa;
        const email_db = resultDatos.email;
        const clave_db = resultDatos.clave;
    
        nombres == '' ? nombres = nombres_db : email
        apellidos == '' ? apellidos = apellidos_db : apellidos
        nombre_empresa == '' ? nombre_empresa = empresa_db: nombre_empresa
        email == '' ? email = email_db : email
        clave == '' ? clave = clave_db : clave = await bcrypt.hash(clave, 12);
    
        const datos_tbl_user = { nombres, apellidos, email, clave }
        const datos_tbl_empresas = { nombres, apellidos, nombre_empresa, email }
    
        await pool.query('UPDATE users SET ? WHERE codigo = ?', [datos_tbl_user, codigo])
        await pool.query('UPDATE empresas SET ? WHERE codigo = ?', [datos_tbl_empresas, codigo])
    }

    // Actualizar datos consultor y administrador
    if (rol == 'Estudiante' || rol == 'Admin') {
        consultorDash = true;
        let { email_consultor, clave_consultor, tel_consultor, direccion_consultor } = req.body;
        let email = email_consultor
        let clave = clave_consultor

        let resultDatos = await pool.query("SELECT u.*, c.* FROM users u JOIN consultores c ON u.codigo = c.codigo WHERE u.codigo = ?", [codigo]);
        resultDatos = resultDatos[0];
        const email_db = resultDatos.email;
        const clave_db = resultDatos.clave;
        const tel_db = resultDatos.tel_consultor;
        const dire_db = resultDatos.direccion_consultor;

        email_consultor == '' ? email = email_db : email
        clave_consultor == '' ? clave = clave_db : clave = await bcrypt.hash(clave, 12);
        tel_consultor == '' ? tel_consultor = tel_db : tel_consultor
        direccion_consultor == '' ? direccion_consultor = dire_db : direccion_consultor

        const datos_tbl_user = { email, clave }
        const datos_tbl_consultores = { email, tel_consultor, direccion_consultor }
        await pool.query('UPDATE users SET ? WHERE codigo = ?', [datos_tbl_user, codigo])
        await pool.query('UPDATE consultores SET ? WHERE codigo = ?', [datos_tbl_consultores, codigo])

    } 
    res.redirect("/perfil/" + codigo);
}
// Actualizar foto
userController.actualizarFotoPerfil = async (req, res) => {
    const { rol, codigo } = req.user;
    const actualizar = { foto: "../foto_profile/" + urlProfile };

    if (rol == 'Empresa') {
        await pool.query("UPDATE users SET ? WHERE codigo = ?", [actualizar, codigo]);
    }
    if (rol == 'Estudiante' || rol == 'Admin' || rol == 'Tutor') {
        await pool.query("UPDATE users SET ? WHERE codigo = ?", [actualizar, codigo]);
    }
    res.send(true);
};