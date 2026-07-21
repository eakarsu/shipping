'use strict';

var crypto = require('crypto');
var express = require('express');
var router = express.Router();
var fedexUtils = require('../fedexUtils');

function adminOnly(req, res, next) {
  var expected = process.env.SHIPPING_ADMIN_API_KEY || '';
  var supplied = req.get('x-admin-key') || '';

  if (expected.length < 32) {
    return res.status(503).json({ error: 'Admin API is not configured' });
  }

  var expectedHash = crypto.createHash('sha256').update(expected).digest();
  var suppliedHash = crypto.createHash('sha256').update(supplied).digest();
  if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function disabled(req, res) {
  res.status(501).json({
    error: 'Carrier and database automation is disabled',
    message: 'An owner-approved carrier API and data contract must be implemented first.'
  });
}

router.get('/', function(req, res) {
  res.json({ status: 'prototype', automation: 'disabled' });
});

router.post('/update/user/:userid', adminOnly, function(req, res) {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(req.params.userid)) {
    return res.status(400).json({ error: 'Invalid user identifier' });
  }
  disabled(req, res);
});

router.post('/update/all', adminOnly, disabled);

router.post('/check/tracknum', adminOnly, function(req, res) {
  try {
    fedexUtils.validateTrackingNumber(req.body && req.body.trackingNumber);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  disabled(req, res);
});

router.post('/toggle/tracknum', adminOnly, function(req, res) {
  try {
    fedexUtils.validateTrackingNumber(req.body && req.body.trackingNumber);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  disabled(req, res);
});

module.exports = router;
