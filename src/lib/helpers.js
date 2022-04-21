const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = require('cross-fetch');
const dsConfig = require('../config/index.js').config;
const helpers = {}

//Encriptar clave
helpers.encryptPass = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const claveCifrada = await bcrypt.hash(password, salt)
    return claveCifrada;
}
//Encontrar coincidencia de la clave en la base de datos
helpers.matchPass = async (password, passDB) => {
    try {
        return await bcrypt.compare(password, passDB)
    } catch (error) {
        console.log(error)
    }
}

//Generar Token de Autenticación en API Docusing
helpers.authToken = async () => {
    // Leyendo Clave Privada RSA emitida por Docusing
    const privateKey = fs.readFileSync('src/' + dsConfig.privateKeyRSA);
    try {
        //Generando Token de Autenticación para DocuSign
        dsConfig.authToken = jwt.sign(dsConfig.dsPayload, privateKey, { algorithm: 'RS256' })
    } catch (error) {
        console.log(error)
    }

    const url = 'https://' + dsConfig.dsOauthServer + '/oauth/token'
    const data = {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: dsConfig.authToken
    }
    const responseTK = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(response => {
            // console.log("RESPONSE TOKEN >>>", response)
            return response;
        });

    return responseTK;
}

helpers.validatePay = (req, res, next) => {
    // Método de passport que se ha poblado al objeto req & lo que devuelve true or false para saber si el usuario existe
    if (req.intentPayment) {
        return next();
    } else {
        return res.redirect('/')
    }
}


module.exports = helpers;