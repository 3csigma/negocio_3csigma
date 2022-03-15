const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("Hola App")
    // res.render('login')
})

module.exports = router;