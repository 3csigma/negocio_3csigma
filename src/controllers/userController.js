const pool = require('../database')
const userController = exports;
const passport = require('passport')

// Cerrar Sesión
userController.cerrarSesion = (req, res) => {
    req.logOut();
    res.redirect('/login');
}

userController.getRegistro = (req, res) => {
    req.userEmail = false;
    res.render('auth/registro', { todoLink: true, wizarx: false, dashx: false, login: false, confirmarLogin: false });
}

userController.postRegistro = (req, res, next) => {
    passport.authenticate('local.registro', {
        successRedirect: '/registro',
        failureRedirect: '/registro',
        failureFlash: true
    })(req, res, next)
}

userController.getLogin = (req, res) => {
    res.render('auth/login', { todoLink: true, wizarx: false, dashx: false, login: false, confirmarLogin: false})
}

userController.postLogin = (req, res, next) => {
    passport.authenticate('local.login', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true,
    })(req, res, next)
}

userController.confirmarRegistro = async (req, res) => {
    try {

       // Obtener el código
       const { codigo } = req.params;

       // Verificar existencia del usuario por medio del código
       const user = await pool.query("SELECT * FROM users WHERE codigo = ?", [codigo])

       if(user === null) {
            return res.json({
                success: false,
                msg: 'Lo sentimos, este usuario no existe en nuestra base de datos'
            });
       }

       // Verificar el código
       if(codigo !== user[0].codigo) {
        return res.json({
            success: false,
            msg: 'Error al confirmar el registro, los códigos no coinciden'
        });
       }

       const updateEstado = {estado: 1}
       // Actualizando el estado del usuario - Activo (1)
       await pool.query('UPDATE users SET ? WHERE codigo = ?', [updateEstado, codigo])

       // Redirigir al Login con un mensaje de alerta de que ya confirmó su cuenta
       res.render('auth/login', { login: true, wizarx: false, dashx: false, confirmarLogin: true })
        
    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            msg: 'Error al confirmar usuario - '+error
        });
    }
}