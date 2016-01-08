'use strict';
const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const multipart = require('multipart');
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
app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, '/public')));

const multipartMiddleware = multipart();
const middleware = require('./middleware');
const routes = require('./routes');

const router = express.Router();
router.get(
  '/divesites/:id/',
  routes.getDivesiteImages
);
router.get(
  '/users/:id/',
  routes.getUserImages
);
router.post(
  '/divesites/:id/set_header_image/',
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  middleware.checkDivesiteOwnership, // check that requesting user owns this (valid) divesite
  multipartMiddleware, // handle form data
  routes.setHeaderImage // set the divesite's header image
);
router.post(
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  '/set_profile_image/',
  middleware.checkValidImage,
  routes.setProfileImage
);
router.post(
  '/divesites/:id/',
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate,
  multipartMiddleware,
  middleware.checkValidImage,
  routes.uploadDivesiteImage
);
app.use('/', router);

const server = app.listen(process.env.PORT || 9001, () => {
  console.log('Listening on port %d', server.address().port);
});
