const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
    res.send("Hola desde Login")
    // res.render('login')
})

module.exports = router;