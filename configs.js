'use strict';

var path = require('path');

function list(name) {
  return (process.env[name] || '')
    .split(',')
    .map(function(value) { return value.trim(); })
    .filter(Boolean);
}

module.exports = {
  outputFolder: path.resolve(process.env.OUTPUT_FOLDER || path.join(__dirname, 'tmp')),
  fedexAccountNumbers: list('FEDEX_ACCOUNT_NUMBERS'),
  database: {
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'refund',
    decryptionKey: process.env.DB_DECRYPTION_KEY || ''
  },
  captchaApiUrl: process.env.CAPTCHA_API_URL || ''
};
