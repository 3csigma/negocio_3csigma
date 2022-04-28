const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = require('cross-fetch');
const dsConfig = require('../config/index.js').config;
const pool = require('../database')
const helpers = {}

// Encriptar clave
helpers.encryptPass = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const claveCifrada = await bcrypt.hash(password, salt)
    return claveCifrada;
}
// Encontrar coincidencia de la clave en la base de datos
helpers.matchPass = async (password, passDB) => {
    try {
        return await bcrypt.compare(password, passDB)
    } catch (error) {
        console.log(error)
    }
}

// Generar Token de Autenticación en API Docusing
helpers.authToken = async () => {
    // Leyendo Clave Privada RSA emitida por Docusing
    // const privateKey = fs.readFileSync('src/' + dsConfig.privateKeyRSA);
    const privateKey = fs.readFileSync(dsConfig.privateKeyRSA);
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

// Consultar en la base de datos los estados de pago del usuario
helpers.consultarPagos = async (id_user) => {
    const tabla_pagos = await pool.query('SELECT * FROM pagos WHERE id_user = ?', [id_user])
    if (tabla_pagos.length == 0) {
        const nuevoPago = { id_user }
        await pool.query('INSERT INTO pagos SET ?', [nuevoPago], (err, result) => {
            if (err) throw err;
            // return console.log("Se ha registrado un usuario en la tabla Pagos - Estados 0 >>>>\n");
        })
    } else {
        if (tabla_pagos[0].diagnostico_negocio == '1') {
            diagnostico_pagado = 1;
        }
        if (tabla_pagos[0].analisis_negocio == '1') {
            analisis_pagado = 1;
        }
    }
}

module.exports = helpers;