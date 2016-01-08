'use strict';
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
const cloudinary = require('cloudinary').v2;
const request = require('superagent');
const urlparse = require('url');

const API_URL = process.env.DSAPI_URL;
const DivesiteImage = require('./schema').models.DivesiteImage;
const utils = require('./utils');

function getDivesiteImages(req, res) {
  const divesiteID = req.params.id;
  //console.log(`**** Looking for images for ${siteID}`);
  utils.getDivesite(divesiteID)
  .then((divesite) => DivesiteImage.all({where: { divesiteID }}))
  .then((images) => res.json(images))
  .catch((err) => res.status(err.status).json(err));
}


function getUserImages(req, res) {
  const userID = req.params.id;
  utils.getUser(userID)
  .then((user) => DivesiteImage.all({where: { ownerID: userID }}))
  .then((images) => res.json(images))
  .catch((err) => res.status(err.status).json(err));
}


function setHeaderImage(req, res) {
  // req.files.image has already been checked by middleware
  const imageFile = req.files.image.path;
  const url = urlparse.resolve(API_URL, `/divesites/${req.params.id}/`);
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    //console.log('**** photo uploaded; sending PATCH request to API server');
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`) // Set authorization token
    .send({'header_image_url': image.url}) // Send image URL
    .end((err) => {
      if (err) {
        console.error('**** error in PATCH request');
        return res.status(err.status).json(err);
      }
      //console.log('**** PATCH went OK');
      return res.status(HTTP.OK).json({url: image.url});
    });
  });
}


function setProfileImage(req, res) {
  const id = res.locals.user.id;
  const imageFile = req.files.image.path;
  //console.log('**** uploading image to cloudinary');
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    //console.log('**** photo uploaded; sending PATCH request to API server');
    const url = urlparse.resolve(API_URL, `/users/${id}/`);
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`)
    .send({'profile_image_url': image.url})
    .end((err) => {
      if (err) {
        console.error('**** error in PATCH request');
        return res.sendStatus(err.status);
      }
      //console.log('PATCH went OK');
      return res.status(HTTP.OK).json({url: image.url});
    });
  });
}


function uploadDivesiteImage(req, res) {
  // These are set by earlier middleware functions
  const imageFile = req.files.image.path;
  const divesiteID = req.params.id;
  const ownerID = res.locals.user.id;
  // Check that the divesite ID is valid
  utils.getDivesite(divesiteID)
  // Upload the image
  .then(() => cloudinary.uploader.upload(imageFile))
  // Save the JSON from Cloudinary along with the divesite
  // and user ID
  .then((image) => {
    new DivesiteImage({
      image,
      divesiteID,
      ownerID,
    }).save();
  })
  // Respond with the image data
  .then((image) => res.status(HTTP.CREATED).json(image))
  // Catch errors and respond with them
  .catch((err) => res.status(err.status).json(err));
}


module.exports = {
  getDivesiteImages,
  getUserImages,
  setHeaderImage,
  setProfileImage,
  uploadDivesiteImage,
};
