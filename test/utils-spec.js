'use strict';
/* eslint-env jasmine */
/* eslint no-unused-vars:0 */
const HTTP = require('http-status-codes');
const authenticate = require('../middleware').authenticate;
const dotenv = require('dotenv');
const express = require('express');
const nock = require('nock');
const request = require('supertest');

dotenv.load();

const API_SERVER = process.env.API_SERVER;
const utils = require('../utils');

const finish = require('./test-utils').finish;

describe('Utility functions', () => {
  const ownerID = 10;
  const validSiteID = 20;

  let app;

  beforeEach(() => {
    nock.cleanAll();
    nock(API_SERVER)
    .get(`/divesites/${validSiteID}/`)
    .reply(200, {
      id: validSiteID,
      owner: {
        id: ownerID,
      },
      depth: 39.0,
      duration: 38.0,
    });
  });

  describe('getDivesite(id)', () => {

    it('should contact the API server', (done) => {
      utils.getDivesite(validSiteID)
      .then((divesite) => {
        expect(divesite.id).toEqual(validSiteID);
        expect(divesite.owner.id).toEqual(ownerID);
        done();
      })
      .catch((err) => {
        done.fail(err);
      });
    });

    it('should respond with 4xx errors from the API server', (done) => {
      utils.getDivesite(1 + validSiteID)
      .then((response) => {
        console.log(response);
        done();
      })
      .catch((err) => {
        expect(err.status).toBe(HTTP.NOT_FOUND);
        done(err);
      });
    });
  });

  describe('listDivesites()', () => {

  });

  describe('getUser(id)', () => {
    const id = ownerID;
    const date_joined = "2015-12-14T14:34:38.630Z";
    const hours_underwater = 2.0;
    const divesites_visited = 4;
    const name = 'Con Kiehn';
    beforeEach(() => {
      nock.cleanAll();
      nock(API_SERVER)
      .get(`/users/${ownerID}/`)
      .reply(200, {
        id,
        date_joined,
        hours_underwater,
        divesites_visited,
        name,
      });
      app = express();
      app.get('/users/:id', (req, res) => {
        utils.getUser(req.params.id)
        .then((user) => res.json(user))
        .catch((err) => res.status(err.status).json(err));
      });
    });

    it('should contact the API server and respond with a user profile object', (done) => {
      request(app)
      .get(`/users/${id}`)
      .expect(HTTP.OK)
      .end((err, res) => {
        const data = res.body;
        expect(data).toBeDefined();
        expect(data.id).toEqual(id);
        expect(data.date_joined).toEqual(date_joined);
        expect(data.hours_underwater).toEqual(hours_underwater);
        expect(data.divesites_visited).toEqual(divesites_visited);
        expect(data.name).toEqual(name);
        finish(done)(err);
      });
    });

    it('should respond with a 404 if the user ID is invalid', (done) => {
      request(app)
      .get(`/users/${1 + id}`)
      .expect(HTTP.NOT_FOUND, finish(done));
    });
  });

});
