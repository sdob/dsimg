const HTTP = require('http-status-codes');
const cloudinary = require('cloudinary').v2;
const express = require('express');
const router = express.Router();
const multipart = require('connect-multiparty');
const request = require('superagent');
const urlparse = require('url');

const multipartMiddleware = multipart();
const middleware = require('./middleware');
const authenticate = middleware.authenticate;
const checkDivesiteOwnership = middleware.checkDivesiteOwnership;
const evaluateAuthorizationHeader = middleware.evaluateAuthorizationHeader;

const API_URL = process.env.DSAPI_URL;

router.post('/divesites/:id/set_header_image/', evaluateAuthorizationHeader, authenticate, checkDivesiteOwnership, multipartMiddleware, setHeaderImage);
router.post('/set_profile_image/', evaluateAuthorizationHeader, authenticate, multipartMiddleware, setProfileImage);
module.exports = router;

function setHeaderImage(req, res) {
  console.log('**** trying to set header image');
  if (!req.files.image) {
    return res.status(HTTP.BAD_REQUEST);
  }
  const imageFile = req.files.image.path;
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    console.log('**** photo uploaded; sending PATCH request to API server');
    const url = urlparse.resolve(API_URL, `/divesites/${req.params.id}/`);
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`) // Set authorization token
    .send({'header_image_url': image.url}) // Send image URL
    .end((err) => {
      if (err) {
        console.error('**** error in PATCH request');
        return res.sendStatus(err.status);
      }
      console.log('**** PATCH went OK');
      return res.status(HTTP.OK).json({url: image.url});
    });
  });
}

function setProfileImage(req, res) {
  const id = res.locals.user.id;
  console.log(`**** checking request with user ID ${id}`);
  //const id = res.locals.user;
  //console.log('user: ' + id);
  if (!(req.files && req.files.image)) {
    console.log('**** no image found');
    // TODO: include error message
    return res.sendStatus(HTTP.BAD_REQUEST);
  }
  const imageFile = req.files.image.path;
  console.log('**** uploading image to cloudinary');
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    console.log('**** photo uploaded; sending PATCH request to API server');
    const url = urlparse.resolve(API_URL, `/users/${id}/`);
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`)
    .send({'profile_image_url': image.url})
    .end((err) => {
      if (err) {
        console.error('**** error in PATCH request');
        return res.sendStatus(err.status);
      }
      console.log('PATCH went OK');
      return res.status(HTTP.OK).json({url: image.url});
    });
  });
}
