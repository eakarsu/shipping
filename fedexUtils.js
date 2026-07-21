'use strict';

function validateTrackingNumber(value) {
  if (typeof value !== 'string' || !/^\d{10,30}$/.test(value)) {
    var error = new Error('Tracking number must contain 10 to 30 digits');
    error.status = 400;
    throw error;
  }
  return value;
}

function integrationDisabled() {
  var error = new Error('Carrier automation is disabled pending an approved API contract');
  error.status = 501;
  throw error;
}

// The historical scraper, CAPTCHA solver, unsafe archive extraction, and raw SQL
// mutation paths are intentionally not part of the supported local boundary.
module.exports = {
  validateTrackingNumber: validateTrackingNumber,
  processOneTrackNum: async function(value) {
    validateTrackingNumber(value);
    return integrationDisabled();
  },
  toggleRefundEligibility: async function(value) {
    validateTrackingNumber(value);
    return integrationDisabled();
  },
  processOneUser: async function() { return integrationDisabled(); },
  obtainCaptcha: async function() { return integrationDisabled(); }
};
