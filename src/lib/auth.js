module.exports = {

    estaLogueado(req, res, next) {
        // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
        if (req.isAuthenticated() || req.user) { 
            return next();
        } else {
            return res.redirect('/login')
        }
    },

    noLogueado(req, res, next) {
        if (!req.isAuthenticated() || !req.user) {
            return next();
        } else {
            return res.redirect('/')
        }
    },

    validarRegistro(req, res, next) {
        if (!req.isAuthenticated() && !req.userEmail) {
            return next();
        } else {
            return res.redirect('/')
        }
    },

    validarURLPagar(req, res, next) {
        if (req.session.intentPay) { 
            return next();
        } else {
            return res.redirect('/')
        }
    },

    validarIDFicha(req, res, next) {
        if (req.session.fichaCliente) { 
            return next();
        } else {
            return res.redirect('/')
        }
    },

}