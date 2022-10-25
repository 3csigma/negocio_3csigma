const pool = require('../database')
const passport = require('passport')
const bcrypt = require('bcryptjs');
const { restablecerCuentaHTML, sendEmail } = require('../lib/mail.config')
const randtoken = require('rand-token');
const userController = exports;

// Cerrar Sesión
userController.cerrarSesion = (req, res) => {
    req.session.empresa = false;
    req.session.consultor = false;
    req.session.admin = false;
    req.logOut();
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
            const asunto = "Bienvenido a 3C Sigma"
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
    console.log("\n")
    console.log("¡¡¡¡¡¡¡¡¡¡¡¡= TOKEN =¡¡¡¡¡¡¡¡¡¡¡¡:::>>>>", token);
    console.log("¡¡¡¡¡¡¡¡¡¡¡¡= CLAVE =¡¡¡¡¡¡¡¡¡¡¡¡:::>>>>", clave);

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
// Perfil de Usuarios
userController.perfilUsuarios = async (req, res) => {
    const { rol } = req.user;
    let user_dash = false, adminDash = false, consulDash = false
    if (rol == 'Empresa') user_dash = true;
    if (rol == 'Admin') adminDash = true;
    res.render('pages/profile', {
        rol, adminDash, user_dash, consulDash
    })
}