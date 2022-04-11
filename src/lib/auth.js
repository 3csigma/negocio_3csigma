module.exports = {

    estaLogueado(req, res, next) {
        // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
        if (req.isAuthenticated()) { 
            return next();
        } else {
            res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            return res.redirect('/login')
        }
    },

    noLogueado(req, res, next) {
        if (!req.isAuthenticated() || !req.user) {
            res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            return next();
        } else {
            return res.redirect('/')
        }
    }
}