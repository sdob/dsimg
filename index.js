const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');
//const schema = require('./config/schema');

// Load environment variables
dotenv.load();
// Load Cloudinary lib
if (typeof(process.env.CLOUDINARY_URL) === 'undefined') {
  console.warn('!! cloudinary config is undefined');
} else {
  console.log('cloudinary config:');
  console.log(cloudinary.config());
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());

app.use(express.static(path.join(__dirname, '/public')));

wirePreRequest(app);
const photosController = require('./controllers/photos_controller');
photosController.wire(app);
wirePostRequest(app);

function wirePreRequest(app) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    res.locals.req = req;
    res.locals.res = res;
    if (typeof(process.env.CLOUDINARY_URL) === 'undefined') {
      throw new Error('Missing CLOUDINARY_URL environment variable');
    } else {
      res.locals.cloudinary = cloudinary;
      next();
    }
  });
}

function wirePostRequest(app) {
  app.use((err, req, res, next) => {
    if (err.message && (~err.message.indexOf('not found') || ~err.message.indexOf('Cast to ObjectId failed'))) {
      return next;
    }
    console.log(`error (500) ${err.message}`);
    console.log(err.stack);
    if (~err.message.indexOf('CLOUDINARY_URL')) {
      res.status(500).render('errors/dotenv', {error: err});
    } else {
      res.status(500).render('errors/500', {error: err});
    }
  });
}

const server = app.listen(process.env.PORT || 9001, () => {
  console.log('Listening on port %d', server.address().port);
});
