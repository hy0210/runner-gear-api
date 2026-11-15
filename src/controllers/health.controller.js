const { sendSuccess } = require('../utils/response');

function getHealth(_req, res) {
  sendSuccess(res, { message: 'ok' });
}

module.exports = { getHealth };
