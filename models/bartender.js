const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

const bartenderSchema = new Schema({
  username: { type: String,
    required: "Username is Required",
    unique: true },
  password: { type: String,
    required: "Password is Required",
    validate: [
      function(input) {
        return input.length >= 6;
      },
    "Password needs to be at least 6 characters long"
  ] },
  classicsMastered: { type: Boolean, default: false },
  //object to contain {name: "drinkName", timesMade: 1}
  inProgress: [Object],
  //hashtable to store drink name as the key, and boolean for mastery
  //[{type: Schema.Types.Mixed, default: {}}]
  //object to contain {name: "drinkName", timesMade: 1}
  drinksMastered: [Object]
});

bartenderSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);

      // hash the password using our new salt
      bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) return next(err);

          // override the cleartext password with the hashed one
          user.password = hash;
          next();
      });
  });
});

bartenderSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
  });
};

const Bartender = mongoose.model("Bartender", bartenderSchema);

module.exports = Bartender;
