'use strict';
var querystring = require("querystring");
var fs = require("fs");
var formidable = require("formidable");
var http = require('http');
var request = require('request');
var util = require("util");
var express = require('express'); // bring in the the express api
var fs = require('fs'); // bring in the file system api
var url = require('url');
var cheerio = require('cheerio');
var util = require('util');
var rp = require('request-promise');
var Promise = require("bluebird");
var jp = require('jsonpath');
var extract = require('extract-zip')
var csvparse =  require('csv-parse/lib/sync');
let captchaUri = "http://api.dbcapi.me/api/captcha";

var fedexURL = "https://www.fedex.com/fcl/logon.do";
let fedexDownloadUrl = "https://www.fedex.com/reporting/DownloadPage.do";
let fedexDownloadPrepareUrl = "https://www.fedex.com/reporting/StandardReports.do?action=create&standardreporttype=217";
let fedexTrackingDetails = "https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}";
let fedexTrackPostCall = "https://www.fedex.com/trackingCal/track";
let fedexClaimUrl = "https://www.fedex.com/servlet/InvoiceServlet";
let fedexClaimForm = "https://www.fedex.com/servlet/InvoiceServlet?link=2&jsp_name=adjustment&orig_country=US&language=english";

https://www.fedex.com/servlet/InvoiceServlet?link=2&jsp_name=adjustment&orig_country=US&language=english

var loginform = {
    "appName": "fclfsm",
    "locale": "us_en",
    "step3URL": "https%3A%2F%2Fwww.fedex.com%2Fship%2FshipEntryAction.do?method=doRegistration%26locale=en_us%26urlparams=us%26sType=F%26action=fsmregister",
    "afterwardsURL": "https%3A%2F%2Fwww.fedex.com%2Fship%2FshipEntryAction.do?method=doEntry%26locale=en_us%26urlparams=us%26sType=F",
    "returnurl": "https%3A%2F%2Fwww.fedex.com%2Fship%2FshipEntryAction.do?method=doEntry%26locale=en_us%26urlparams=us%26sType=F",
    "fclqrs": "",
    "programIndicator": "",
    "invitationError": "",
    "addressType": "",
    "fromLoginPage": "yes",
    "cc_lang": "us",
    "curl": "",
    "surl": "",
    "registrationType": "logon",
    "lsession": "",
    "ssoguest": "n",
    "steps": "2",
    "username": "userName",
    "password": "userPaswd",
    "startpage": "FSM",
    "remusrid": "on",
    "login": ""
};

let downloadform = {
    "reportrequest":"",
    "showonetime":"null",
    "moverType":"listMover",
    "action":"generate",
    "preaction":"create",
    "freeTextEntryRequired":"false",
    "availAcctsExceededDispLimitFlag":"false",
    "reportName":"",
    "standardReport":"217",
    "reportBaseType":"payer",
    "accountType":"standardfedexaccounts",
    "selectedAccountNumbers":["235101130","721459721"],
    "selectedFilterColumn":"Show All",
    "filterValueForSelectedColumn":"",
    "StartWeek":"Start week",
    "EndWeek":"End week",
    "StartMonth":"Start month",
    "EndMonth":"End month",
    "reportOccurrence":"onetime",
    "onetime_reportview":"weekly",
    "onetimestarting_month":"4",
    "onetimestarting_year":"2017",
    "reportDateStart":"4/23/2017",
    "onetimeending_month":"4",
    "onetimeending_year":"2017",
    "reportDateEnd":"4/29/2017"
}

let csvDownload = {
    "pivotTableHtml":"",
    "type" :"CSV",
    "riID":"5065426"
}

let oneTrackReq = {"TrackPackagesRequest":{"appType":"WTRK","appDeviceType":"DESKTOP","uniqueKey":"","processingParameters":{},
    "trackingInfoList":[
        {"trackNumberInfo":{"trackingNumber":"{trackingNumber}","trackingQualifier":"","trackingCarrier":""}}
        ]
}};

let trackPostFrom = {
    "data":"",
    "action":"trackpackages",
    "locale":"en_US",
    "version":"1",
    "format":"json"
}

let tnums = ["778757646882", "778717233042", "778693875651", "778536741217", "778526583375",
    "778490702328", "777995990030", "777995960760", "777995930080"];

let cookiesCache = {};

processOneUser ("mtahardware1","","721459721");

//processClaimForm ("642755709303","155723013","E");

function processOneUser (userName,userPassword)
{
  /*
    let loginPromise = fedexLogin(userName,userPassword);
    let newDownloadForm = prepareDownloadInputJson();
    let promise2 = downloadDocument (loginPromise,newDownloadForm);
    let promise3 = unzipReport(promise2);
    let trackNumbersPromise =    collectTrackNumbers (promise3);
    */
    let trackNumbersPromise = Promise.try(function(){
        return tnums;
    });
    let truckNumPromises = processAllTrackingNums(trackNumbersPromise);
    Promise.all(truckNumPromises).then (result =>{
        console.log ("processed all:"+JSON.stringify(result));
        let refunds = result.filter(x=>x && x.isRefundEligible);
        console.log (`Obtained ${refunds.length} refunds`);
    })
}

function processAllTrackingNums (trackNumsPromise)
{
    return  trackNumsPromise.then (trackingNumbers => {
        return  Promise.try(function(){
            return trackingNumbers.map (tnum =>{
            let list = [{"trackNumberInfo":{"trackingNumber":tnum,"trackingQualifier":"","trackingCarrier":""}}];
            let newTrackPostFrom =  JSON.parse(JSON.stringify(trackPostFrom));
            let newOneTrackReq = JSON.parse(JSON.stringify(oneTrackReq));
            newOneTrackReq.TrackPackagesRequest.trackingInfoList = list;
            newTrackPostFrom.data = JSON.stringify(newOneTrackReq);
            let result = getEstimatedDeliveryOfBlockNums (newTrackPostFrom);
            return result.then (jsonRes => {
                console.log ("Processing this record:"+JSON.stringify(jsonRes));
                return processOneRec (jsonRes);
            })
        })});


    });
}

function calculateExpectedTime (transitType,shippedTime)
{
    console.log (shippedTime + " failed in auto calculation for shipping "+shippedTime.toLocaleString());
    /*
    Fedex Express Saver  +3d 4:30PM
    Fedex 2Day   +2d 4:30PM
    Fedex 2Day AM +2d 10:30AM
    Fedex Standard Overnight +1d 3:00PM
    Fedex Priority Overnight +1d 10:30AM
    Fedex First Overnight +1d 8:30AM
     */
    shippedTime = new Date(shippedTime);
    let rules = {};
    rules["FedEx Express Saver"] = d=>{d.setDate(d.getDate()+3); d.setHours(16); d.setMinutes(30)}
    rules["FedEx Express"] = d=>{d.setDate(d.getDate()+3); d.setHours(16); d.setMinutes(30)}
    rules["FedEx 2Day"] = d=>{d.setDate(d.getDate()+2); d.setHours(16); d.setMinutes(30)};
    rules["FedEx 2Day AM"] = d=>{d.setDate(d.getDate()+2); d.setHours(10); d.setMinutes(30)};
    rules["FedEx Standard Overnight"] = d=>{d.setDate(d.getDate()+1); d.setHours(15); d.setMinutes(0)};
    rules["FedEx Priority Overnight"] = d=>{d.setDate(d.getDate()+1); d.setHours(10); d.setMinutes(30)};
    rules["FedEx First Overnight"] = d=>{d.setDate(d.getDate()+1); d.setHours(8); d.setMinutes(30)};
    rules[transitType](shippedTime);
    return shippedTime.toLocaleString();
}

function processOneRec (oneTrackRecord) {
    let nodes = jp.nodes(oneTrackRecord, "$..*[?(@.isException == true)].status")
    let isException = nodes.length > 0;
    //If there is exception, disregard the processing this tracking result.
    if (isException) {
        console.log("This tracking record has expception :" + oneTrackRecord);
        return;
    }
    let transitType = jp.query(oneTrackRecord, "$..serviceDesc")[0];
    if (transitType.match(/Fedex Ground/)) {
        console.log("Fedex Ground")
    } else if (transitType.match(/Express/)) {
        console.log("Fedex Express")
    }
    let trackingNum = jp.query(oneTrackRecord, "$..trackingNbr")[0];
    var expectedTime = jp.query(oneTrackRecord, "$..stdTransitTimeEnd")[0];
    let expectedDate = jp.query(oneTrackRecord, "$..displayStdTransitDate")[0];
    let deliveryTime = jp.query(oneTrackRecord, "$..displayActDeliveryDateTime")[0];
    let deliveryDate = jp.query(oneTrackRecord, "$..displayActDeliveryDt")[0];
    let shippedTime = jp.query(oneTrackRecord, "$..shipDt")[0];
    var succ = true;
    if (expectedTime == ""){
        expectedTime = calculateExpectedTime(transitType,shippedTime);
        succ = false;
    }
    //For ground, ignore time delivered. If it is delivered in same date, then it is ok
    //Got non-ground, take day and time, calculate eligiblity
    var isRefundEligible;
    if (transitType.match(/Ground/))
        isRefundEligible = new Date(deliveryDate).getTime() > new Date(expectedDate).getTime();
    else
        isRefundEligible = new Date(deliveryTime).getTime() > new Date(expectedTime).getTime();
    let result =
    {
        trackingNum: trackingNum,
        expectedTime: expectedTime,
        deliveryTime: deliveryTime,
        shippedTime: shippedTime,
        isRefundEligible: isRefundEligible,
        transitType:transitType,
        autoCalculateSucc:succ,
        details:oneTrackRecord
    };
    return Promise.try(function(){
        return result
    });
}

function unzipReport (prevPromise)
{
    return prevPromise.then(x=> {
        let fn = "tmp/report.zip";
        let promiseExract = Promise.promisify(extract);
        let promiseObj = promiseExract(fn, {dir: "/tmp"});
        return promiseObj;
    });
}

function prepareDownloadInputJson (startDate,endDate)
{
    //downloadform
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    //regard last Sunday as today
    today = new Date(today.setDate(today.getDate()-today.getDay()-1));
    var oneWeekBefore = new Date(today.setDate(today.getDate()-today.getDay()-1));
    oneWeekBefore.setDate(today.getDate() - 6);
    if (startDate)
        oneWeekBefore = startDate;
    if (endDate)
        today = endDate;
    downloadform.onetimeending_month = (today.getMonth()+1).toString();
    downloadform.onetimestarting_month = (oneWeekBefore.getMonth()+1).toString();
    downloadform.onetimeending_year = today.getFullYear().toString();
    downloadform.onetimestarting_year =  oneWeekBefore.getFullYear().toString();
    downloadform.reportDateEnd = today.toLocaleDateString();
    downloadform.reportDateStart =  oneWeekBefore.toLocaleDateString();
    return downloadform;
}

function collectTrackNumbers (promise)
{
    return promise.then (x=> {
        let files = fs.readdirSync("/tmp");
        let fn = files.filter(x=>x.match(/^FedEx_Shipment_Detail_Payer_Detail/))[0]
        let contents = fs.readFileSync(`/tmp/${fn}`);
        var records = csvparse(contents, {columns: true});
        console.log("read and parsed csv file");
        let trackingNumbers = records.map(x=> {
            return x["Shipment Tracking Number"].trim();
        });
        console.log("tracking number=" + JSON.stringify(trackingNumbers));
        return Promise.try(function(){
            return trackingNumbers;
        })
    })
}


function reportDownloadProcess (loginPromise)
{
    //let loginPromise = fedexLogin("mtahardware1","1907Fb1905Gs");
    let fileDowloaded = downloadDocument(loginPromise);
    fileDowloaded.then (res=>{
        console.log ("I see file");
    })
}

function fedexLogin(userName,userPaswd) {
    loginform.username = userName;
    loginform.password = userPaswd;
    let optionsforPost = getOptionsForPost(loginform,fedexURL);
    return rp(optionsforPost)
}

function downloadDocument(loginPromise,downloadform) {

    console.log("donwloadDocument");
    return loginPromise.then(res=>{
        let uri = "https://www.fedex.com/reporting/StandardReports.do";
        let options =  getOptionsForPost(downloadform,uri,res);
        options.headers.Referer = uri+"?action=create&standardreporttype=217";
        return rp (options)
    }).then (res=>{
        let accNums = findAccNumbers (res.body);
        let uri = "https://www.fedex.com/reporting/StandardReports.do";
        downloadform.selectedAccountNumbers = accNums;
        let options =  getOptionsForPost(downloadform,uri,res);
        return rp (options)
    }).then (res=>{
        let uri = "https://www.fedex.com/reporting/PrepareReport.do";
        let options =  getOptionsForGet(uri,res);
        return rp (options)
    }).then (res=>{
        let options =  getOptionsForGet(fedexDownloadUrl,res);
        options.Referer = "https://www.fedex.com/reporting/PrepareReport.do";
        return rp (options)
    }).then(res=>{
        let rid = res.body.match(/requestFileDownloadx\((\d+)/)[1];
        let uri = `https://www.fedex.com/reporting/download/report/fcro_report_CSV_${rid}.zip`;
        let options =  getOptionsForPost(csvDownload,uri,res);
        options.encoding = "binary";
        return rp (options)
    }).then (res=> {
        console.log("download completed!!");
        fs.writeFileSync("tmp/report.zip", res.body, 'binary');
        return Promise.try(function(){
            return res.body;
        })
    })
}

function findAccNumbers (body)
{
    var accountNumbers = []
    var $ = cheerio.load(body);
    var options = $("select[name=availableAccountNumbers] option");
    options.each(function(index){
        accountNumbers.push($(this).attr("value"))
    });
    return accountNumbers;
}

function getEstimatedDeliveryDate (trackingNumber)
{
    var uri = fedexTrackingDetails;
    uri = uri.replace (/{.*}/,trackingNumber);
    let options =  getOptionsForGet(uri);
    options.Referer = "https://www.google.com/";

    return rp(options).then (res=>{
        let uri = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
        let options =  getOptionsForGet(uri,res);
        options.Referer = "https://www.google.com/";
        return rp(options)
    }).then (res=>{
        console.log ("Got tracking detail page");
        var $ = cheerio.load(res.body);
    })
};

function getEstimatedDeliveryDateFromPost (trackingNumber)
{
    var uri = fedexTrackPostCall;
    let form = JSON.parse(JSON.stringify(trackPostFrom));
    form.data = form.data.replace (/\{trackingNumber\}/,trackingNumber);
    let options =  getOptionsForPost(form,uri);

    return rp(options).then (res=>{
        let sp = JSON.parse(res.body)
        let estimatedTime = sp.TrackPackagesResponse.packageList[0].standardTransitTimeWindow.displayStdTransitTimeEnd;
        let estimatedDate = sp.TrackPackagesResponse.packageList[0].standardTransitDate.displayStdTransitDate;
        return Promise.try(function(){
            return {date:estimatedDate,time:estimatedTime};
        })
    })
};

function getEstimatedDeliveryOfBlockNums (trackingFormObject)
{

    let form = JSON.parse(JSON.stringify(trackingFormObject));
    let options =  getOptionsForPost(form,fedexTrackPostCall);

    return rp(options).then (res=>{
        let sp = JSON.parse(res.body);
        //let estimatedTime = sp.TrackPackagesResponse.packageList[0].standardTransitTimeWindow.displayStdTransitTimeEnd;
        //let estimatedDate = sp.TrackPackagesResponse.packageList[0].standardTransitDate.displayStdTransitDate;
        return Promise.try(function(){
            return sp;
        })
    })
};

function getOp (promise,localCookieCash)
{
    promise. then (res=>{
            console.log ("Seond GET call result received.");
            console.log ("Body:"+JSON.stringify(res.body));
            console.log ("cookies:"+getCookie(localCookieCash));
            console.log ("Second GET call result received. Logged in successfully")

            let uri ="http://www.fedex.com/us/track/";
            let options =  rebuildOptions (res,localCookieCash,optionsForGet,uri);
            return rp (options)
        })
};

function postOp (promise,fomrData,uri)
{
    return promise. then (res=>{
        let optionsForPost = getOptionsForPost(formData,uri,res);
        return rp (optionsForPost)
    })
};

function getCookie(cookies) {
    var allCookies = "";
    for (var cookieName in cookies){
        allCookies = `${allCookies};${cookieName}=${cookies[cookieName]}`;
    }
    allCookies = allCookies.substring(1);
    console.log ("cookie sent:"+allCookies);
    return allCookies;
};

function collectCookies (res)
{
    let cookieObj = {};
    let cookieArr = res.headers["set-cookie"];
    if (cookieArr == null) {
        console.log("Noo cookie found");
        return cookieObj;
    }
    cookieArr.forEach(nextCookiePair=>{
            let sep = nextCookiePair.indexOf("=");
            if (sep > 0) {
                let cookieName = nextCookiePair.substring(0, sep);
                let cookieValue = nextCookiePair.substring(sep + 1);
                cookiesCache[cookieName] = cookieValue;
            }
    });
    return cookiesCache;
}

//new comment added
function getCookie(cookies) {
    var allCookies = "";
    for (var cookieName in cookies){
        allCookies = `${allCookies};${cookieName}=${cookies[cookieName]}`;
    }
    allCookies = allCookies.substring(1);
    console.log ("cookie sent:"+allCookies);
    return allCookies;
};

function getOptionsForPost (formData,uri,res) {
    var formData = querystring.stringify(formData);
    var contentLength = formData.length;
    var cookies;
    if (res)
        cookies = collectCookies(res);
    else
        cookies = cookiesCache;

    let optionsforPost =
    {
        headers: {
            'Content-Length': contentLength,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        resolveWithFullResponse: true,
        uri: uri,
        body: formData,
        method: 'POST',
        followRedirect: false,
        simple: false
    };
    if (cookies)
        optionsforPost.headers.Cookie = getCookie(cookies);

    return optionsforPost;
}

function getOptionsForGet (uri,res) {
    var cookies;
    if (res)
        cookies = collectCookies(res);
    else
        cookies = cookiesCache;
    let optionsForGet =
    {
        headers: {
            'Accept': "text/html"
        },
        resolveWithFullResponse: true,
        uri: uri,
        method: 'GET',
        followRedirect: false,
        simple: false
    };
    if (cookies && Object.keys(cookies).length > 0)
        optionsForGet.headers.Cookie = getCookie(cookies);
    return optionsForGet
}


function obtainCaptcha (uri)
{
    let options =
    {
        headers: {
            'Accept': "text/html"
        },
        resolveWithFullResponse: true,
        uri: uri,
        method: 'GET',
        followRedirect: false,
        simple: false,
        encoding : "binary"
    };

    let imageFileName = "/tmp/captcha_challenge.gif";
    var formData = {
        // Pass a simple key-value pair
        username: "aozturk",
        // Pass data via Buffers
        password: "Test1122",
        // Pass data via Streams
        captchafile: ""
        // Pass multiple values /w an Array
    }

    return rp (options).then (res=>{
        console.log("download captcha image first!!");
        fs.writeFileSync(imageFileName, res.body, 'binary');
        formData.captchafile = fs.createReadStream(imageFileName);
        return rp.post({url:captchaUri,formData:formData}).then(resp=>{
            console.log ("result:"+x);
            let result = resp.message.split(/&/)[2].replace(/text=/,"");
            return Promise.try (function (){return result})
        }).catch ( resp =>{
            //status code 303
            if (resp.message.match(/^303/)){
                let captchaId = resp.message.split(/&/)[1].replace(/captcha=/,"");
                return rp.get ({url:`${captchaUri}/${captchaId}`}).then (resp =>{
                    let result = resp.split(/&/)[2].replace(/text=/,"");
                    return Promise.try (function (){return result})
                })
            }
        });
    })
}

/**
 *
 * @param trackingNumber
 * @param invoiceNumber
 * @param shipType shipType E for Express G fo Ground
 */
function processClaimForm (trackingNumber,invoiceNumber,shipType)
{
    rp.get({url:fedexClaimForm,resolveWithFullResponse: true,}).then (resp =>{
        return selectFirstClaimForm(shipType,resp);
    }).then (resp=>{
        findClaimData (resp,trackingNumber,invoiceNumber);
    });
}

/**
 *
 * @param shipType E for Express G fo Ground
 */
function selectFirstClaimForm (shipType,resp)
{
    let body = resp.body;
    let form = {
        "jsp_name": "adjustment",
        "orig_country": "US",
        "language": "english",
        "service_type": shipType,
        "pay_type": "invoice",
        "NewReq": ""
    }
    var $ = cheerio.load(body);
    var NewReq = $("input[type=submit][name=NewReq]").attr("value");
    form.NewReq = NewReq;
    let options = getOptionsForPost(form,fedexClaimUrl,resp);
    options.Referer = fedexClaimForm;
    return rp (options)
}
function findClaimData (resp,trackingNumber,invoiceNumber)
{
    let body = resp.body
    //get this by invoking third party api
    var nucaptcha_answer = "";

    var $ = cheerio.load(body);
    var nucaptcha_media = $("img[id=nucaptcha-media]").attr("src");
    var enter = $("input[id=nucaptcha-answer-enter]").attr("value");
    var exit = $("input[id=nucaptcha-answer-exit]").attr("value");
    var token = $("input[id=nucaptcha-token]").attr("value");
    var nds_pmd = $("input[name=nds-pmd]").attr("value");
    var ndsid = $("input[name=ndsid]").attr("value");

    var formData = {
        "jsp_name":"Invoiced",
        "orig_country":"US",
        "language":"english",
        "service_type":"E",
        "pay_type":"invoice",
        "request_type":"NewReq",
        "tracking_nbr":trackingNumber,
        "invoice_nbr":invoiceNumber,
        "nucaptcha-answer":"ERCC",
        "nucaptcha-answer-enter":"1494781618",
        "nucaptcha-answer-exit":"1494785092",
        "nucaptcha-token":token,
        "nds-pmd":nds_pmd,
        "ndsid":ndsid
    }

    let captchaPromise = obtainCaptcha(nucaptcha_media);
    captchaPromise.then (captchaRes =>{
        console.log ("Got captchaRes :"+captchaRes);
        formData["nucaptcha-answer"] = captchaRes;
        let options =  getOptionsForPost(formData,fedexClaimUrl,resp);
        options.Referer = fedexClaimUrl;
        rp(options).then (res=>{
            console.log ("Result for claim submit:"+res);
        })

    })

}
