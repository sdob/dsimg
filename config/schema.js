const Schema = require('promised-jugglingdb').Schema;
const schema = new Schema('memory');
// const schema = new Schema('mongodb');

//const Photo = schema.define('Photo', {
schema.define ('Photo', {
  title: {type: String, length: 255},
  image: {type: JSON},
});
module.exports = schema;
