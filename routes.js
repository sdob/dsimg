'use strict';
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
const cloudinary = require('cloudinary').v2;
const request = require('superagent');
const urlparse = require('url');

const API_URL = process.env.DSAPI_URL;
const DivesiteImage = require('./models/DivesiteImage');
const DivesiteHeaderImage = require('./models/DivesiteHeaderImage');
const ProfileImage = require('./models/ProfileImage');
const utils = require('./utils');

function deleteDivesiteImage(req, res) {
  const imageID = req.params.id;
  const userID = res.locals.user.id;
  DivesiteImage.findOne({_id: imageID})
  .then((image) => {
    if (!image) {
      return res.sendStatus(HTTP.NOT_FOUND);
    }
    if (image.ownerID != userID) {
      console.log('**** not allowed');
      return res.sendStatus(HTTP.FORBIDDEN);
    } else {
      DivesiteImage.remove({_id: imageID})
      .then(() => {
        return res.sendStatus(HTTP.NO_CONTENT);
      });
    }
  });
}

function getDivesiteImages(req, res) {
  const divesiteID = req.params.id;
  utils.getDivesite(divesiteID)
  .then((divesite) => DivesiteImage.find({ divesiteID }))
  .then((images) => res.json(images))
  .catch((err) => res.status(err.status).json(err));
}


function getUserImages(req, res) {
  const userID = req.params.id;
  utils.getUser(userID)
  .then((user) => DivesiteImage.find({ ownerID: userID }))
  .then((images) => res.json(images))
  .catch((err) => res.status(err.status).json(err));
}


function getUserProfileImage(req, res) {
  const userID = req.params.id;
  utils.getUser(userID)
  .then((user) => {
    return ProfileImage.findOne({userID: user.id});
  })
  .then((image) => {
    console.log(image);
    return res.json(image);
  })
  .catch((err) => res.status(err.status).json(err));
}


function getDivesiteHeaderImage(req, res) {
  const divesiteID = req.params.id;
  utils.getDivesite(divesiteID)
  .then((divesite) => {
    return DivesiteHeaderImage.findOne({divesiteID});
  })
  .then((image) => {
    return res.json(image);
  })
  .catch((err) => res.json(err));
}


function setHeaderImage(req, res) {
  // req.files.image has already been checked by middleware
  const imageFile = req.files.image.path;
  const divesiteID = req.params.id;
  const userID = res.locals.user.id;
  const url = urlparse.resolve(API_URL, `/divesites/${req.params.id}/`);
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    return DivesiteHeaderImage.create({
      image,
      divesiteID,
      userID,
    });
  })
  .then((image) => res.json(image))
  .catch((err) => {
    throw new Error(err);
  });
}


function setProfileImage(req, res) {
  const id = res.locals.user.id;
  const imageFile = req.files.image.path;
  let uploadedImage;
  // Upload to Cloudinary
  cloudinary.uploader.upload(imageFile)
  // If successful, then remove any existing profile image and
  // insert this one into the database
  .then((image) => {
    uploadedImage = image;
    // TODO: delete Cloudinary resource as well
    return ProfileImage.find({userID: id}).remove();
  })
  .then(() => {
    return ProfileImage.create({userID: id, image: uploadedImage});
  })
  // Return the JSON in the response
  .then(() => res.status(HTTP.OK).json({image: imageFile}))
  .catch((err) => res.json(err));
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
  // Save the JSON from Cloudinary along with the divesite and user ID
  .then((image) => DivesiteImage.create({ image, divesiteID, ownerID }))
  // Respond with the image data
  .then((image) => res.status(HTTP.CREATED).json(image))
  // Catch errors and respond with them
  .catch((err) => res.status(err.status).json(err));
}


function deleteDivesiteHeaderImage(req, res) {
  // res.locals.user should have been set and divesite ownership
  // should have been established by middleware
  const divesiteID = req.params.id;
  console.log('**** deleting');
  DivesiteHeaderImage.findOne({divesiteID})
  .then((result) => {
    console.log(result);
    // result *may* be null
    if (result && result.image && result.image.public_id) {
      return cloudinary.uploader.destroy(result.image.public_id);
    }
  })
  .then(() => {
    return DivesiteHeaderImage.find({divesiteID}).remove();
  })
  .then(() => {
    return res.sendStatus(HTTP.NO_CONTENT);
  })
  .then((undefined, err) => {
    throw new Error(err);
  });
}


module.exports = {
  deleteDivesiteImage,
  deleteDivesiteHeaderImage,
  getDivesiteImages,
  getDivesiteHeaderImage,
  getUserImages,
  getUserProfileImage,
  setHeaderImage,
  setProfileImage,
  uploadDivesiteImage,
};
