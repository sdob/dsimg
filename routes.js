'use strict';
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
//const cloudinary = require('cloudinary').v2;
const request = require('superagent');
const urlparse = require('url');

const API_URL = process.env.API_SERVER;
const DivesiteImage = require('./models/DivesiteImage');
const DivesiteHeaderImage = require('./models/DivesiteHeaderImage');
const ProfileImage = require('./models/ProfileImage');
const utils = require('./utils');

/* Requires that you invoke it as a function with a 'cloudinary' object.
 * This is so that we can trivially mock the external API.
 */
module.exports = (cloudinary) => {
  return {
    divesiteImage: {
      list: getDivesiteImages,
      delete: deleteDivesiteImage,
      create: uploadDivesiteImage,
    },
    divesiteHeaderImage: {
      create: setDivesiteHeaderImage,
      retrieve: retrieveDivesiteHeaderImage,
      delete: deleteDivesiteHeaderImage,
    },
    userProfileImage: {
      create: setUserProfileImage,
      retrieve: getUserProfileImage,
      delete: deleteUserProfileImage,
    },
    userImage: {
      list: getUserImages,
    },
  };

  /* Upload, retrieve a list of, and delete a divesite image */

  function getDivesiteImages(req, res) {
    // When retrieving divesites, we don't need to perform ID validation,
    // because we're relying on the upload route to validate that a divesite
    // exists.
    const divesiteID = req.params.id;
    DivesiteImage.find({ divesiteID })
    .then(
      (images) => {
        if (!images.length) {
          // Empty list from Mongo
          return res.status(HTTP.NOT_FOUND).json([]);
        }
        return res.json(images);
      },
      (err) => {
        // Return a generic HTTP 500
        res.status(HTTP.INTERNAL_SERVER_ERROR).json(err);
      });
  }

  function uploadDivesiteImage(req, res) {
    // These are set by earlier middleware functions
    const imageFile = req.files.image.path;
    const divesiteID = req.params.id;
    const ownerID = res.locals.user.id;
    // Check that the divesite ID is valid (requires DSAPI call)
    utils.getDivesite(divesiteID)
    // Upload the image
    .then(() => {
      return cloudinary.uploader.upload(imageFile);
    })
    // Save the JSON from Cloudinary along with the divesite and user ID
    .then((image) => {
      return DivesiteImage.create({ image, divesiteID, ownerID });
    })
    // Respond with the image data
    .then((image) => {
      return res.status(HTTP.CREATED).json(image);
    })
    // Catch errors and respond with them
    .catch((err) => res.status(err.status).json(err));
  }

  function deleteDivesiteImage(req, res) {
    // When deleting an image, we don't need to perform divesite ID validation;
    // we're relying on the uploader to validate that a divesite exists.
    // (This also allows us to delete divesite images *after* a divesite has
    // been removed from DSAPI.)
    const imageID = req.params.id;
    const userID = res.locals.user.id;
    let publicId;
    DivesiteImage.findOne({_id: imageID})
    .then((image) => {
      if (!image) {
        // We didn't find anything in the database
        return res.sendStatus(HTTP.NOT_FOUND);
      }
      if (image.ownerID != userID) {
        // The image exists, but the user making the request doesn't own it
        return res.sendStatus(HTTP.FORBIDDEN);
      } else {
        // The image exists, and the user owns it
        publicId = image.image.public_id;
        DivesiteImage.remove({_id: imageID})
        .then(() => cloudinary.uploader.destroy(publicId))
        .then((result) => {
          return res.status(HTTP.NO_CONTENT).json(result);
        });
      }
    });
  }

  /* Upload, retrieve and delete a divesite's header image */

  /* Get, set (destructively), and delete a user's profile image */

  function deleteUserProfileImage(req, res) {
    const userID = res.locals.user.id;
    let image;
    ProfileImage.findOne({ userID })
    .then((result) => {
      if (!result) {
        return res.sendStatus(HTTP.NOT_FOUND);
      }
      image = result.image;
      ProfileImage.findOneAndRemove({userID})
      .then(() => cloudinary.uploader.destroy(image.public_id))
      .then((result) => {
        return res.status(HTTP.NO_CONTENT).json(result);
      });
    });
  }

  function setUserProfileImage(req, res) {
    const id = res.locals.user.id;
    const imageFile = req.files.image.path;
    let uploadedImage;
    let oldProfileImageID;
    // Upload to Cloudinary
    cloudinary.uploader.upload(imageFile)
    // If successful, then remove any existing profile image and
    // insert this one into the database
    .then((image) => {
      if (image) {
        uploadedImage = image;
        // TODO: delete Cloudinary resource as well
        return ProfileImage.findOne({userID: id});
      }
    })
    .then((result) => {
      if (result) {
        let oldImageID = result.image.public_id;
        return cloudinary.uploader.destroy(oldImageID);
      }
    })
    .then(() => {
      return ProfileImage.findOneAndRemove({ userID: id });
    })
    .then(() => {
      return ProfileImage.create({userID: id, image: uploadedImage});
    })
    // Return the JSON in the response
    .then((result) => res.status(HTTP.OK).json(result))
    .catch((err) => {
      return res.status(HTTP.INTERNAL_SERVER_ERROR).json(err);
    });
  }

  function getUserProfileImage(req, res) {
    const userID = req.params.id;
    ProfileImage.findOne({userID})
    .then((image) => {
      if (!image) {
        return res.sendStatus(HTTP.NOT_FOUND);
      }
      return res.json(image);
    }, (err) => {
      return res.status(HTTP.INTERNAL_SERVER_ERROR).json(err);
    });
  }

  function getUserImages(req, res) {
    const userID = req.params.id;
    DivesiteImage.find({ ownerID: userID })
    .then(
      (images) => {
        return res.json(images);
      },
      (err) => {
        return res.status(HTTP.INTERNAL_SERVER_ERROR).json(err);
      });
  }

  function retrieveDivesiteHeaderImage(req, res) {
    const divesiteID = req.params.id;
    DivesiteHeaderImage.findOne({divesiteID})
    .then(
      (image) => {
        if (!image) {
          return res.sendStatus(HTTP.NOT_FOUND);
        }
        return res.json(image);
      },
      (err) => {
        return res.sendStatus(err.status);
      }
    );
  }


  function setDivesiteHeaderImage(req, res) {
    // req.files.image has already been checked by middleware
    const imageFile = req.files.image.path;
    const divesiteID = req.params.id;
    const userID = res.locals.user.id;
    const url = urlparse.resolve(API_URL, `/divesites/${req.params.id}/`);
    let uploadedImage;
    let oldHeaderImageID;
    // Validate this divesite's ID
    utils.getDivesite(divesiteID)
    .then(() => cloudinary.uploader.upload(imageFile)) // Upload the new image
    .then((image) => {
      if (image) {
        uploadedImage = image;
        return DivesiteHeaderImage.findOne({ divesiteID }); // Look for an existing image to replace
      }
    })
    .then((result) => {
      if (result) {
        // Remove the existing cloudinary image
        let oldImageID = result.image.public_id;
        return cloudinary.uploader.destroy(oldImageID);
      }
    })
    .then(() => DivesiteHeaderImage.findOneAndRemove({ divesiteID }))
    .then(() => {
      return DivesiteHeaderImage.create({
        image: uploadedImage,
        divesiteID,
        userID,
      });
    })
    .then((image) => res.status(HTTP.OK).json(image))
    .catch((err) => {
      // This is an error coming from utils.getDivesite;
      // just return it
      return res.status(err.status).json(err);
    });
  }

  function deleteDivesiteHeaderImage(req, res) {
    // res.locals.user should have been set and divesite ownership
    // should have been established by middleware
    const divesiteID = req.params.id;
    DivesiteHeaderImage.findOne({divesiteID})
    .then((result) => {
      // result *may* be null
      if (!result) {
        return res.sendStatus(HTTP.NOT_FOUND);
      }
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
};
