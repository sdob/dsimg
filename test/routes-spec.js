'use strict';
/* eslint-env jasmine */
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
const dotenv = require('dotenv');
const express = require('express');
const multipart = require('connect-multiparty');
const nock = require('nock');
const request = require('supertest');

const API_URL = process.env.DSAPI_URL;
const finish = require('./test-utils').finish;

const routes = require('../routes');
const getDivesiteImages = routes.getDivesiteImages;
const getUserImages = routes.getUserImages;
const setHeaderImage = require('../routes').setHeaderImage;
const setProfileImage = require('../routes').setProfileImage;
const uploadDivesiteImage = require('../routes').uploadDivesiteImage;

//const DivesiteImage = require('../schema').models.DivesiteImage;
const DivesiteImage = require('../DivesiteImage');
const mongoose = require('mongoose');

const multipartMiddleware = multipart();
const middleware = require('../middleware');

const validToken = '1234567890abcdefghij'; // 20-char token
const divesiteID = 20;

describe('Routes', () => {

  beforeAll((done) => {
    mongoose.connect('mongodb://localhost:27017/test', done);
  });

  afterAll((done) => {
    mongoose.disconnect(done);
  });

  const ALL = new RegExp('.*');
  let scope;

  beforeEach(() => {
    // Remove all nock interceptors
    nock.cleanAll();
    // Mock all POST requests to the Cloudinary server
    scope = nock('https://api.cloudinary.com/')
    .post(ALL, ALL).reply(HTTP.OK, {image: {url: 'http://example.com/example.jpg'}});
    // Mock API server
    nock(API_URL).patch(ALL, ALL).reply(HTTP.OK);
  });

  describe('setHeaderImage', () => {
    let app;
    beforeEach(() => {
      app = express();
      app.use((req, res, next) => {
        res.locals.token = validToken;
        next();
      });
      app.post('/:id', multipartMiddleware, middleware.checkValidImage, setHeaderImage);
    });

    it('should respond with 400 if no image is sent', (done) => {
      request(app).post('/:divesiteID')
      .expect(HTTP.BAD_REQUEST, finish(done));
    });

    it('should contact the Cloudinary server', (done) => {
      request(app).post('/' + divesiteID)
      .attach('image', './test/test.png', 'image')
      .expect(HTTP.OK)
      .end(finish(done));
    });

  });

  describe('setProfileImage', () => {
    let app;
    let scope;
    const user = 20;
    beforeEach(() => {
      app = express();
      app.use((req, res, next) => {
        res.locals.user = {id: 20};
        next();
      });
      app.post('/:id', multipartMiddleware, middleware.checkValidImage, setProfileImage);
    });

    it('should respond with 400 if no image is sent', (done) => {
      request(app).post('/' + user)
      .expect(HTTP.BAD_REQUEST, finish(done));
    });

    it('should contact the Cloudinary server', (done) => {
      request(app).post('/' + user)
      .attach('image', './test/test.png', 'image')
      .expect(HTTP.OK)
      .end(finish(done));
    });

  });

  describe('uploadDivesiteImage', () => {
    const divesiteID = 20;
    let app;
    beforeEach(() => {
      nock(API_URL).get(/divesites\/20/).reply(HTTP.OK);

      app = express();
      app.use((req, res, next) => {
        res.locals.user = {
          id: 20,
        };
        next();
      });
      app.post('/:id', multipartMiddleware, middleware.checkValidImage, uploadDivesiteImage);
    });
    afterEach(() => {
      nock.cleanAll();
    });

    it('should respond with 400 if no image is sent', (done) => {
      request(app).post(`/${divesiteID}/`)
      .expect(HTTP.BAD_REQUEST, finish(done));
    });

    it('should respond with 404 if the divesite ID is invalid', (done) => {
      request(app).post(`/${divesiteID+1}/`)
      .attach('image', './test/test.png', 'image')
      .expect(HTTP.NOT_FOUND, finish(done));
    });

    it('should contact the Cloudinary server', (done) => {
      request(app).post(`/${divesiteID}/`)
      .attach('image', './test/test.png', 'image')
      .expect(HTTP.CREATED, finish(done));
    });
  });

  describe('getDivesiteImages', () => {
    const ownerID = 10;
    const siteID = 20;
    let app;
    beforeEach((done) => {
      app = express();
      app.get('/divesites/:id', getDivesiteImages);
      nock(API_URL)
      .get(`/divesites/${siteID}/`)
      .reply(200, {
        id: siteID,
        owner: {
          id: ownerID,
        },
      });
      // Clear the DB and create some new DivesiteImages
      DivesiteImage.remove()
      .then(() => DivesiteImage.create({
        image: {public_id: `divesite_${siteID}`},
        divesiteID: siteID,
        ownerID,
      }))
      .then(() => DivesiteImage.create({
        image: {public_id: `divesite_${1 + siteID}`},
        divesiteID: 1 + siteID,
        ownerID,
      }))
      .then(done);
    });
    it('should respond with 404 if the divesite parameter is invalid', (done) => {
      request(app)
      .get(`/divesites/${1 + siteID}`)
      .expect(HTTP.NOT_FOUND, finish(done));
    });
    it('should respond with 200 and a list of the expected length if the divesite parameter is valid', (done) => {
      request(app)
      .get(`/divesites/${siteID}`)
      .expect(HTTP.OK)
      .end((err, res) => {
        expect(res.body.length).toBe(1);
        finish(done)(err);
      });
    });
    it('should return a list of objects with the expected key-value pairs', (done) => {
      request(app)
      .get(`/divesites/${siteID}`)
      .end((err, res) => {
        const img = res.body[0];
        expect(img).toBeDefined();
        expect(+img.ownerID).toEqual(ownerID);
        expect(+img.divesiteID).toEqual(divesiteID);
        finish(done)(err);
      });
    });
  });

  describe('getUserImages', () => {
    const divesiteID = 20;
    const id = 10;
    let app;
    beforeEach((done) => {
      app = express();
      app.get('/users/:id', getUserImages);
      nock(API_URL)
      .get(`/users/${id}/`)
      .reply(200, {
        id,
        date_joined: "2015-12-14T14:34:38.630Z",
        hours_underwater: 2.0,
        divesites_visited: 4,
        dives_in_last_365_days: 5,
        dives_in_last_90_days: 1,
        name: "Con Kiehn",
      });
      // Clear the DB and create some new DivesiteImages
      DivesiteImage.remove()
      .then(() => new DivesiteImage({
          image: {},
          divesiteID,
          ownerID: id,
        }).save())
      .then(() => new DivesiteImage({
          image: {},
          divesiteID,
          ownerID: 1 + id,
        }).save())
      .then(done);
    });

    it('should respond with 200 and a list of the expected length if the user ID is valid', (done) => {
      request(app)
      .get(`/users/${id}`)
      .expect(HTTP.OK)
      .end((err, res) => {
        expect(res.body.length).toBe(1);
        finish(done)(err);
      });
    });
  });
});
