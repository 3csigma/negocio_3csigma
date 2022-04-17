const express = require('express');
const session = require('express-session')
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const bodyParser = require('body-parser')
const passport = require('passport')
const path = require('path');
const csrf = require('csurf')
const flash = require('connect-flash')
const cookieParser = require('cookie-parser');
const MemoryStore = require('memorystore')(session);

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

app.set('trust proxy', 1) // Proxy de confianza

/******* Middlewares *******/
app.use(morgan('dev'))
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
// parse application/json
app.use(bodyParser.json())
app.use(cookieParser())
app.use(session({
  secret: 'secretNegocio_3CSigma',
  name: '3C-launcher-session',
  cookie: { maxAge: 180 * 60000 },
  saveUninitialized: true,
  resave: true,
  cookie: { secure: false },
  store: new MemoryStore({
    checkPeriod: 86400000 // eliminar las entradas caducadas cada 24 horas
  })
}))
app.use(flash())
app.use(passport.initialize());
app.use(passport.session()); // Inicio de sesiones persistentes
app.use(csrf()) //Protección contra los ataques csrf

// No almacenar caché
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

/******** Variables Globales ********/
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.message = req.flash('message');
  res.locals.user = req.user; //Variable de usuario
  res.locals.csrfToken = req.csrfToken();
  res.locals.AuthTokenApi = req.AuthTokenApi;
  res.locals.session = req.session;
  next();
})

// global.quitarBloqueo = false;

// Carpeta de archivos publicos
app.use(express.static(path.join(__dirname, 'public')))

// Rutas
app.use(require('./routes'));
app.use(require('./routes/empresa'));
app.use(require('./routes/authentication'));

app.listen(app.get('port'), () => {
  console.log('CORRIENDO DESDE http://localhost:'+app.get('port'));
});