
function sendResponse(res, { success, data = null, message = '', error = null, status = 200 }) {
  res.status(status).json({
    success,
    data,
    message,
    error
  });
}

module.exports = sendResponse;
