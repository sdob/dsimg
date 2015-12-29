const express = require('express');
const router = express.Router();
const multipart = require('connect-multiparty');
const request = require('superagent');

const multipartMiddleware = multipart();
const middleware = require('./middleware');
const authenticate = middleware.authenticate;
const checkDivesiteOwnership = middleware.checkDivesiteOwnership;


router.post('/divesites/:id/header_image/', authenticate, checkDivesiteOwnership, multipartMiddleware, setHeaderImage);
module.exports = router;

function setHeaderImage(req, res) {
  const dsapiUrl = process.env.DSAPI_URL;
  console.log('**** trying to set header image');
  if (!req.files.image) {
    return res.status(HTTP.BAD_REQUEST);
  }
  const photo = new Photo(req.body);
  const imageFile = req.files.image.path;
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    console.log('**** photo uploaded; sending PATCH request to API server');
    const url = `${dsapiUrl}/divesites/${req.params.id}/`;
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`) // Set authorization token
    .send({'header_image_url': image.url}) // Send image URL
    .end((err, response) => {
      if (err) {
        console.error('**** error in POSTing');
        console.log(err.response.error);
        return res.sendStatus(err.status);
      }
      console.log('**** POST went OK');
      return res.status(HTTP.OK).json({url: image.url});
    });
  });
}
