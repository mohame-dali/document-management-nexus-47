
// Helper function to get token from model, create cookie and send response
exports.sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const cookieExpire = process.env.JWT_COOKIE_EXPIRE || 30; // Default to 30 days if not set
  const options = {
    expires: new Date(
      Date.now() + parseInt(cookieExpire) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Use secure cookies in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Set cookie and send response
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        departments: user.departments,
        activeDepartment: user.activeDepartment,
        photo: user.photo,
        isActive: user.isActive
      }
    });
};
