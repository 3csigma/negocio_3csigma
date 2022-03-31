const {format} = require('timeago.js')

const helpers = {}

//Comparar 2 parámetros en las vistas
helpers.comparar = (lvalue, operator, rvalue, options) => {
    let operators, result;

    if (arguments.length < 3) {
        throw new Error("Handlerbars Helper 'comparar' necesita 2 parámetros");
    }

    if (options === undefined) {
        options = rvalue;
        rvalue = operator;
        operator = "===";
    }

    operators = {
        '==': function (l, r) { return l == r; },
        '===': function (l, r) { return l === r; },
        '!=': function (l, r) { return l != r; },
        '!==': function (l, r) { return l !== r; },
        '<': function (l, r) { return l < r; },
        '>': function (l, r) { return l > r; },
        '<=': function (l, r) { return l <= r; },
        '>=': function (l, r) { return l >= r; },
        'typeof': function (l, r) { return typeof l == r; }
    };

    if (!operators[operator]) {
        throw new Error(`Handlerbars Helper 'comparar' no conoce al operador ${operator}`);
    }

    result = operators[operator](lvalue, rvalue);

    if (result) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }

},

module.exports = helpers