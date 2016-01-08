'use strict';
const mongoose = require('mongoose');

const ProfileImageSchema = mongoose.Schema({
  userID: String,
  image: {
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
  },
});

module.exports = mongoose.model('ProfileImage', ProfileImageSchema);
