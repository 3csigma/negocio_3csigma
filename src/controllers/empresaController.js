const pool = require('../database')
const empresaController = exports;

empresaController.acuerdo = async (req, res) => {
    res.render('empresa/acuerdoConfidencial', {wizarx: false, dashx: true, tipoUser: 'User', noPago: true, itemActivo: 2 })
}

empresaController.fichaCliente = async (req, res) => {
    const empresa = await pool.query('SELECT * FROM empresa')
    // const ficha = await pool.query('SELECT * FROM empresa WHERE id = ?', [id])
    res.render('/empresa/addFicha', { empresa, wizarx: true, dashx: false })
}

empresaController.add = async (req, res) => {
    let { nombre, apellido, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria } = req.body
    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })
    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    user_id = 2;
    const newFichaCliente = {
        nombre, apellido, email, telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, user_id
    }

    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    console.log(newFichaCliente)
    await pool.query('INSERT INTO empresa SET ?', [newFichaCliente])
    res.redirect('/')
}

empresaController.editar = async (req, res) => {
    const { id } = req.params
    const ficha = await pool.query('SELECT * FROM empresa WHERE id = ?', [id])
    res.render('/empresa/addFicha', {ficha: ficha[0]})
}

empresaController.actualizado = async (req, res) => {
    const { id } = req.params
    const updateFicha = {}
    await pool.query('UPDATE empresa SET ? id = ?', [updateFicha, id])
    res.render('/empresa/addFicha', {ficha: ficha[0]})
}

