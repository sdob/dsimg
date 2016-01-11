'use strict';
const bodyParser = require('body-parser');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const multipart = require('connect-multiparty');
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

// Connect to MongoDB
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/dev');

const router = express.Router();
router.get(
  '/divesites/:id/',
  routes.getDivesiteImages
);
router.get(
  '/divesites/:id/header',
  routes.getDivesiteHeaderImage
);
router.get(
  '/users/:id/',
  routes.getUserImages
);
router.get(
  '/users/:id/profile',
  routes.getUserProfileImage
);
router.post(
  '/divesites/:id/header',
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  middleware.checkDivesiteOwnership, // check that requesting user owns this (valid) divesite
  multipartMiddleware, // handle form data
  routes.setHeaderImage // set the divesite's header image
);
router.delete(
  '/divesites/:id/header',
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate, // check that token maps to user
  middleware.checkDivesiteOwnership, // check that requesting user owns this (valid) divesite
  routes.deleteDivesiteHeaderImage
);
router.post(
  '/set_profile_image/',
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  multipartMiddleware,
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
router.delete(
  '/images/:id',
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate,
  routes.deleteDivesiteImage
);
app.use('/', router);

const server = app.listen(process.env.PORT || 9001, () => {
  console.log('Listening on port %d', server.address().port);
});
