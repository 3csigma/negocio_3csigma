const express = require('express')
const router = express.Router()

const pool = require('../database')

router.get('/empresa', (req, res) => {
    // res.send("Hola desde Add Links")
    res.render('empresa/addEmpresa')
})

router.post('/add', (req, res) => {
    res.send("Recibido desde Add Links")
    // res.render('links/add')
})

module.exports = router