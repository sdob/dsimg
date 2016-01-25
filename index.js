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
const utils = require('./utils');

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
const routes = require('./routes')(cloudinary); // we need to pass in the cloudinary object

// Connect to MongoDB
const mongoose = require('mongoose');
const mongoString = utils.generateMongoString();
mongoose.connect(mongoString);

const paths = require('./paths');

const router = express.Router();

/* 
 * DivesiteImage routes
 */

// Retrieve divesite images
router.get(
  paths.divesiteImage.list,
  routes.divesiteImage.list
);

// Add divesite image
router.post(
  paths.divesiteImage.create,
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate,
  multipartMiddleware,
  middleware.checkValidImage,
  routes.divesiteImage.create
);

// Delete divesite image
router.delete(
  paths.divesiteImage.delete,
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate,
  routes.divesiteImage.delete
);

/*
 * DivesiteHeaderImage routes
 */

// Retrieve divesite header image
router.get(
  paths.divesiteHeaderImage.retrieve,
  routes.divesiteHeaderImage.retrieve
);

// Create/update divesite header image
router.post(
  paths.divesiteHeaderImage.create,
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  middleware.checkDivesiteOwnership, // check that requesting user owns this (valid) divesite
  multipartMiddleware, // handle form data
  routes.divesiteHeaderImage.create
);

// Delete divesite header image
router.delete(
  paths.divesiteHeaderImage.delete,
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate, // check that token maps to user
  middleware.checkDivesiteOwnership, // check that requesting user owns this (valid) divesite
  routes.divesiteHeaderImage.delete
);

/* 
 * User image routes
 */
router.get(
  paths.userImage.list,
  routes.userImage.list
);

/* 
 * User profile image routes 
 */

// Retrieve user profile image
router.get(
  paths.userProfileImage.retrieve,
  routes.userProfileImage.retrieve
);

// Create/update user profile image
router.post(
  paths.userProfileImage.create,
  middleware.evaluateAuthorizationHeader, // check for valid 'Authorization' header in request
  middleware.authenticate, // check that token maps to user
  multipartMiddleware,
  middleware.checkValidImage,
  routes.userProfileImage.create
  //routes.setProfileImage
);

// Delete user profile image
router.delete(
  paths.userProfileImage.delete,
  middleware.evaluateAuthorizationHeader,
  middleware.authenticate,
  routes.userProfileImage.delete
);

app.use('/', router);

const server = app.listen(process.env.PORT || 9001, () => {
  console.log('Listening on port %d', server.address().port);
});
