'use strict';
const mongoose = require('mongoose');

const DivesiteHeaderImageSchema = mongoose.Schema({
  createdAt: {type: Date, default: Date.now },
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

module.exports = mongoose.model('DivesiteHeaderImage', DivesiteHeaderImageSchema);
