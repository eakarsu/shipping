var express = require('express');
var router = express.Router();

var fedexUtils = require("../fedexUtils")
var dbTools = require("../dboTools");

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('Fundzilla is working!!!');
});

router.get('/update/user/:userid', async  function(req, res, next) {
    var userid = req.params.userid;
    let refundsRecord = dbTools.processOneUser(userid);
    res.json(refundsRecord);
});

router.get('/update/user', async  function(req, res, next) {
    var userid = req.params.userid;
    let refundsRecord = dbTools.processAllUsers();
    res.json(refundsRecord);
});

router.get('/check/tracknum/:tracknum', async  function(req, res, next) {
    var tracknum = req.params.tracknum;
    let refundsRecord = await fedexUtils.processOneTrackNum(tracknum);
    res.json(refundsRecord);
});

router.get('/toggle/tracknum/:tracknum', async  function(req, res, next) {
    var tracknum = req.params.tracknum;
    let refundsRecord = await fedexUtils.toggleRefundEligibility(tracknum);
    res.json({res:refundsRecord});
});

module.exports = router;
