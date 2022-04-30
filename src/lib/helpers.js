const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = require('cross-fetch');
const dsConfig = require('../config/index.js').config;
const pool = require('../database')
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const helpers = {}
const clavePrivada = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAigXm2qUq1AmSHjR2gYK/9p+im8+veSwxddgbO+fTKA5gtU85
olHr68WJsEmQwkVVahcs697h1LL+4WvDPNnTZKKk4eEk2ohAbls+BjO6vbL8gBSR
tMh7chidqf4dQbN/Mvqz0Gh8fdGNIJau/v3FRGI+brVxamiGENpvdetYb8X3F0+C
CsyJiTvQYdkjhZWigaKYY/RXrZYkjQqoZm92sl5xiXAy5+8pmTPsc2IVc2EmbYPC
FPJY4DrH3EDAmnkGc2ekoaM5wHT0HbsYCaj7sFNY1MM8dfcP2x8ulGvMDNb5UmyA
7X+aGyjKfmluK005UD8fcI9YCaseK5jgMXSDJQIDAQABAoIBAAR64CG/ZkUfNh67
S1ki9IjdjXgh8q/HQqgDNFnzpOFyLXQgjbBIBt5p5vEj+iWHj+EcmeRQDxF3jiuk
hU241SSnAfhbPtGhWGacmSGS1UTOmEDTKhfbU3cCQIj9OKCZYiHIjGks/DBTSrZT
AleJfZSdlAVXw1hxNDup82jwE0q2ASK9dlK6a8F2cHb0Aio+3qsy16rCOp1Un8+Q
rtSjqIn+KdaZtVLY2FYMqAR2jZL3UnxkmAgIkDRoyhFvwIqC3kOMFuqYNt+A4sXQ
faM1M3D7g4a4jg6BDjt9bF4SUGU7vaPwr+Q19GseUcrB07EGiF6pXSdlNOqjUn7E
jgPcdxECgYEAvPMAscJTYRCSdsaZKj7SQdrV2SzVgpGXbONagNUclpYYfzKFqok/
5ZlaZEQ39OpUgO+rIrxhDYt+VMEl/N9765nT/xlKtpceBYmoj0mxmytPGQN1b9De
CbkFk9F/S9edf4qSxOTLZuTMYOdW2d3LAX9apwWhFSJv1MwgImf34OkCgYEAuwCJ
T5pC7WVW/+tTXpXIZj1IELp4+BRkof6/Qwcbzf0oJatbxPuYLib64qTGvBRGhWTJ
n28NV2uen7oM9A9wXv4egOiHX53Cc/LHNDErn47zUpJhH9bdOhdPdX990lRGPSgP
vPmEFK/78NcdxNzUelxV+DFuW2dRozm++vVUSt0CgYAsl8EjMrSQ5ONcKtS9FqRy
rF3p6l3dedTd+u5CF4mutG/FnTvUmp285ythHISERcV5xJaEFSdmlfRTtl3rxyas
3Noei26JlzKbpfhlEMRc1aTOR3Ww1P+CFeuODlRXpuRh1Gd9Fm42s2rUt+RUeLbP
fKn9XyO8JCt2clJnLFhg+QKBgC661pVOzjS2o0P2kXHMajSqUazkfEA6EF+u4iqk
xxz1iyfGp3sVCBVYZk9mr8bmJi1FX2D5BlN3MD9n5b7DcOg8BnFeKh4JtUL2QzNW
qjkIJuPWcnDbZ5MRqiiJgG6j4p17ulsV2xy0UXgAuY6tRGeDVXRdHd+3dN4eGwxp
a/P9AoGBAJGHvzEVku3y4SAEtaBacYrLXq81+1741+TnvkQrg026GQufpOLBtq3t
ZxJ8U9ZbPhV4U+kWJ1qeHRUmgmmFt08d0ZU08/EywqwkgwrSUn1SUBf+eMIClK6r
55If65RnCnlHvCOmujwWZOXkql1ZHXPzFcmRc90l7ucJLQzC7oK7
-----END RSA PRIVATE KEY-----`

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
    // const privateKey = fs.readFileSync('src/config/private.key');
    // const privateKey = fs.readFileSync(dsConfig.privateKeyRSA);
    try {
        //Generando Token de Autenticación para DocuSign
        dsConfig.authToken = jwt.sign(dsConfig.dsPayload, clavePrivada, { algorithm: 'RS256' })
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

module.exports = helpers;