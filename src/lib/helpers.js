const bcrypt = require('bcryptjs');
const pool = require('../database')
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const multer = require('multer');
const path = require('path');

const { sendEmail, proximoPagoPendienteHTML, tareasRetrasadasHTML } = require('../lib/mail.config')
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
helpers.uploadFiles = (preNombre, inputName, carpeta, fecha) => {
    const rutaAlmacen = multer.diskStorage({
        destination: (_req, file, cb) => {
            const ruta = path.join(__dirname, '../public/'+carpeta)
            cb(null, ruta);
        },
    
        filename: (_req, file, cb) => {
            let nomFile = preNombre + file.originalname;
            if (fecha) {
                const fechaActual = Math.floor(Date.now() / 1000)
                nomFile = preNombre + fechaActual + '_' + file.originalname;
            }
            cb(null, nomFile)
        }
    });
    let upload = multer({ storage: rutaAlmacen }).single('file')
    if (inputName) {
        upload = multer({ storage: rutaAlmacen }).array(inputName)
    }
    return upload;
}

/************************************************************************************************************** */
/*********************************** FUNCIONES PARA CRON JOB ****************************************************** */

// CAPTURAR MES ANTERIOR Y ABREVIATURA DEL MES ACTUAL (ej: Dic)
capturarMes = () => {
    let mesActual = new Date().getMonth();
    mesActual == 0 ? (mesActual = 1) : (mesActual = mesActual + 1);
    let mesAnterior = mesActual - 1
    mesAnterior == 0 ? mesAnterior = 12 : false;
    const f = new Date()
    f.setMonth(mesAnterior - 1);
    let txtMes = f.toLocaleDateString("es", { month: "short" })
    let mes = txtMes.charAt(0).toUpperCase() + txtMes.slice(1);

    return {mes, mesAnterior}

}

// ACTUALIZACIÓN AUTOMATICA DE PAGOS PARA ANÁLISIS DE NEGOCIO Y PLAN EMPRESARIAL
helpers.habilitar_siguientePago = async () => {
    
    const propuestas = await helpers.consultarDatos('propuestas')
    const pagos = await helpers.consultarDatos('pagos');
    const empresas = await helpers.consultarDatos('empresas')

    if (propuestas.length > 0) {
        // PROCESO PARA VALIDAR PAGO EN PROPUESTAS DE ANÁLISIS
        const propuestas_analisis = propuestas.filter(x => x.tipo_propuesta == 'Análisis de negocio')
        if (propuestas_analisis.length > 0) {
            propuestas_analisis.forEach(async (x) => {
                const isFound = pagos.find(p => p.id_empresa == x.empresa)
                if (isFound) {
                    console.log("\nHAY COINCIDENCIAS DE EMPRESAS REGISTRADAS EN LA TABLA PAGOS CON LA TABLA PROPUESTA_ANALISIS\n")
                    const fechaActual = new Date().toLocaleDateString("en-US")
                    console.log("FECHA ACTUAL(SGTE) PARA COMPARAR: " + fechaActual);
                    const obj1 = JSON.parse(isFound.analisis_negocio1)
                    const obj2 = JSON.parse(isFound.analisis_negocio2)
                    const obj3 = JSON.parse(isFound.analisis_negocio3)

                    const etapa = 'Análisis de negocio'; const link = 'analisis-de-negocio';
    
                    if (obj1.fecha && obj2.estado == 0) {
                        console.log("COMPARACIÓN DE ANÁLISIS 1ER PAGO", obj1.fecha)
                        let fechaDB = new Date(obj1.fecha)
                        fechaDB.setDate(fechaDB.getDate() + 30);
                        fechaDB = fechaDB.toLocaleDateString("en-US")
                        console.log("FECHA NUEVA DB => ", fechaDB);
    
                        if (fechaDB == fechaActual) {
                            console.log("\n--- LAS FECHAS SON IGUALES >> ANÁLISIS DE NEGOCIO");
                            const actualizar = {analisis_negocio2: JSON.stringify({estado: 1})}
                            const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])
    
                            if (estadoDB.affectedRows > 0) {
                                const empresa = empresas.find(i => i.id_empresas == x.empresa)
                                const email = empresa.email
                                const nombre_empresa = empresa.nombre_empresa
                                const texto = 'primera cuota de tu análisis de negocio en PAOM System, tu segundo'
                                
                                // Obtener la plantilla de Email
                                const template = proximoPagoPendienteHTML(nombre_empresa, texto, etapa, link);
                        
                                // Enviar Email
                                const resultEmail = await sendEmail(email, 'Tu segundo cobro de análisis de negocio está listo', template)
                    
                                if (resultEmail == false){
                                    console.log("Ocurrio un error inesperado al enviar el email del 2do Cobro de análisis de negocio")
                                } else {
                                    console.log("Email del 2do cobro ANÁLISIS DE NEGOCIO enviado satisfactoriamente")
                                }
                            }
                        }
                    } else if (obj2.fecha && obj3.estado == 0) {
                        console.log("COMPARACIÓN DE ANÁLISIS 2DO PAGO")
                        let fechaDB = new Date(obj2.fecha)
                        fechaDB.setDate(fechaDB.getDate() + 30);
                        fechaDB = fechaDB.toLocaleDateString("en-US")
                        console.log("FECHA NUEVA DB => ", fechaDB);
                        if (fechaDB == fechaActual) {
                            const actualizar = {analisis_negocio3: JSON.stringify({estado: 1})}
                            const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])
                            
                            if (estadoDB.affectedRows > 0) {
                                const empresa = empresas.find(i => i.id_empresas == x.empresa)
                                const email = empresa.email
                                const nombre_empresa = empresa.nombre_empresa
                                const texto = 'segunda cuota de tu análisis de negocio en PAOM System, tu tercer y último'
                                
                                // Obtener la plantilla de Email
                                const template = proximoPagoPendienteHTML(nombre_empresa, texto, etapa, link);
                        
                                // Enviar Email
                                const resultEmail = await sendEmail(email, 'Tu último cobro de análisis de negocio está listo', template)
                    
                                if (resultEmail == false){
                                    console.log("Ocurrio un error inesperado al enviar el email del último Cobro de análisis de negocio")
                                } else {
                                    console.log("Email del último cobro ANÁLISIS DE NEGOCIO  enviado satisfactoriamente")
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

        // PROCESO PARA VALIDAR PAGO EN PROPUESTAS DE PLAN EMPRESARIAL
        const propuestas_empresarial = propuestas.filter(x => x.tipo_propuesta == 'Proyecto de Consultoría')
        if (propuestas_empresarial.length > 0) {
            propuestas_empresarial.forEach(async (x) => {
                const isFound = pagos.find(p => p.id_empresa == x.empresa)
                if (isFound) {
                    console.log("\n--- HAY COINCIDENCIAS DE EMPRESAS REGISTRADAS EN LA TABLA PAGOS CON LA TABLA PROPUESTA_PLAN_EMPRESARIAL ---\n")
                    const fechaActual = new Date().toLocaleDateString("en-US")
                    console.log("FECHA ACTUAL(SGTE) PARA COMPARAR: " + fechaActual);
                    const obj1 = JSON.parse(isFound.empresarial1)
                    const obj2 = JSON.parse(isFound.empresarial2)
                    const obj3 = JSON.parse(isFound.empresarial3)

                    const etapa = 'Proyecto de Consultoría'; const link = 'proyecto-de-consultoría';
    
                    if (obj1.fecha && obj2.estado == 0) {
                        console.log("COMPARACIÓN DE PLAN EMPRESARIAL 1ER PAGO --", obj1.fecha)
                        let fechaDB = new Date(obj1.fecha)
                        fechaDB.setDate(fechaDB.getDate() + 30);
                        fechaDB = fechaDB.toLocaleDateString("en-US")
                        console.log("FECHA NUEVA DB => ", fechaDB);
    
                        if (fechaDB == fechaActual) {
                            const actualizar = {empresarial2: JSON.stringify({estado: 1})}
                            const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])
    
                            if (estadoDB.affectedRows > 0) {
                                const empresa = empresas.find(i => i.id_empresas == x.empresa)
                                const email = empresa.email
                                const nombre_empresa = empresa.nombre_empresa
                                const texto = 'primera cuota de tu Proyecto de consultoría en PAOM System, tu segundo'
                                
                                // Obtener la plantilla de Email
                                const template = proximoPagoPendienteHTML(nombre_empresa, texto, etapa, link);
                        
                                // Enviar Email
                                const resultEmail = await sendEmail(email, 'Tu segundo cobro de Proyecto de consultoría está listo', template)
                    
                                if (resultEmail == false) {
                                    console.log("Ocurrio un error inesperado al enviar el email del 2do Cobro de Proyecto de consultoría")
                                } else {
                                    console.log("Email del 2do cobro Proyecto de consultoría enviado satisfactoriamente")
                                }
                            }
                        }
                    } else if (obj2.fecha && obj3.estado == 0) {
                        console.log("COMPARACIÓN DE PLAN EMPRESARIAL 2DO PAGO -- ")
                        let fechaDB = new Date(obj2.fecha)
                        fechaDB.setDate(fechaDB.getDate() + 30);
                        fechaDB = fechaDB.toLocaleDateString("en-US")
                        console.log("FECHA NUEVA DB => ", fechaDB);
                        if (fechaDB == fechaActual) {
                            const actualizar = {empresarial3: JSON.stringify({estado: 1})}
                            const estadoDB = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, x.empresa])
                            
                            if (estadoDB.affectedRows > 0) {
                                const empresa = empresas.find(i => i.id_empresas == x.empresa)
                                const email = empresa.email
                                const nombre_empresa = empresa.nombre_empresa
                                const texto = 'segunda cuota de tu Proyecto de consultoría en PAOM System, tu tercer y último'
                                
                                // Obtener la plantilla de Email
                                const template = proximoPagoPendienteHTML(nombre_empresa, texto, etapa, link);
                        
                                // Enviar Email
                                const resultEmail = await sendEmail(email, 'Tu último cobro de Proyecto de consultoría está listo', template)
                    
                                if (resultEmail == false){
                                    console.log("Ocurrio un error inesperado al enviar el email del último Cobro de Proyecto de consultoría")
                                } else {
                                    console.log("Email del último cobro Proyecto de consultoría enviado satisfactoriamente")
                                }
                            }
                        }
                    } else{
                        console.log("\nLA FECHA ACTUAL NO ES IGUAL A LA DEL PAGO\n")     
                    }
    
                } else {
                    console.log("\nALGUNAS EMPRESAS NO TIENEN PROPUESTA_PLAN_EMPRESARIAL\n") 
                }
    
            })
        }
    }
    console.log("\n***************\nEJECUCIÓN CRON JOB FINALIZADA - PAGOS (ANÁLISIS & EMPRESARIAL) \n***************\n");
}

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL CONSULTORES ADMIN
helpers.historial_consultores_admin = async () => {
    const consultores = await helpers.consultarDatos('consultores')

    /** Proceso de Captura de Mes Actual & Anterior respecto a la Fecha */
    let fecha = new Date().toLocaleDateString("en-CA");
    const year = new Date().getFullYear();
    
    const objMes = capturarMes()
    const mesAnterior = objMes.mesAnterior;
    mesAnterior == 12 ? year = year - 1 : false
    const mes = objMes.mes;

    let filtroConsultores, num_consultores
    filtroConsultores = consultores.filter((item) => mesAnterior == item.mes && year == item.year);

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
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL EMPRESAS ADMIN
helpers.historial_empresas_admin = async () => {
    const empresas = await helpers.consultarDatos('empresas')
    /** Proceso de Captura de Mes Actual & Anterior respecto a la Fecha */
    let fecha = new Date().toLocaleDateString("en-CA");
    let year = new Date().getFullYear();
    
    const objMes = capturarMes()
    const mesAnterior = objMes.mesAnterior;
    mesAnterior == 12 ? year = year - 1 : false
    const mes = objMes.mes;

    let filtroEmpresas, num_empresas
    filtroEmpresas = empresas.filter((item) => mesAnterior == item.mes && year == item.year);

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
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL INFORMES ADMIN
helpers.historial_informes_admin = async () => {

    const informes = await helpers.consultarDatos('informes')

    /** Proceso de Captura de Mes Actual & Anterior respecto a la Fecha */
    let fecha = new Date().toLocaleDateString("en-CA");
    const year = new Date().getFullYear();
    
    const objMes = capturarMes()
    const mesAnterior = objMes.mesAnterior;
    mesAnterior == 12 ? year = year - 1 : false
    const mes = objMes.mes;
    
    let filtroInformes, num_informes
    filtroInformes = informes.filter((item) => mesAnterior == item.mes && year == item.year);
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
};

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL EMPRESAS CONSULTOR
helpers.historial_empresas_consultor = async () => {
    const empresas = await helpers.consultarDatos("empresas")
    const consultores = await helpers.consultarDatos("consultores")

      /** Proceso de Captura de Mes Actual & Anterior respecto a la Fecha */
    let fecha = new Date().toLocaleDateString("en-CA");
    const year = new Date().getFullYear();
    
    const objMes = capturarMes()
    const mesAnterior = objMes.mesAnterior;
    mesAnterior == 12 ? year = year - 1 : false
    const mes = objMes.mes;

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
};

/**************************************************************
 * CARGAR ARCHIVOS USUARIO EMPRESA (ANÁLISIS, EMPRESARIAL, ESTRATÉGICO)
*/
helpers.cargarArchivo = async () => {
    
}

// ===>>> INSERTAR DATOS A LA TABLA HISTORIAL INFORMES CONSULTOR
helpers.historial_informes_consultor = async () => {
    const informes = await helpers.consultarDatos("informes")
    const consultores = await helpers.consultarDatos("consultores")

     /** Proceso de Captura de Mes Actual & Anterior respecto a la Fecha */
    let fecha = new Date().toLocaleDateString("en-CA");
    const year = new Date().getFullYear();
    
    const objMes = capturarMes()
    const mesAnterior = objMes.mesAnterior;
    mesAnterior == 12 ? year = year - 1 : false
    const mes = objMes.mes;

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
};

// Consultar Tareas Retrasadas x Empresas y Enviar Email (PLAN ESTRATÉGICO)
helpers.consultar_tiempo_tareas = async () => {
    console.log("\n******************************************************");
    console.log("CRON JOB - CONSULTAR TAREAS RETRASADAS");
    console.log("******************************************************\n");
    let empresas = await helpers.consultarDatos('empresas')
    const allTask = await helpers.consultarDatos('tareas_plan_estrategico')
    empresas = empresas.filter(x => x.consultor != null)
    const tareasRetrasadas = allTask.filter(x => x.estado != 2)
    if (tareasRetrasadas.length > 0) {
        const fechaActual = new Date().toLocaleDateString('fr-CA')
        empresas.forEach(async e => {
            let numTareas = 0;
            const tareasEmpresa = tareasRetrasadas.filter(x => x.empresa == e.id_empresas && fechaActual > x.fecha_entrega)
            if (tareasEmpresa.length > 0) {
                numTareas = tareasEmpresa.length;
                const nombreEmpresa = e.nombre_empresa;
                const email = e.email;
                console.log("\nEmpresa >> " + nombreEmpresa + " -- Número de Tareas Retrasadas: " + numTareas)

                const asunto = '¡Tienes tareas atrasadas!';
                const template = tareasRetrasadasHTML(numTareas, nombreEmpresa);
                const resultEmail = await sendEmail(email, asunto, template)
                if (resultEmail == false) {
                    console.log("\n<<<<< Ocurrio un error inesperado al enviar el email Tareas retrasadas >>>> \n")
                } else {
                    console.log("\n<<<<< Se ha notificado al email (" + email + ") de la empresa el número de tareas retrasadas >>>>>\n")
                }
            }
        })
    } else {
        console.log("\nNO HAY EMPRESAS CON TAREAS RETRASADAS - PLAN ESTRATÉGICO DE NEGOCIO");
    }
    await console.log("\n******************************************************");
    await console.log("CONSULTAR TAREAS RETRASADAS - CRON JOB FINALIZADO...");
    await console.log("******************************************************");

}

/************************************************************************************************************** */
/********************************************** CONSULTAS MYSQL ***********************************************/
helpers.consultarInformes = async (empresa, nombreInforme) => {
    const informe = await pool.query(`SELECT * FROM informes WHERE id_empresa = ? AND nombre = ? `, [empresa, nombreInforme])
    return informe[0];
}

// CONSULTAR TAREAS DE PLAN EMPRESARIAL
helpers.consultarTareasEmpresarial = async (empresa, fechaActual) => {
    const tareas = await pool.query('SELECT * FROM tareas_plan_empresarial WHERE empresa = ? ORDER BY fecha_inicio ASC', [empresa])
    tareas.forEach(x => {
        //**** VALIDANDO ESTADOS *****
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
        x.responsable ? x.responsable : x.responsable = "N/A"

        //**** VALIDANDO PRIORIDADES *****
        if (x.prioridad == 0) {
            x.prioridad = 'Sin especificar'; x.background = "background: #585858"; x.fontSize = "font-size: 11px";
        } else if (x.prioridad == 1) {
            x.prioridad = 'Baja'; x.background = "background: #666666";
        } else if (x.prioridad == 2) {
            x.prioridad = 'Media'; x.background = "background: #454546;"
        } else if (x.prioridad == 3) {
            x.prioridad = 'Alta'; x.background = "background: #272727;"
        } else if (x.prioridad == 4) {
            x.prioridad = 'Crítica'; x.background = "background: #000000;"
        }

        const dateObj = new Date(x.fecha_entrega);
        const mes = dateObj.toLocaleString("es-US", { month: "short" });
        x.dia = dateObj.getDate()
        x.mes = mes.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());

        //  *** DIFERENCIA ENTRE LAS 2 FECHA  ****
        x.fechaini = new Date(x.fecha_inicio);
        x.fechaini = x.fechaini.getTime();
        x.fechaini = (((x.fechaini / 1000) / 60) / 60) / 24

        x.fechafin = new Date(x.fecha_entrega);
        x.fechafin = x.fechafin.getTime();
        x.fechafin = (((x.fechafin / 1000) / 60) / 60) / 24

        //  *** FECHA ACTUAL ****
        x.fecha_actual = new Date().getTime();
        x.fecha_actual = (((x.fecha_actual / 1000) / 60) / 60) / 24
        let plazo = x.fechafin - x.fechaini
        let diasCorridos = 0
        if ( x.fechaini > x.fecha_actual ) {diasCorridos }else {diasCorridos = x.fecha_actual - x.fechaini}
        diasCorridos = parseInt(diasCorridos)
        x.resultado = (diasCorridos * 100) / plazo
        if (x.resultado > 100) {x.resultado = 100}
    })

    tareas.pendientes = tareas.filter(i => i.estado == 'Pendiente')
    tareas.pendientes.cant = tareas.pendientes.length;
    tareas.enProceso = tareas.filter(i => i.estado == 'En Proceso')
    tareas.enProceso.cant = tareas.enProceso.length;
    tareas.completadas = tareas.filter(i => i.estado == 'Completada')
    tareas.completadas.cant = tareas.completadas.length;

    return tareas;
}

// (PLAN ESTRATÉGICO)
helpers.consultarTareas = async (empresa, fechaActual) => {
    const tareas = {};
    tareas.todas = await pool.query('SELECT * FROM tareas_plan_estrategico WHERE empresa = ? ORDER BY dimension ASC', [empresa])
    tareas.todas.forEach(x => {

        //**** VALIDANDO ESTADOS *****
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
        x.responsable ? x.responsable : x.responsable = "N/A"


        //**** VALIDANDO PRIORIDADES *****
        if (x.prioridad == 0) {
            x.prioridad = 'Sin especificar'; x.background = "background: #585858"; x.fontSize = "font-size: 11px";
        } else if (x.prioridad == 1) {
            x.prioridad = 'Baja'; x.background = "background: #666666";
        } else if (x.prioridad == 2) {
            x.prioridad = 'Media'; x.background = "background: #454546;"
        } else if (x.prioridad == 3) {
            x.prioridad = 'Alta'; x.background = "background: #272727;"
        } else if (x.prioridad == 4) {
            x.prioridad = 'Crítica'; x.background = "background: #000000;"
        }

        const dateObj = new Date(x.fecha_entrega);
        const mes = dateObj.toLocaleString("es-US", { month: "short" });
        x.dia = dateObj.getDate()
        x.mes = mes.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
        if (x.dimension == 'Producto') x.icono = 'fa-box'
        if (x.dimension == 'Administración') x.icono = 'fa-user-tie'
        if (x.dimension == 'Operaciones') x.icono = 'fa-gear'
        if (x.dimension == 'Marketing') x.icono = 'fa-bullhorn'

        //  *** DIFERENCIA ENTRE LAS 2 FECHA  ****
        x.fechaini = new Date(x.fecha_inicio);
        x.fechaini = x.fechaini.getTime();
        x.fechaini = (((x.fechaini / 1000) / 60) / 60) / 24

        x.fechafin = new Date(x.fecha_entrega);
        x.fechafin = x.fechafin.getTime();
        x.fechafin = (((x.fechafin / 1000) / 60) / 60) / 24

        //  *** FECHA ACTUAL ****
        x.fecha_actual = new Date().getTime();
        x.fecha_actual = (((x.fecha_actual / 1000) / 60) / 60) / 24
        let plazo = x.fechafin - x.fechaini
        let diasCorridos = 0
        if ( x.fechaini > x.fecha_actual ) {diasCorridos }else {diasCorridos = x.fecha_actual - x.fechaini}
        diasCorridos = parseInt(diasCorridos)
        x.resultado = (diasCorridos * 100) / plazo
        if (x.resultado > 100) {x.resultado = 100}
    })

    tareas.pendientes = tareas.todas.filter(i => i.estado == 'Pendiente')
    tareas.pendientes.cant = tareas.pendientes.length;
    tareas.enProceso = tareas.todas.filter(i => i.estado == 'En Proceso')
    tareas.enProceso.cant = tareas.enProceso.length;
    tareas.completadas = tareas.todas.filter(i => i.estado == 'Completada')
    tareas.completadas.cant = tareas.completadas.length;
    return tareas;
}

helpers.consultarDatos = async (tabla, extra = null) => {
    let data = await pool.query('SELECT * FROM '+ tabla)
    if (extra){
        data = await pool.query('SELECT * FROM '+ tabla + ' ' + extra)
    }
    return data;
}

helpers.insertarDatos = async (tabla, datos) => {
    return await pool.query(`INSERT INTO ${tabla} SET ?`, [datos]);
}

helpers.actualizarDatos = async (tabla, datos, extra) => {
    return await pool.query(`UPDATE ${tabla} SET ${datos} ${extra}`);
}

helpers.eliminarDatos = async (tabla, extra) => {
    return await pool.query(`DELETE FROM ${tabla} ${extra}`);
}

/******************************************************************** */
// FUNCIÓN MULTIPLE (PLAN ESTRATÉGICO)
helpers.tareasGenerales = async (empresa, fechaActual) => {
    const tareas = await helpers.consultarTareas(empresa, fechaActual)
    let d1 = tareas.todas.filter(i => i.dimension == 'Producto');
    let d2 = tareas.todas.filter(i => i.dimension == 'Administración');
    let d3 = tareas.todas.filter(i => i.dimension == 'Operaciones');
    let d4 = tareas.todas.filter(i => i.dimension == 'Marketing');

    const estado1 = d1.filter(x => x.estado == 'Completada'); 
    const estado2 = d2.filter(x => x.estado == 'Completada'); 
    const estado3 = d3.filter(x => x.estado == 'Completada'); 
    const estado4 = d4.filter(x => x.estado == 'Completada');
    d1 = d1.length; d2 = d2.length; d3 = d3.length; d4 = d4.length;
    
    const listo = [
        ((estado1.length*100)/d1).toFixed(1), 
        ((estado2.length*100)/d2).toFixed(1), 
        ((estado3.length*100)/d3).toFixed(1),
        ((estado4.length*100)/d4).toFixed(1),
    ]

    return { tareas, d1, d2, d3, d4, listo };
}

module.exports = helpers;