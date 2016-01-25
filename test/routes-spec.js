'use strict';
/* eslint-env jasmine */
const HTTP = require('http-status-codes');
const express = require('express');
const multipart = require('connect-multiparty');
const mongoose = require('mongoose');
const nock = require('nock');
const request = require('supertest');

const API_URL = process.env.API_SERVER;
const finish = require('./test-utils').finish;

const multipartMiddleware = multipart();
const middleware = require('../middleware');

const DivesiteImage = require('../models/DivesiteImage');
const DivesiteHeaderImage = require('../models/DivesiteHeaderImage');
const ProfileImage = require('../models/ProfileImage');

const paths = require('../paths');
  const ALL = new RegExp('.*');

const cloudinaryMock = {
  // Mock Cloudinary API
  uploader: {
    upload: (imageFile) => new Promise((resolve, reject) => {
      resolve({
        url: 'mock_url',
        public_id: 'mock_public_id',
        width: 42,
        height: 42,
        format: 'mock_format',
      });
    }),
    destroy: (public_id) => new Promise((resolve, reject) => {
      resolve({
        message: 'ok',
      });
    }),
  },
};
// Pass the mock Cloudinary API into the router
const routes = require('../routes')(cloudinaryMock);

describe('Routes', () => {

  beforeAll((done) => {
    mongoose.connect('mongodb://localhost:27017/test', done);
  });

  afterAll((done) => {
    mongoose.disconnect(done);
  });

  beforeEach((done) => {
    nock.cleanAll();
    DivesiteImage.remove()
    .then(() => DivesiteHeaderImage.remove())
    .then(() => ProfileImage.remove())
    .then(done);
  });

  describe('divesiteImage', () => {
    describe('create()', () => {
      const divesiteID = 20;
      const ownerID = 10;
      let app;
      beforeEach((done) => {
        nock(API_URL)
        .get(`/divesites/${divesiteID}/`)
        .reply(200, {
          id: divesiteID,
          owner: { id: ownerID },
        });
        app = express();
        app.use((req, res, next) => {
          // Add user ID to locals
          res.locals.user = { id: ownerID };
          next();
        });
        app.post('/divesites/:id', multipartMiddleware, middleware.checkValidImage, routes.divesiteImage.create);
        done();
      }); // beforeEach

      it('should respond with 400 if no image is sent', (done) => {
        request(app).post(`/divesites/${divesiteID}`)
        .expect(HTTP.BAD_REQUEST, finish(done));
      });

      it('should respond with 404 if the divesite ID is invalid', (done) => {
        request(app).post(`/divesites/${1+divesiteID}`)
        .attach('image', './test/test.png', 'image')
        .expect(HTTP.NOT_FOUND, finish(done));
      });

      it('should contact the Cloudinary server', (done) => {
        spyOn(cloudinaryMock.uploader, 'upload').and.callThrough();
        request(app).post(`/divesites/${divesiteID}/`)
        .attach('image', './test/test.png', 'image')
        .end((err, res) => {
          expect(cloudinaryMock.uploader.upload).toHaveBeenCalled();
          finish(done)(err);
        });
      });

      it('should create an image in the database', (done) => {
        request(app).post(`/divesites/${divesiteID}`)
        .attach('image', './test/test.png', 'image')
        .end((err, res) => {
          DivesiteImage.find({ divesiteID })
          .then((images) => {
            expect(images.length).toBe(1);
            finish(done)(err);
          });
        });
      });
    }); // uploadDivesiteImage()
    describe('get()', () => {
      const ownerID = 10;
      const divesiteID = 20;
      let app;
      beforeEach((done) => {
        // Mock dsapi
        nock(API_URL)
        .get(`/divesites/${divesiteID}/`)
        .reply(200, {
          id: divesiteID,
          owner: { id: ownerID },
        });

        // Set up server
        app = express();
        app.get('/divesites/:id', routes.divesiteImage.list);

        // Clear images then create a couple
        DivesiteImage.remove()
        .then(() => DivesiteImage.create({
          image: { public_id: `divesite_${divesiteID}` },
          divesiteID,
          ownerID,
        }))
        .then(() => DivesiteImage.create({
          image: { public_id: `divesite_${1 + divesiteID}` },
          divesiteID: 1 + divesiteID,
          owner: { id: ownerID },
        }))
        .then(done);
      }); // beforeEach

      afterEach((done) => {
        DivesiteImage.remove(done);
      });

      it('should respond with 404 if the divesite parameter is invalid', (done) => {
        request(app)
        .get(`/divesites/${2 + divesiteID}`) // Nothing here
        .expect(HTTP.NOT_FOUND, finish(done));
      });

      it('should respond with 200 and a list of the expected length if the divesite parameter is valid', (done) => {
        request(app)
        .get(`/divesites/${divesiteID}`)
        .expect(HTTP.OK)
        .end((err, res) => {
          expect(res.body.length).toBe(1);
          finish(done)(err);
        });
      });
    }); // getDivesiteImages()
    describe('delete()', () => {
      const divesiteID = 20;
      const ownerID = 10;
      let app;
      let myImageID;
      let otherImageID;
      beforeEach((done) => {
        nock(API_URL)
        .get(`/divesites/${divesiteID}/`)
        .reply(200, {
          id: divesiteID,
          owner: { id: ownerID },
        });
        app = express();
        app.use((req, res, next) => {
          // Add user ID to locals
          res.locals.user = { id: ownerID };
          next();
        });

        app.delete('/images/:id', routes.divesiteImage.delete);
        DivesiteImage.remove()
        .then(() => DivesiteImage.create({
          image: { public_id: `divesite_${divesiteID}` },
          divesiteID,
          ownerID,
        }))
        .then((image) => {
          myImageID = image._id;
        })
        .then(() => DivesiteImage.create({
          image: {public_id: `divesite_${1+divesiteID}`},
          divesiteID,
          ownerID: 1 + ownerID,
        }))
        .then((image) => {
          otherImageID = image._id;
        })
        .then(done);
      }); // beforeEach

      it('should return 204 if the user owns the image', (done) => {
        request(app)
        .delete(`/images/${myImageID}`)
        .expect(HTTP.NO_CONTENT)
        .end((err, res) => {
          finish(done)(err);
        });
      });

      it(`should respond with 403 if the user doesn't own the image`, (done) => {
        request(app)
        .delete(`/images/${otherImageID}`)
        .expect(HTTP.FORBIDDEN, finish(done));
      });

      it(`should respond with 404 if the image ID is invalid`, (done) => {
        const id = mongoose.Types.ObjectId();
        request(app)
        .delete(`/images/${id}`)
        .expect(HTTP.NOT_FOUND, finish(done));
      });

      it('should call the Cloudinary server', (done) => {
        spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
        request(app)
        .delete(`/images/${myImageID}`)
        .end((err, res) => {
          expect(cloudinaryMock.uploader.destroy).toHaveBeenCalled();
          finish(done)(err);
        });
      });
    }); // deleteDivesiteImage()
  });

  describe('divesiteHeaderImage', () => {
    const divesiteID = 10;
    const ownerID = 20;
    let app;
    describe('retrieve()', () => {
      beforeEach(() => {
        app = express();
        app.get('/divesites/:id/header', routes.divesiteHeaderImage.retrieve);
      });
      describe('with no header image in the database', () => {
        it('should respond with 404', (done) => {
          request(app)
          .get('/divesites/1/header')
          .expect(HTTP.NOT_FOUND, finish(done));
        });
      });
      describe('with a header image in the database', () => {
        beforeEach((done) => {
          DivesiteHeaderImage.create({
            divesiteID,
            ownerID,
          })
          .then(done);
        });
        it('should respond with 200', (done) => {
          request(app)
          .get(`/divesites/${divesiteID}/header`)
          .expect(HTTP.OK, finish(done));
        });
      });
    });
    describe('create()', () => {
      beforeEach(() => {
        app = express();
        app.use((req, res, next) => {
          res.locals.user = { id: ownerID };
          next();
        });
        app.post('/divesites/:id/header', multipartMiddleware, middleware.checkValidImage, routes.divesiteHeaderImage.create);
      });
      describe('with an invalid divesite ID', () => {
        beforeEach(() => {
          nock(API_URL)
          .get(ALL, ALL)
          .reply(HTTP.NOT_FOUND, {});
        });
        it('should respond with 404', (done) => {
          request(app)
          .post('/divesites/1/header')
          .attach('image', './test/test.png', 'image')
          .expect(HTTP.NOT_FOUND, finish(done));
        });
      });
      describe('with a valid divesite ID', () => {
        beforeEach(() => {
          nock(API_URL)
          .get(ALL, ALL)
          .reply(HTTP.OK, {});
        });
        describe('with no header image in the database', () => {
          it('should upload to Cloudinary', (done) => {
            spyOn(cloudinaryMock.uploader, 'upload').and.callThrough();
            request(app)
            .post('/divesites/1/header')
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              expect(cloudinaryMock.uploader.upload).toHaveBeenCalled();
              finish(done)(err);
            });
          });
          it(`shouldn't try to destroy anything in Cloudinary`, (done) => {
            spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
            request(app)
            .post('/divesites/1/header')
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              expect(cloudinaryMock.uploader.destroy).not.toHaveBeenCalled();
              finish(done)(err);
            });
          });
          it('should respond with 200', (done) => {
            request(app)
            .post('/divesites/${divesiteID}/header')
            .attach('image', './test/test.png', 'image')
            .expect(HTTP.OK, finish(done));
          });
          it('should create a divesite header image for this divesite', (done) => {
            request(app)
            .post(`/divesites/${divesiteID}/header`)
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              DivesiteHeaderImage.find({divesiteID})
              .then((result) => {
                expect(result.length).toBe(1);
                finish(done)(err);
              });
            });
          });
        });
        describe('with a header image in the database', () => {
          beforeEach((done) => {
            DivesiteHeaderImage.create({
              image: { public_id: 'mock_public_id' },
              ownerID,
              divesiteID,
            })
            .then(done);
          });
          it('should upload to Cloudinary', (done) => {
            spyOn(cloudinaryMock.uploader, 'upload').and.callThrough();
            request(app)
            .post(`/divesites/${divesiteID}/header`)
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              expect(cloudinaryMock.uploader.upload).toHaveBeenCalled();
              finish(done)(err);
            });
          });
          it('should destroy something in Cloudinary', (done) => {
            spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
            request(app)
            .post(`/divesites/${divesiteID}/header`)
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              expect(cloudinaryMock.uploader.destroy).toHaveBeenCalled();
              finish(done)(err);
            });
          });
          it(`should leave us with exactly one header image for this divesite`, (done) => {
            request(app)
            .post(`/divesites/${divesiteID}/header`)
            .attach('image', './test/test.png', 'image')
            .end((err, res) => {
              DivesiteHeaderImage.find({ divesiteID })
              .then((results) => {
                expect(results.length).toBe(1);
                finish(done)(err);
              });
            });
          });
        });
      });
    });
    describe('delete', () => {
      const ALL = new RegExp('.*');
      describe(`if the divesite doesn't exist`, () => {
        beforeEach(() => {
          nock.cleanAll();
          app = express();
          app.delete('/divesites/:id/header', routes.divesiteHeaderImage.delete);
        });
        it('should respond with 404', (done) => {
          request(app)
          .delete('/divesites/1/header')
          .expect(HTTP.NOT_FOUND, finish(done));
        });
      });
      describe('with no header image in the database', () => {
        it('should respond with 404', (done) => {
          request(app)
          .delete('/divesites/1/header')
          .expect(HTTP.NOT_FOUND, finish(done));
        });
      });
      describe('with a header image in the database', () => {
        beforeEach((done) => {
          DivesiteHeaderImage.create({
            image: { public_id: 'public_id' },
            divesiteID,
            ownerID,
          })
          .then(done);
        });
        it('should respond with 204', (done) => {
          request(app)
          .delete(`/divesites/${divesiteID}/header`)
          .expect(HTTP.NO_CONTENT, finish(done));
        });
        it('should delete an existing image in Cloudinary', (done) => {
          spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
          request(app)
          .delete(`/divesites/${divesiteID}/header`)
          .end((err, res) => {
            expect(cloudinaryMock.uploader.destroy).toHaveBeenCalled();
            finish(done)(err);
          });
        });
        it('should leave us with no header image for this divesite', (done) => {
          request(app)
          .delete(`/divesites/${divesiteID}/header`)
          .end((err, res) => {
            DivesiteHeaderImage.find({divesiteID})
            .then((result) => {
              expect(result.length).toBe(0);
              finish(done)(err);
            });
          });
        });
      });
    });
  });

  describe('userProfileImage', () => {
    describe('retrieve()', () => {
      const userID = 10;
      let app;
      beforeEach((done) => {
        app = express();
        app.get('/users/:id/profile', routes.userProfileImage.retrieve);
        ProfileImage.create({
          image: { public_id: 'mock_profile_public_id' },
          userID,
        })
        .then(done);
      });
      it(`should respond with 200 if there's an image in the database`, (done) => {
        request(app)
        .get(`/users/${userID}/profile`)
        .expect(HTTP.OK)
        .end((err, res) => {
          finish(done)(err);
        });
      });
      it(`should respond with 404 if there's no image in the database`, (done) => {
        request(app)
        .get(`/users/${1+userID}/profile`)
        .expect(HTTP.NOT_FOUND)
        .end((err, res) => {
          finish(done)(err);
        });
      });
    });
    describe('create()', () => {
      const userID = 10;
      let app;
      beforeEach((done) => {
        app = express();
        app.use((req, res, next) => {
          res.locals.user = { id: userID };
          next();
        });
        app.post('/profile_image', multipartMiddleware, middleware.checkValidImage, routes.userProfileImage.create);
        ProfileImage.remove(done);
      });
      describe(`when the user has no existing profile image`, () => {
        it(`should respond with HTTP 200`, (done) => {
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .expect(HTTP.OK, finish(done));
        });
        it(`should create a profile image for the user`, (done) => {
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            ProfileImage.findOne({ userID })
            .then((result) => {
              expect(result).not.toBe(null);
              finish(done)(err);
            });
          });
        });
        it(`should upload to the Cloudinary API`, (done) => {
          spyOn(cloudinaryMock.uploader, 'upload').and.callThrough();
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            expect(cloudinaryMock.uploader.upload).toHaveBeenCalled();
            finish(done)(err);
          });
        });
        it('should not destroy anything in Cloudinary', (done) => {
          spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            expect(cloudinaryMock.uploader.destroy).not.toHaveBeenCalled();
            finish(done)(err);
          });
        });
      });
      describe('when the user already has a profile image', () => {
        beforeEach((done) => {
          ProfileImage.remove({userID})
          .then(() => {
            ProfileImage.create({
              image: {
                public_id: 'mock_profile_public_id',
              },
              userID,
            });
          })
          .then(done);
        }); // beforeEach

        it(`should upload to the Cloudinary API`, (done) => {
          spyOn(cloudinaryMock.uploader, 'upload').and.callThrough();
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            expect(cloudinaryMock.uploader.upload).toHaveBeenCalled();
            finish(done)(err);
          });
        });

        it('should call the Cloudinary API to destroy the existing profile image', (done) => {
          spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            expect(cloudinaryMock.uploader.destroy).toHaveBeenCalled();
            finish(done)(err);
          });
        });

        it('should leave us with exactly one profile image for the user', (done) => {
          request(app)
          .post('/profile_image')
          .attach('image', './test/test.png', 'image')
          .end((err, res) => {
            ProfileImage.find({ userID })
            .then((result) => {
              expect(result).not.toBe(null);
              expect(result.length).toBe(1);
              finish(done)(err);
            });
          });
        });
      });
    }); // setUserProfileImage()
    describe('delete()', () => {
      const userID = 10;
      let app;
      beforeEach((done) => {
        app = express();
        app.use((req, res, next) => {
          res.locals.user = { id: userID };
          next();
        });
        app.delete('/profile_image', routes.userProfileImage.delete);
        ProfileImage.remove()
        .then(() => ProfileImage.create({
          image: {
            public_id: 'mock_profile_public_id',
          },
          userID,
        }))
        .then(done);
      });
      describe('with no profile image in the database', () => {
        beforeEach((done) => {
          ProfileImage.remove(done);
        });
        it('should respond with 404', (done) => {
          request(app)
          .delete('/profile_image')
          .expect(HTTP.NOT_FOUND, finish(done));
        });
      });
      describe('with a profile image in the database', () => {
        it('should respond with 204', (done) => {
          request(app)
          .delete('/profile_image')
          .expect(HTTP.NO_CONTENT, finish(done));
        });
        it('should call the Cloudinary server', (done) => {
          spyOn(cloudinaryMock.uploader, 'destroy').and.callThrough();
          request(app)
          .delete('/profile_image')
          .end((err, res) => {
            expect(cloudinaryMock.uploader.destroy).toHaveBeenCalled();
            finish(done)(err);
          });
        });
        it('should delete the profile image', (done) => {
          request(app)
          .delete('/profile_image')
          .end((err, res) => {
            ProfileImage.find({userID})
            .then((result) => {
              expect(result.length).toBe(0);
              finish(done)(err);
            });
          });
        });
      });
    }); // deleteUserProfileImage
  });

});
