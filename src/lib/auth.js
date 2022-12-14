const rutasObj = require('../config/index.js').config;
module.exports = {

    checkLogin(req, res, next) {
        if (req.isAuthenticated()) {
            console.log("Ruta >> ", req.url)
            let url = req.url.split("/")
            url = url[1]
            if (req.session.empresa) {
                const ok = rutasObj.rutasEmpresa.find(x => x == url.toLowerCase())
                if (ok) return next();
            } else if (req.session.admin) {
                const adm = rutasObj.rutasAdmin.find(x => x == url.toLowerCase())
                const adm2 = rutasObj.rutasConsultor.find(x => x == url.toLowerCase())
                if (adm || adm2) return next();
            } else if (req.session.consultor) {
                const ok = rutasObj.rutasConsultor.find(x => x == url.toLowerCase())
                if (ok) return next();
            } else {
                res.redirect('/404')
            }
        } else {
            return res.redirect('/login')
        }
    },

    // empresaLogueada(req, res, next) {
    //     // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
    //     console.group("\n-------------------\nEMPRESA INICIÓ SESIÓN\n-------------\n") 
    //     console.log("DATO >> ", req.session)
    //     console.groupEnd();
    //     if (req.session.empresa && !req.session.admin && !req.session.consultor) {
            
    //         return next();
    //     } else {
    //         console.log("\n-------------------\n ::: NO INICIÓ EMPRESA ::: \n-------------\n") 
    //         return res.redirect('/')
    //     }
    // },

    // adminLogueado(req, res, next) {
    //     if (req.session.admin && !req.session.empresa && !req.session.consultor) { 
    //         return next();
    //     } else {
    //         return res.redirect('/login')
    //     }
    // },

    // consultorLogueado(req, res, next) {
    //     if (req.session.consultor && !req.session.empresa || req.session.admin) { 
    //         return next();
    //     } else {
    //         return res.redirect('/login')
    //     }
    // },

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