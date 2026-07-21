'use strict';

var assert = require('assert');
var fedexUtils = require('./fedexUtils');

assert.strictEqual(fedexUtils.validateTrackingNumber('123456789012'), '123456789012');
assert.throws(function() {
  fedexUtils.validateTrackingNumber('../not-a-tracking-number');
}, /10 to 30 digits/);

console.log('Local validation checks passed');
