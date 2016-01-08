'use strict';
const mongoose = require('mongoose');

const DivesiteImageSchema = mongoose.Schema({
  divesiteID: String,
  ownerID: String,
  image: {
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
  },
});

module.exports = mongoose.model('DivesiteImage', DivesiteImageSchema);
