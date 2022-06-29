module.exports = {

    checkLogin(req, res, next) {
        // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
        if (req.isAuthenticated()) { 
            return next();
        } else {
            return res.redirect('/login')
        }
    },

    empresaLogueada(req, res, next) {
        // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
        if (req.session.empresa && !req.session.admin && !req.session.consultor) { 
            return next();
        } else {
            return res.redirect('/login')
        }
    },

    adminLogueado(req, res, next) {
        if (req.session.admin && !req.session.empresa && !req.session.consultor) { 
            return next();
        } else {
            return res.redirect('/login')
        }
    },

    consultorLogueado(req, res, next) {
        if (req.session.consultor && !req.session.empresa || req.session.admin) { 
            return next();
        } else {
            return res.redirect('/login')
        }
    },

    noLogueado(req, res, next) {
        if (!req.isAuthenticated()) {
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
            return res.redirect('/diagnostico-de-negocio')
        }
    },

}