const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
// const bodyParser = require('body-parser');
const path = require('path');

// Inicialización
const app = express();

// Configuraciones
app.set('port', process.env.PORT || 4000);

app.set('views', __dirname + '/views');
app.engine('.hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: require('./lib/handlebars')
}));
app.set('view engine', 'hbs');

/******* Middlewares *******/
app.use(morgan('dev'))

app.use(express.urlencoded({extended: true}));
app.use(express.json());

/******** Variables Globales ********/
app.use((req, res, next) => {
  next();
})

// Carpeta de archivos publicos
app.use(express.static(path.join(__dirname, 'public')))

// Rutas
// app.use(require('./routes'));
// app.use(require('./routes/authentication'));
app.use('/', require('./routes/empresa'));

app.listen(app.get('port'), () => {
  // console.log(path.join(__dirname, 'public'))
  console.log('Servidor corriendo in http://localhost:'+app.get('port'));
});