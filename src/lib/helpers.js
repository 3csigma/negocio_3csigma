const bcrypt = require('bcryptjs');
const helpers = {}

helpers.encryptPass = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const claveCifrada = await bcrypt.hash(password, salt)
    return claveCifrada;
}

helpers.matchPass = async (password, passDB) => {
    try {
        await bcrypt.compare(password, passDB)
    } catch (error) {
        console.log(error)
    }
}

module.exports = helpers;