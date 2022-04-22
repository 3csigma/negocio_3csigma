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

    validarURLPagar(req, res, next) {
        if (req.session.intentPay) { 
            return next();
        } else {
            return res.redirect('/')
        }
    },
}