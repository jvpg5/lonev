const basicAuth = require('express-basic-auth');
const config = require('../config/config');

module.exports = basicAuth({
  users: { [config.auth.username]: config.auth.password },
  challenge: true,
  realm: 'LONEV Obsidian Web Editor'
});
