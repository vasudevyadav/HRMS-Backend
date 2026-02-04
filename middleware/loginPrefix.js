const loginPrefix = (role) => {
  return (req, res, next) => {
    // Middleware logic here, using the role parameter
    req.userRole = role; // Set any value or perform any logic needed
    next();
  };
};
module.exports = loginPrefix;
