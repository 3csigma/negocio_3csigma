const pool = require('../database')
const userController = exports;
const passport = require('passport')
// const { getToken, getTokenData } = require('../config/jwt.config');

// Cerrar Sesión
userController.cerrarSesion = (req, res) => {
    req.logOut();
    res.redirect('/login');
}

userController.getRegistro = (req, res) => {
    res.render('auth/registro', { login: true, wizarx: false, dashx: false })
}

userController.postRegistro = (req, res, next) => {
    passport.authenticate('local.registro', {
        successRedirect: '/registro',
        failureRedirect: '/registro',
        failureFlash: true
    })(req, res, next)
}

userController.getLogin = (req, res) => {
    res.render('auth/login', { login: true, wizarx: false, dashx: false })
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

       // Obtener el token
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
       if(code !== user.code) {
        return res.json({
            success: false,
            msg: 'Error al confirmar el registro'
        });
       }

       const updateEstado = {estado: 1}
       // Actualizando el estado del usuario - Activo (1)
       await pool.query('UPDATE users SET ? WHERE codigo = ?', [updateEstado, codigo])

       // Redireccionar a la confirmación
       return res.render('/auth/confirmar')
    //    return res.redirect('/confirm.html');
        
    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            msg: 'Error al confirmar usuario:\n'+error
        });
    }
}