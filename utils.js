const API_SERVER = process.env.API_SERVER;
const request = require('superagent');
const urlparse = require('url');

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
  getDivesite,
  getUser,
  listDivesites,
};
