const rutasObj = require('../config/index.js');
const empresaController = require('../controllers/empresaController');
const consultorController = require('../controllers/consultorController');
const dashboardController = require('../controllers/dashboardController');

module.exports = {

    checkLogin(req, res, next) {
        if (req.isAuthenticated()) {
            let url = req.url.split("/")
            url = url[1]
            console.log("Ruta >> ", url)
            if (req.user.rol == 'Empresa') {
                const ok = rutasObj.rutasEmpresa.find(x => x == url.toLowerCase())
                if (ok) return next(); else return console.log("La empresa no tiene acceso a esta ruta o no se encuentra en el Array rutasEmpresa.. (Rutas en minúsculas)");
            } else if (req.user.rol == 'Super Admin' || req.user.rol == 'Admin') {
                const adm = rutasObj.rutasAdmin.find(x => x == url.toLowerCase())
                const adm2 = rutasObj.rutasConsultor.find(x => x == url.toLowerCase())
                if (adm || adm2) return next(); else console.log("El Admin no tiene acceso a esta ruta o no se encuentra en el Array rutasAdmin.. (Rutas en minúsculas)");
            } else if (req.user.rol == "Consultor" || req.user.rol == 'Consultor independiente') {
                const ok = rutasObj.rutasConsultor.find(x => x == url.toLowerCase())
                if (ok) return next(); else console.log("El Consultor no tiene acceso a esta ruta o no se encuentra en el Array rutasConsultor.. (Rutas en minúsculas)");
            } else {
                res.redirect('/404')
            }
        } else {
            return res.redirect('/login')
        }
    },

    requireRole(req, res, next) {
        console.log("\nUSUARIO >>> ", req.user);
        if (req.isAuthenticated && req.user) {
            if (req.user.rol == "Empresa") {
                empresaController.index(req, res);
            } else if(req.user.rol == "Consultor" || req.user.rol == "Consultor independiente") {    
                consultorController.index(req, res);
            } else {
                dashboardController.admin(req, res);
            }
        } else {
            res.redirect('/login');
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