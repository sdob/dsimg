'use strict';
const mongoose = require('mongoose');

const SlipwayImageSchema = mongoose.Schema({
  createdAt: {type: Date, default: Date.now },
  slipwayID: String,
  ownerID: String,
  image: {
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
  },
});

module.exports = mongoose.model('SlipwayImage', SlipwayImageSchema);
