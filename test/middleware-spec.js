/* eslint-env jasmine */
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
const authenticate = require('../middleware').authenticate;
const checkDivesiteOwnership = require('../middleware').checkDivesiteOwnership;
const evaluateAuthorizationHeader = require('../middleware').evaluateAuthorizationHeader;
const dotenv = require('dotenv');
const express = require('express');
const nock = require('nock');
const request = require('supertest');

(function () {
  'use strict';
  dotenv.load();

  function finish(done) {
    return (err) => {
      if (err) done.fail(err);
      else done();
    };
  }

  describe('evaluateAuthorizationHeader()', () => {
    let app;
    const validToken = '1234567890abcdefghij'; // 20-char token
    beforeEach(() => {
      app = express();
      app.post('/', evaluateAuthorizationHeader, (req, res, next) => {
        return res.json({token: res.locals.token});
      });
    });
    it(`should respond with 401 with a missing authorization header`, (done) => {
      request(app).post('/')
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });
    it(`should respond with 401 if sent an empty authorization header`, (done) => {
      request(app).post('/')
      .set('Authorization', '')
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });
    it(`should respond with 401 if sent an invalid authorization header`, (done) => {
      request(app).post('/')
      .set('Authorization', 'Token')
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });
    it(`should respond with 401 if sent a malformed authorization header (missing space)`, (done) => {
      request(app).post('/')
      .set('Authorization', `Token${validToken}`)
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });
    it(`should respond with 401 if sent a malformed authorization header (token contains spaces)`, (done) => {
      const invalidToken = `${validToken.slice(0, 5)} ${validToken.slice(5)}`;
      request(app).post('/')
      .set('Authorization', `Token ${invalidToken}`)
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });
    it(`should return the token if everything is valid`, (done) => {
      request(app).post('/')
      .set('Authorization', `Token ${validToken}`)
      .expect(HTTP.OK)
      .expect({token: validToken}, finish(done));
    });
  });

  describe('authenticate()', () => {
    const user = 1;
    let app;
    const validToken = 'abcdefghij1234567890';

    beforeEach(() => {
      app = express();
      // Insert a valid-looking token (because we're bypassing evaluateAuthorizationHeader
      app.use((req, res, next) => {
        res.locals.token = validToken;
        next();
      });
      // If we get past the authentication middleware, respond with a simple
      // HTTP 200 and JSON objeect
      app.post('/set_header_image', authenticate, (req, res, next) => {
        res.status(HTTP.OK).json({'message': 'Authentication successful'});
      });
    });

    afterEach(() => {
      nock.cleanAll();
    });


    it('should call the authentication server', (done) => {
      nock(process.env.API_SERVER)
      .get('/users/me/')
      .reply(HTTP.OK);

      request(app)
      .post(`/set_header_image`)
      .set('Authorization', 'Token ${token}')
      .expect(HTTP.OK)
      .expect({'message': 'Authentication successful'}, finish(done));
    });

    it(`should return HTTP 401 if it receives it from the authentication server`, (done) => {
      nock(process.env.API_SERVER)
      .get('/users/me/')
      .reply(HTTP.UNAUTHORIZED);

      request(app, {
        auth: 'Token blah'
      })
      .post('/set_header_image')
      .set('Authorization', 'Token blah')
      .expect(HTTP.UNAUTHORIZED, finish(done));
    });

    it(`should pass on 5xx error status codes from the authentication server`, (done) => {
      nock(process.env.API_SERVER)
      .get('/users/me/')
      .reply(HTTP.INTERNAL_SERVER_ERROR);

      request(app)
      .post('/set_header_image')
      .set('Authorization', 'Token abcdefghij')
      .expect(HTTP.INTERNAL_SERVER_ERROR ,finish(done));
    });
  });

  describe('checkDivesiteOwnership()', () =>{
    let app;
    let divesiteID = 10;
    let userID = 1;
    const expectedUrl = 'http://example.com/foo.jpg';

    beforeEach(() => {
      app = express();
      app.use((req, res, next) => {
        res.locals.user = {
          id: userID,
        };
        next();
      });
      app.post('/set_header_image/:id', checkDivesiteOwnership, (req, res) => {
        return res.json({'url': expectedUrl});
      });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it(`should return 403 if the user doesn't own the divesite`, (done) => {
      nock(process.env.API_SERVER).get(`/divesites/${divesiteID}/`)
      .reply(200, {
        owner: {
          id: 1 + userID, // i.e., not the requesting user
        },
      });
      request(app).post(`/set_header_image/${divesiteID}`)
      .expect(HTTP.FORBIDDEN, finish(done));
    });

    it('should pass through if the user owns the divesite', (done) => {
      nock(process.env.API_SERVER).get(`/divesites/${divesiteID}/`)
      .reply(200, {
        owner: {
          id: userID,
        },
      });
      request(app).post(`/set_header_image/${divesiteID}`)
      .expect(HTTP.OK)
      .end((err, res) => {
        expect(res.body.url).toEqual(expectedUrl);
        finish(done)(err);
      });
    });
  });
})();
