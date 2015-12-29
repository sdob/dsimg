const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');

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

const routes = require('./routes');
app.use('/', routes);

const server = app.listen(process.env.PORT || 9001, () => {
  console.log('Listening on port %d', server.address().port);
});
