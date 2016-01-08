const Schema = require('promised-jugglingdb').Schema;
const schema = new Schema('memory');

schema.define('DivesiteImage', {
  image: { type: JSON }, // Cloudinary image data
  divesiteID: { type: String, length: 255 }, // Divesite ID (supplied by API server)
  ownerID: { type: String, length: 255 }, // Owning User ID (supplied by API server)
});

module.exports = schema;
