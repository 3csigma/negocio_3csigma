const express = require('express');
const session = require('express-session')
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const bodyParser = require('body-parser')
const passport = require('passport')
const path = require('path');

// Inicializaciones
const app = express();
require('./lib/passport')

// Configuraciones
app.set('port', process.env.PORT || 4000);

app.set('views', __dirname + '/views');
app.engine('.hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: require('./lib/handlebars')
}));
app.set('view engine', 'hbs');

// app.set('trust proxy', 1) // Proxy de confianza

/******* Middlewares *******/
app.use(morgan('dev'))
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
// parse application/json
app.use(bodyParser.json())
app.use(session({
  secret: 'secret_3csigma',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))
app.use(passport.initialize());
app.use(passport.session()); // Inicio de sesiones persistentes

/******** Variables Globales ********/
app.use((req, res, next) => {
  // app.locals.success = req.flash('success');
  app.locals.user = req.user; //Variable de sesión de usuario
  next();
})

// Carpeta de archivos publicos
app.use(express.static(path.join(__dirname, 'public')))

// Rutas
app.use(require('./routes'));
app.use(require('./routes/empresa'));
app.use(require('./routes/authentication'));

app.listen(app.get('port'), () => {
  // console.log(path.join(__dirname, 'public'))
  console.log('Servidor corriendo in http://localhost:'+app.get('port'));
});