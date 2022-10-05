const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('cross-fetch');
const dsConfig = require('../config/index.js').config;
const pool = require('../database')
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const multer = require('multer');
const path = require('path');
const { sendEmail, pagoAnalisisPendienteHTML } = require('../lib/mail.config')
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
/************************************************************************************************************** */
/** CARGA DE ARCHIVOS */
helpers.uploadFiles = (preNombre, inputName, carpeta) => {
    const rutaAlmacen = multer.diskStorage({
        destination: (_req, file, cb) => {
            const ruta = path.join(__dirname, '../public/'+carpeta)
            cb(null, ruta);
        },
    
        filename: (_req, file, cb) => {
            const nomFile = preNombre + file.originalname;
            cb(null, nomFile)
        }
    });

    const upload = multer({ storage: rutaAlmacen }).array(inputName)
    return upload;
}

/************************************************************************************************************** */
// ACTUALIZAR PAGOS ANÁLISIS DE NEGOCIO
helpers.enabled_nextPay = async () => {
    const propuestas = await pool.query('SELECT * FROM propuesta_analisis')
    const pagos = await pool.query("SELECT * FROM pagos");
    const empresas = await pool.query('SELECT * FROM empresas')

    if (propuestas.length > 0) {
        propuestas.forEach(async (x) => {
            const isFound = pagos.find(p => p.id_empresa == x.empresa)
            console.log();

            if (isFound) {
                console.log("HAY COINCIDENCIAS PROPUESTA / PAGOS")
                const fechaActual = new Date().toLocaleDateString("en-US")
                console.log("FECHA SGTE: " + fechaActual);
                const obj1 = JSON.parse(isFound.analisis_negocio1)
                const obj2 = JSON.parse(isFound.analisis_negocio2)
                const obj3 = JSON.parse(isFound.analisis_negocio3)

                if (obj1.fecha && obj2.estado == 0) {
                    console.log("ENTRANDO A LA FECHA 1 ", obj1.fecha)
                    let fechaDB = new Date(obj1.fecha)
                    fechaDB.setDate(fechaDB.getDate() + 30);
                    fechaDB = fechaDB.toLocaleDateString("en-US")

                    if (fechaDB == fechaActual) {
                        const actualizar = {analisis_negocio2: JSON.stringify({estado: 1})}
                        const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])

                        if (estadoDB.affectedRows > 0) {
                            const empresa = empresas.find(i => i.id_empresas == x.empresa)
                            const email = empresa.email
                            const nombre_empresa = empresa.nombre_empresa
                            const texto = 'primera cuota de tu análisis de negocio en 3C Sigma, tu segundo'
                            
                            // Obtener la plantilla de Email
                            const template = pagoAnalisisPendienteHTML(nombre_empresa, texto);
                    
                            // Enviar Email
                            const resultEmail = await sendEmail(email, 'Tu segundo cobro de análisis de negocio está listo', template)
                
                            if (resultEmail == false){
                                console.log("Ocurrio un error inesperado al enviar el email del 2do Cobro de análisis de negocio")
                            } else {
                                console.log("Email del 2do cobro enviado satisfactoriamente")
                            }
                        }
                    }
                } else if (obj2.fecha && obj3.estado == 0) {
                    console.log("ENTRANDO A LA FECHA 2")
                    let fechaDB = new Date(obj2.fecha)
                    fechaDB.setDate(fechaDB.getDate() + 30);
                    fechaDB = fechaDB.toLocaleDateString("en-US")
                    if (fechaDB == fechaActual) {
                        const actualizar = {analisis_negocio3: JSON.stringify({estado: 1})}
                        const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])
                        
                        if (estadoDB.affectedRows > 0) {
                            const empresa = empresas.find(i => i.id_empresas == x.empresa)
                            const email = empresa.email
                            const nombre_empresa = empresa.nombre_empresa
                            const texto = 'segunda cuota de tu análisis de negocio en 3C Sigma, tu tercer y último'
                            
                            // Obtener la plantilla de Email
                            const template = pagoAnalisisPendienteHTML(nombre_empresa, texto);
                    
                            // Enviar Email
                            const resultEmail = await sendEmail(email, 'Tu último cobro de análisis de negocio está listo', template)
                
                            if (resultEmail == false){
                                console.log("Ocurrio un error inesperado al enviar el email del último Cobro de análisis de negocio")
                            } else {
                                console.log("Email del último cobro enviado satisfactoriamente")
                            }
                        }
                    }
                }

            } 

        })
    }
    return "EJECUCIÓN CRON JOB FINALIZADA..!";
}

/** CONSULTAS MYSQL */
helpers.consultarInformes = async (empresa, consultor, nombreInforme) => {
    const informe = await pool.query(`SELECT * FROM informes WHERE id_empresa = ? AND id_consultor = ? AND nombre = ? `, [empresa, consultor, nombreInforme])
    return informe;
}

module.exports = helpers;