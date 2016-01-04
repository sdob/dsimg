const dotenv = require('dotenv');
const request = require('superagent');
const resolve = require('url').resolve;

dotenv.load();
const apiServer = process.env.API_SERVER;


function evaluateAuthorizationHeader(req, res, next) {
  const header = req.headers.authorization;
  // Evaluate the Authorization header 
  if (!header) {
    console.log('**** no auth header found');
    // Nothing to evaluate; respond with 401
    return res.status(401).json('No authorization header found');
  }
  const auth = header.split(' ');
  if (!auth || auth[0].toLowerCase() != 'token') {
    // Invalid header; respond with 401
    console.log(`**** invalid header (doesn't start with "token")`);
    return res.status(401).json('No authorization header found');
  }
  if (auth.length == 1) {
    // Invalid token header (no token provided); respond with 401
    console.log('**** invalid header (no token provided)');
    return res.status(401).json('Invalid token header. No credentials provided.');
  }
  if (auth.length > 2) {
    // Invalid token header (spaces in token); respond with 401
    console.log('**** invalid header (spaces in token)');
    return res.status(401).json('Invalid token header. Token string should not contain spaces.');
  }
  // If no error, then add the token to res.locals and call the next
  // middleware function
  res.locals.token = auth[1];
  return next();
}

function authenticate(req, res, next) {
  console.log('**** running authentication middleware');
  // Should have been inserted by evaluateAuthorizationHeader
  const token = res.locals.token;
  // Call the API server for the requesting user's profile
  const url = resolve(apiServer, `users/me/`);
  console.log(`**** contacting auth server at ${url}`);
  request.get(url)
  .set('Authorization', `Token ${token}`)
  .end((err, response) => {
    if (err) {
      // If the API server responds with an error, send it back to the client
      console.error('**** error');
      return res.status(err.status).send(err.error);
    }
    console.log('**** got profile');
    // If no error, then add the user ID to res.locals and
    // call the next middleware function
    const user = {
      id: response.body.id,
    };
    res.locals = { token, user };
    return next();
  });
}

function checkDivesiteOwnership(req, res, next) {
  console.log('**** checking ownership');
  // Call the API server for the requested divesite's data
  request.get(resolve(apiServer, `/divesites/${req.params.id}/`))
  .end((err, response) => {
    if (err) {
      // If the API server responds with an error, send it back to the client
      console.log('**** error with API server');
      return res.sendStatus(err.status);
    }
    // Check whether the requesting user is the owner of this divesite
    const isOwner = response.body.owner.id == res.locals.user.id;
    console.log(`**** owned by requesting user? ${isOwner}`);
    if (!isOwner) {
      // If the requesting user isn't the owner, then respond with 403
      return res.sendStatus(403);
    }
    // Call the next middleware function
    return next();
  });
}

module.exports = { authenticate, checkDivesiteOwnership, evaluateAuthorizationHeader };
