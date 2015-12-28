const HTTP = require('http-status-codes');
const cloudinary = require('cloudinary').v2;
const schema = require('../config/schema');
const Photo = schema.models.Photo;
const multipart = require('connect-multiparty');
const request = require('superagent');

const multipartMiddleware = multipart();
const middleware = require('../middleware/middleware');
const authenticate = middleware.authenticate;
const checkDivesiteOwnership = middleware.checkDivesiteOwnership;

const dsapiUrl = 'http://localhost:8000';

module.exports.wire = (app) => {
  app.get('/', index);
  app.post('/photos', authenticate, multipartMiddleware, create_through_server);
  app.post('/divesites/:id/header_image/', authenticate, checkDivesiteOwnership, multipartMiddleware, set_header_image);
};

function set_header_image(req, res) {
  console.log('**** trying to set header image');
  if (!req.files.image) {
    return res.status(HTTP.BAD_REQUEST);
  }
  const photo = new Photo(req.body);
  const imageFile = req.files.image.path;
  cloudinary.uploader.upload(imageFile)
  .then((image) => {
    console.log('**** file upload complete; saving');
    photo.image = image;
    return photo.save();
  })
  .then((photo) => {
    console.log('**** photo saved; sending PATCH request to API server');
    const url = `${dsapiUrl}/divesites/${req.params.id}/`;
    request.patch(url)
    .set('Authorization', `Token ${res.locals.token}`) // Set authorization token
    .send({'header_image_url': photo.image.url}) // Send image URL
    .end((err, response) => {
      if (err) {
        console.error('**** error in POSTing');
        console.log(err.response.error);
        return res.sendStatus(err.status);
      }
      console.log('**** POST went OK');
      return res.status(HTTP.OK).json({url: photo.image.url});
    });
  });
}

function create_through_server(req, res) {
  // Upload to server first, then to Cloudinary, adding upload metadata
  // to the photo model first
  console.log('**** creating through server');
  console.log(res.locals);
  console.log('**** **** image data?');
  console.log(!!req.files.image);
  const photo = new Photo(req.body);
  const imageFile = req.files.image.path;
  cloudinary.uploader.upload(imageFile, {tags: 'express_sample'})
  .then((image) => {
    console.log('** file uploaded to Cloudinary service');
    console.dir(image);
    photo.image = image;
    return photo.save();
  })
  .then((photo) => {
    console.log('** photo saved');
    res.status(HTTP.CREATED).json({'photo': photo}).end();
    //return photo;
  });
}

function index(req, res) {
  Photo.all().then((photos) => {
    console.log(photos);
    res.json(photos);
    //res.render('photos/index', {photos: photos});
  });
}
