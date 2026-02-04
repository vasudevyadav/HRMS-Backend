/**
 * @description : exports authentication strategy for admin using passport.js
 * @params {Object} passport : passport object for authentication
 * @return {callback} : returns callback to be used in middleware
 */

const {
  Strategy, ExtractJwt 
} = require('passport-jwt');
const { JWT } = require('../constants/authConstant');
const User = require('../model/user');

const userPassportStrategy = (passport) => {
  const options = {};
  options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  options.secretOrKey = JWT.USER_SECRET;
  passport.use(
    'user-rule',
    new Strategy(options, async (payload, done) => {
      try {
        const result = await User.findOne({ _id: payload.id });
        if (result) {
          return done(null, result.toJSON());
        }
        return done('No User Found', {});
      } catch (error) {
        return done(error, {});
      }
    })
  );
};

module.exports = { userPassportStrategy };
