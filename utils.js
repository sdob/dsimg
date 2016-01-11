const API_SERVER = process.env.API_SERVER;
const dotenv = require('dotenv');
const request = require('superagent');
const urlparse = require('url');

dotenv.load();

function apiRetrieve(prefix, id) {
  const url = urlparse.resolve(API_SERVER, `${prefix}/${id ? id + '/' : ''}`);
  // Wrap request in a Promise
  return new Promise((resolve, reject) => {
    request.get(url)
    .end((err, res) => {
      err ? reject(err) : resolve(res.body);
    });
  });
}

function generateMongoString() {
  const authCredentials = (
    process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD
  ) ? `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@` : ``;
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || 27017;
  const dbname = process.env.MONGODB_DBNAME || 'dev';
  return `mongodb://${authCredentials}${host}:${port}/${dbname}`;
}

function getDivesite(id) {
  return apiRetrieve('divesites', id);
}

function getUser(id) {
  return apiRetrieve('users', id);
}

function listDivesites() {
  return apiRetrieve('divesites');
}

module.exports = {
  generateMongoString,
  getDivesite,
  getUser,
  listDivesites,
};
