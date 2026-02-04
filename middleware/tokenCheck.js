// const models = require('../model');
const { userTokens } = require('../model');
const User = require('../model/user');

const dbService = require('../utils/dbService');

const tokenCheck = () => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization.replace('Bearer ', '') || null;

      if (!token) {
        return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
      }
      let userAuth = await dbService.findOne(userTokens, { token: token, });
      if (!userAuth) {
        return res.unAuthorized({ message: 'Invalid token' });
      }

      const lastData = await User.findOne({ _id: userAuth.userId },);

      if (!lastData) {
        return res.failure({ message: 'Invalid user' });
      }
      req['user-data'] = lastData;
      next();
    } catch (error) {
      return res.internalServerError({ message: error });
    }
  };
};
module.exports = tokenCheck;
