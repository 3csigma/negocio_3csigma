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
/*********************************** FUNCIONES PARA CRON JOB ****************************************************** */
// ACTUALIZAR PAGOS ANÁLISIS DE NEGOCIO
helpers.enabled_nextPay = async () => {
    const propuestas = await pool.query('SELECT * FROM propuesta_analisis')
    const pagos = await pool.query("SELECT * FROM pagos");
    const empresas = await pool.query('SELECT * FROM empresas')

    if (propuestas.length > 0) {
        propuestas.forEach(async (x) => {
            const isFound = pagos.find(p => p.id_empresa == x.empresa)
            if (isFound) {
                console.log("\nHAY COINCIDENCIAS DE EMPRESAS REGISTRADAS EN LA TABLA PAGOS CON LA TABLA PROPUESTA_ANALISIS\n")
                const fechaActual = new Date().toLocaleDateString("en-US")
                console.log("FECHA SGTE: " + fechaActual);
                const obj1 = JSON.parse(isFound.analisis_negocio1)
                const obj2 = JSON.parse(isFound.analisis_negocio2)
                const obj3 = JSON.parse(isFound.analisis_negocio3)

                if (obj1.fecha && obj2.estado == 0) {
                    console.log("COMPARACIÓN DE ANÁLISIS 1 PAGADO", obj1.fecha)
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
                    console.log("COMPARACIÓN DE ANÁLISIS 2 PAGADO")
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
                } else{
                    console.log("\nLA FECHA ACTUAL NO ES IGUAL A LA DEL PAGO\n")     
                }

            } else {
                console.log("\nALGUNAS EMPRESAS NO TIENEN PROPUESTA_ANALISIS\n") 
            }

        })
    }
    console.log("\n***************\nEJECUCIÓN CRON JOB FINALIZADA - PAGO ANÁLISIS\n***************\n");
}

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL CONSULTORES ADMIN
helpers.historial_consultores_admin = async () => {

    const consultores = await pool.query("SELECT * FROM consultores")

    let fecha = new Date().toLocaleDateString("en-CA");
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 12) : (mesActual = mesActual + 1);
    const mesAnterior = mesActual - 1
    const year = new Date().getFullYear();

    let filtroConsultores, num_consultores
    filtroConsultores = consultores.filter((item) => mesAnterior == item.mes && year == item.year);

    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    const mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);

    if (filtroConsultores.length > 0) {
        num_consultores = filtroConsultores.length;
        console.log("NUMERO DE CONSULTORES FILTRADOS >>>>>", num_consultores);

        // ==> ENVIANDO A LA TABLA HISTORIAL CONSULTORES FILTRADOS
        const datos_consultor_admin = { fecha, mes, num_consultores };
        await pool.query("INSERT INTO historial_consultores_admin SET ?", [datos_consultor_admin]);
        console.log("Realizando registro en DB HISTORIAL CONSULTORES ADMINISTRADOR....")
    } else {
        let numRepetido = await pool.query("SELECT * FROM historial_consultores_admin ORDER BY id DESC LIMIT 1");
        if (numRepetido.length == 0) {
            const datos_consultor_admin = { fecha, mes, num_consultores: '0' };
            await pool.query("INSERT INTO historial_consultores_admin SET ?", [datos_consultor_admin]);
            console.log("Realizando registro en DB HISTORIAL CONSULTORES ADMINISTRADOR....")
        } else {
            num_consultores = numRepetido[0].num_consultores
            // ==> ENVIANDO A LA TABLA HISTORIAL CONSULTORES DEL ADMIN FILTRADOS POR SEMANA Y AÑO 
            const datos_consultor_admin = { fecha, mes, num_consultores };
            await pool.query("INSERT INTO historial_consultores_admin SET ?", [datos_consultor_admin]);
            console.log("3");
        }
    }
    console.log("CRON JOB HISTORIAL DE CONSULTORES ADMIN FINALIZADO...");
    next();
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL EMPRESAS ADMIN
helpers.historial_empresas_admin = async () => {

    const empresas = await pool.query("SELECT * FROM empresas")

    let fecha = new Date().toLocaleDateString("en-CA");
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 12) : (mesActual = mesActual + 1);
    const mesAnterior = mesActual - 1
    const year = new Date().getFullYear();

    let filtroEmpresas, num_empresas
    filtroEmpresas = empresas.filter((item) => mesAnterior == item.mes && year == item.year);

    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    const mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);


    if (filtroEmpresas.length > 0) {
        num_empresas = filtroEmpresas.length;
        // ==> ENVIANDO A LA TABLA HISTORIAL EMPRESAS DEL ADMIN FILTRADOS POR MES Y AÑO 
        const datos_empresas_admin = { fecha, mes, num_empresas };
        await pool.query("INSERT INTO historial_empresas_admin SET ?", [datos_empresas_admin]);
        console.log("Realizando registro en DB HISTORIAL EMPRESAS ADMINISTRADOR....")
    } else {
        let numRepetido = await pool.query("SELECT * FROM historial_empresas_admin ORDER BY id DESC LIMIT 1");
        if (numRepetido.length == 0) {
            const datos_empresas_admin = { fecha, mes, num_empresas: '0' };
            await pool.query("INSERT INTO historial_empresas_admin SET ?", [datos_empresas_admin]);
            console.log("2");
        } else {
            num_empresas = numRepetido[0].num_empresas
            // ==> ENVIANDO A LA TABLA HISTORIAL EMPRESAS DEL ADMIN FILTRADOS POR MES Y AÑO 
            const datos_empresas_admin = { fecha, mes, num_empresas };
            await pool.query("INSERT INTO historial_empresas_admin SET ?", [datos_empresas_admin]);
            console.log("3");
        }
    }

    console.log("CRON JOB HISTORIAL DE EMPRESAS ADMIN FINALIZADO...");
    next();
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL INFORMES ADMIN
helpers.historial_informes_admin = async () => {

    const informes = await pool.query("SELECT * FROM informes")

    let fecha = new Date().toLocaleDateString("en-CA");
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 12) : (mesActual = mesActual + 1);
    const mesAnterior = mesActual - 1
    const year = new Date().getFullYear();

    let filtroInformes, num_informes
    filtroInformes = informes.filter((item) => mesAnterior == item.mes && year == item.year);

    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    const mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);

    if (filtroInformes.length > 0) {
        num_informes = filtroInformes.length;
        // ==> ENVIANDO A LA TABLA HISTORIAL INFORMES DEL ADMIN FILTRADOS POR MES Y AÑO 
        const datos_informes_admin = { fecha, mes, num_informes };
        await pool.query("INSERT INTO historial_informes_admin SET ?", [datos_informes_admin]);
        console.log("Realizando registro en DB HISTORIAL INFORMES ADMINISTRADOR....")
    } else {
        let numRepetido = await pool.query("SELECT * FROM historial_informes_admin ORDER BY id DESC LIMIT 1");
        if (numRepetido.length == 0) {
            const datos_informes_admin = { fecha, mes, num_informes: '0' };
            await pool.query("INSERT INTO historial_informes_admin SET ?", [datos_informes_admin]);
            console.log("2");
        } else {
            num_informes = numRepetido[0].num_informes
            // ==> ENVIANDO A LA TABLA HISTORIAL INFORMES DEL ADMIN FILTRADOS POR MES Y AÑO 
            const datos_informes_admin = { fecha, mes, num_informes };
            await pool.query("INSERT INTO historial_informes_admin SET ?", [datos_informes_admin]);
            console.log("3");
        }
    }

    console.log("CRON JOB HISTORIAL INFORMES ADMIN FINALIZADO..")
    next();
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL EMPRESAS CONSULTOR
helpers.historial_empresas_consultor = async () => {

    const empresas = await pool.query("SELECT * FROM empresas")
    const consultores = await pool.query("SELECT * FROM consultores")

    let fecha = new Date().toLocaleDateString("en-CA");
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 12) : (mesActual = mesActual + 1);
    const mesAnterior = mesActual - 1
    const year = new Date().getFullYear();

    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    const mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);
    let idConsultor = 0

    consultores.forEach(async (c) => {
        idConsultor = c.id_consultores;
        console.log("IDDDDD  idConsultor DDDD", idConsultor);

        let filtroEmpresas, num_empresas_asignadas = 0
        filtroEmpresas = empresas.filter((item) => item.consultor == c.id_consultores && mesAnterior == item.mes && year == item.year);

        if (filtroEmpresas.length > 0) {
            num_empresas_asignadas = filtroEmpresas.length;

            // ==> ENVIANDO A LA TABLA HISTORIAL EMPRESAS DEL CONSULTOR FILTRADOS POR MES Y AÑO 
            const datos_empresas_consultor = { fecha, mes, num_empresas_asignadas, idConsultor };
            await pool.query("INSERT INTO historial_empresas_consultor SET ?", [datos_empresas_consultor]);
            console.log("Realizando registro en DB HISTORIAL INFORMES CONSULTOR....")
            console.log("==--..>> (1) consultor");
        } else {
            // ==> ENVIANDO A LA TABLA HISTORIAL EMPRESAS DEL CONSULTOR FILTRADOS POR MES Y AÑO 
            datos_empresas_consultor = { fecha, mes, num_empresas_asignadas: 0, idConsultor };
            await pool.query("INSERT INTO historial_empresas_consultor SET ?", [datos_empresas_consultor]);
            console.log("==--..>> (2) consultor");
        }
    });

    console.log("HISTORIAL DE EMPRESAS CONSULTOR FINALIZADO...");
    next()
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL INFORMES CONSULTOR
helpers.historial_informes_consultor = async () => {

    const informes = await pool.query("SELECT * FROM informes")
    const consultores = await pool.query("SELECT * FROM consultores")

    let fecha = new Date().toLocaleDateString("en-CA");
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 12) : (mesActual = mesActual + 1);
    const mesAnterior = mesActual - 1
    const year = new Date().getFullYear();

    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    const mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);
    let idConsultor = 0

    consultores.forEach(async (c) => {
        idConsultor = c.id_consultores;

        let filtroInformes, num_informes = 0
        filtroInformes = informes.filter((item) => item.id_consultor == c.id_consultores && mesAnterior == item.mes && year == item.year);

        if (filtroInformes.length > 0) {

            num_informes = filtroInformes.length;

            // ==> ENVIANDO A LA TABLA HISTORIAL INFORMES DEL CONSULTOR FILTRADOS POR MES Y AÑO 
            const datos_informes_consultor = { fecha, mes, num_informes, idConsultor };
            await pool.query("INSERT INTO historial_informes_consultor SET ?", [datos_informes_consultor]);
            console.log("Realizando registro en DB HISTORIAL INFORMES CONSULTOR....")
            console.log("==--..>> (1) consultor");
        } else {
            // ==> ENVIANDO A LA TABLA HISTORIAL INFORMES DEL CONSULTOR FILTRADOS POR MES Y AÑO 
            datos_informes_consultor = { fecha, mes, num_informes: 0, idConsultor };
            await pool.query("INSERT INTO historial_informes_consultor SET ?", [datos_informes_consultor]);
            console.log("==--..>> (2) consultor");

        }
    });

    console.log("HISTORIAL DE INFORMES CONSULTOR FINALIZADO...");
    next();
};
/************************************************************************************************************** */


/** CONSULTAS MYSQL */
helpers.consultarInformes = async (empresa, nombreInforme) => {
    const informe = await pool.query(`SELECT * FROM informes WHERE id_empresa = ? AND nombre = ? `, [empresa, nombreInforme])
    return informe[0];
}

helpers.consultarTareas = async (empresa, fechaActual) => {
    const tareas = {};
    tareas.todas = await pool.query('SELECT * FROM plan_estrategico WHERE empresa = ? ORDER BY fecha_entrega ASC', [empresa])
    tareas.todas.forEach(x => {
        if (x.estado == 0) { 
            x.estado = 'Pendiente'; x.color = 'primary';
            x.tiempo = 'A tiempo'
            if (fechaActual > x.fecha_entrega) x.tiempo = 'Retrasada'
        }
        if (x.estado == 1) { 
            x.estado = 'En Proceso'; x.color = 'warning';
            x.tiempo = 'A tiempo'
            if (fechaActual > x.fecha_entrega) x.tiempo = 'Retrasada'
        }
        if (x.estado == 2) { x.estado = 'Completada'; x.color = 'success'; x.tareaOk = true; }
        const dateObj = new Date(x.fecha_entrega);
        const mes = dateObj.toLocaleString("es-US", { month: "short" });
        x.dia = dateObj.getDate()+1
        x.mes = mes.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
        if (x.dimension == 'Producto') x.icono = 'fa-box'
        if (x.dimension == 'Administración') x.icono = 'fa-user-tie'
        if (x.dimension == 'Operaciones') x.icono = 'fa-gear'
        if (x.dimension == 'Marketing') x.icono = 'fa-bullhorn'
    })
    tareas.pendientes = tareas.todas.filter(i => i.estado == 'Pendiente')
    tareas.pendientes.cant = tareas.pendientes.length;
    tareas.enProceso = tareas.todas.filter(i => i.estado == 'En Proceso')
    tareas.enProceso.cant = tareas.enProceso.length;
    tareas.completadas = tareas.todas.filter(i => i.estado == 'Completada')
    tareas.completadas.cant = tareas.completadas.length;
    return tareas;
}

helpers.consultarDatos = async (tabla, condicion = null) => {
    const data = await pool.query('SELECT * FROM '+ tabla)
    return data;
}

module.exports = helpers;