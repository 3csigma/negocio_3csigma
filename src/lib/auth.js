module.exports = {

    estaLogueado(req, res, next) {
        // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
        if (req.isAuthenticated()) { 
            return next();
        }
        return res.redirect('/negocio/login')
    },

    noLogueado(req, res, next) {
        if (!req.isAuthenticated()) { 
            return next();
        }
        return res.redirect('/negocio')
    }

}