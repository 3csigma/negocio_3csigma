const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('cross-fetch');
const dsConfig = require('../config/index.js').config;
const pool = require('../database')
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
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
    
    try {
        let fechaActual = Math.floor(Date.now()/1000) // Fecha Actual
        let fechaExp = Math.floor(Date.now()/1000)+(60*15); // Expiración de 15 min
        dsConfig.dsPayload.iat = fechaActual;
        dsConfig.dsPayload.exp = fechaExp;
        //Generando Token de Autenticación para DocuSign
        dsConfig.authToken = jwt.sign(dsConfig.dsPayload, dsConfig.clavePrivada, { algorithm: 'RS256' })
        console.log("\n<<<< TOKEN GENERADO PARA AUTH >>>>", dsConfig.authToken)
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
            console.log("\n<<<< RESPUESTA DESDE DOCUSIGN >>>", response)
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

// Encriptando texto
helpers.encriptarTxt = (text) => {
   let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
   let encrypted = cipher.update(text);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return encrypted.toString('hex');
}

// Desencriptando texto
helpers.desencriptarTxt = (text) => {
   let encryptedText = Buffer.from(text, 'hex');
   let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString();
}

// Eliminar elemetos duplicados de un Arreglo
helpers.delDuplicados = (array) => {
    resultado = [];
    for (let i = 0; i < array.length; i++) {
        const c = array[i];
        if (!resultado.includes(array[i])) {
            resultado.push(c);
        }
    }
    return resultado;
}

module.exports = helpers;