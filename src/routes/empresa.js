const express = require('express')
const router = express.Router()

const pool = require('../database')

router.get('/add', (req, res) => {
    // res.send("Hola desde Add Links")
    res.render('empresa/addEmpresa')
})

router.post('/add', async (req, res) => {
        let { nombre, apellido, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria } = req.body
        const redes_sociales = {
            twitter: twitter,
            facebook: facebook,
            instagram: instagram,
            otra: otra
        }
        const objetivos = {
            objetivo1: objetivo1,
            objetivo2: objetivo2,
            objetivo3: objetivo3,
        }
        const fortalezas = {
            fortaleza1: fortaleza1,
            fortaleza2: fortaleza2,
            fortaleza3: fortaleza3,
        }
        const problemas = {
            problema1: problema1,
            problema2: problema2,
            problema3: problema3,
        }
        // if (es_propietario == undefined) es_propietario = 'No'
        // if (socios == undefined) socios = 'No'
        es_propietario != undefined ? es_propietario : es_propietario = 'No'
        socios != undefined ? socios : 'No'

        const newFichaCliente = {
            nombre, apellido, email, telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria
        }
        console.log(newFichaCliente)
        await pool.query('INSERT INTO empresa SET ?', [newFichaCliente])
        res.send("Recibido desde Add Empresa")
    })

// Listar info del formulario llenado
router.get('/', async (req, res) =>{
    const empresa = await pool.query('SELECT * FROM empresa')
    console.log(empresa)
})

module.exports = router