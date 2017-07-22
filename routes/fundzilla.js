var express = require('express');
var router = express.Router();

var fedexUtils = require("../fedexUtils")
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('Fundzilla is working!!!');
});

router.get('/update/user/:userid', async  function(req, res, next) {
    var userid = req.params.userid;
    let refundsRecord = await fedexUtils.processOneUser(userid,"1907Fb1905Gs");
    res.json(refundsRecord);
});

module.exports = router;
