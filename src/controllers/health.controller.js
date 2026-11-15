function getHealth(_req, res) {
  res.status(200).json({ status: 'success', data: { message: 'ok' } });
}

module.exports = { getHealth };
