const request = require('superagent');

const validToken = '1c3d1ab00b70cfbbaedb9f2ef4378d5dd2c8b3f5';
const authUrl = 'http://localhost:8000/api-token-check/';
const dsapiUrl = 'http://localhost:8000';

function authenticate(req, res, next) {
  console.log('**** running authentication middleware');
  // Get out quickly if no authorization header was sent
  if (!(req.headers.authorization && req.headers.userid)) {
    console.log('**** missing header');
    return res.sendStatus(401);
  }
  const token = req.headers.authorization;
  const user = req.headers.userid;
  res.locals = { token, user };
  // Hit the auth server
  console.log('**** contacting auth server');
  request.post(authUrl)
  .send({'token': token, 'user': req.headers.userid})
  .end((err, response) => {
    if (err) {
      console.error('**** error');
      return res.sendStatus(err.statusCode);
    }
    return next();
  });
}

function checkDivesiteOwnership(req, res, next) {
  console.log('**** checking ownership');
  request.get(`${dsapiUrl}/divesites/${req.params.id}/`)
  .end((err, response) => {
    if (err) {
      return res.sendStatus(err.status);
    }
    const isOwner = response.body.owner.id == res.locals.user;
    console.log(`**** owned by requesting user? ${isOwner}`);
    if (!isOwner) {
      return res.sendStatus(403);
    }
    return next();
  });
}

module.exports = { authenticate, checkDivesiteOwnership };
