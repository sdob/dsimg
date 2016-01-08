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
  /*
  // Try to retrieve a Divesite object from the API server
  const url = urlparse.resolve(API_SERVER, `/divesites/${id}/`);
  //console.log(`**** calling ${url}`);
  return new Promise((resolve, reject) => {
    request
    .get(url)
    .end((err, res) => {
      //console.log('**** something came back....');
      err ? reject(err) : resolve(res.body);
    });
  });
  */
}

function getUser(id) {
  return apiRetrieve('users', id);
  // Try to retrieve a User object from the API server
  /*
  const url = urlparse.resolve(API_SERVER, `/users/${id}/`);
  return new Promise((resolve, reject) => {
    request
    .get(url)
    .end((err, res) => {
      err ? reject(err) : resolve(res.body);
    });
  });
  */
}

function listDivesites() {
  return apiRetrieve('divesites');
}

module.exports = {
  getDivesite,
  getUser,
  listDivesites,
};
