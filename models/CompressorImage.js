'use strict';
const mongoose = require('mongoose');

const CompressorImageSchema = mongoose.Schema({
  createdAt: {type: Date, default: Date.now },
  compressorID: String,
  ownerID: String,
  image: {
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
  },
});

module.exports = mongoose.model('CompressorImage', CompressorImageSchema);
