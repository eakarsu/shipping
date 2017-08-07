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
var Zip = require('adm-zip');
var csvparse = require('csv-parse/lib/sync');
var config = require("./configs");

let captchaUri = "http://api.dbcapi.me/api/captcha";
var fedexURL = "https://www.fedex.com/fcl/logon.do";
let fedexDownloadUrl = "https://www.fedex.com/reporting/DownloadPage.do";
let fedexDownloadPrepareUrl = "https://www.fedex.com/reporting/StandardReports.do?action=create&standardreporttype=217";
let fedexTrackingDetails = "https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}";
let fedexTrackPostCall = "https://www.fedex.com/trackingCal/track";
let fedexClaimUrl = "https://www.fedex.com/servlet/InvoiceServlet";
let fedexClaimForm = "https://www.fedex.com/servlet/InvoiceServlet?link=2&jsp_name=adjustment&orig_country=US&language=english";
let cookiesCache = {};
let dbTools = require("./dboTools");

try {
    //processOneUser("mtahardware1", "1907Fb1905Gs");
    //toggleRefundEligibility ("642755704003");
}catch (ex){
    console.log ("errr:"+ex);
}

//processClaimForm ("642755709303","155723013","E");

let uri = "https://api-us-east-1.nd.nudatasecurity.com/1.0/w/65110/w-809838/captcha?type=VIDEO&lang=eng&index=0&token=1.w-809838.1.2.l7yccooHLger9ZMiP4d_rA,,.9tHOlkX-ARImo64IDe_BMtC7u2K6PM6pX1atd1LyQvx4njsj9H4ku3V2j7eIIwu7muOyNdOTcSSQP34XpFCRMgw9K2IGJmw9-xVQyWyZeg-PGOsKqzrDeF_yOi3PuTT4ivGJ84dty-V_jIdthWk390B1PeXgnco5SYA8bbtwg_NYr-2sQV9K5l8hOMjO7RFrmRq08RFkWIEAJAkvZ4RoQtBg33daBNuKMwEjdV60-7BmD8t19pZJFt7IKmfw6hrT_RAdkKy5OLpx8F64NwcKusH8lsSgW7Ir3sCMJ-QQ6RR12awQqC7uh88erdgzSAGTg6MUFopWlzy5DgOEDVALvxdYStcShmHPk0XhNbnpDEk,&r=rs-pnVdAkKLKeOT2KRpFqF3UQxx&ptype=SCRIPT"

//obtainCaptcha(uri);

async function processOneUser(userId) {

    /*
    let userPassword = dbTools.getPassword(userId);
    let loginRes = await fedexLogin(userName, userPassword);
    let newDownloadForm = prepareDownloadInputJson();
    let zipFileContent = await downloadDocument(loginRes, newDownloadForm);
    let csvFileName = await unzipReport(zipFileContent);
    */
    let csvFileName = "docs/FedEx_Shipment_Detail_Payer_Detail_5065426.csv";
    let trackRecords = collectTrackNumbers(csvFileName);
    let trackingNumbers = trackRecords.trackingNumbers;


    let subset = trackingNumbers.slice(0,5);
    //let processedTrackingNums = await processAllTrackingNums(trackingNumbers);

    let processedTrackingNums = await processAllTrackingNums(subset);

    console.log("processed all:" + JSON.stringify(processedTrackingNums));
    let refunds = processedTrackingNums.filter(x => x && x.isRefundEligible);
    console.log(`Obtained ${refunds.length} refunds`);

    let result = {refunds:refunds,records:processedTrackingNums,csvMap:trackRecords.csvMap};
    return result;
}

async function processAllTrackingNums(trackingNumbers) {
    let result = [];
    for (let tnum of trackingNumbers) {
        let jsonRes = await processOneTrackNum(tnum);
        console.log("Processing this record:" + JSON.stringify(jsonRes));
        result.push(jsonRes);
    };
    return  result;
}

async function processOneTrackNum (tnum)
{
    let list = [{"trackNumberInfo": {"trackingNumber": tnum, "trackingQualifier": "", "trackingCarrier": ""}}];
    let newTrackPostFrom = JSON.parse(JSON.stringify(config.trackPostFrom));
    let newOneTrackReq = JSON.parse(JSON.stringify(config.oneTrackReq));
    newOneTrackReq.TrackPackagesRequest.trackingInfoList = list;
    newTrackPostFrom.data = JSON.stringify(newOneTrackReq);
    let jsonRes = await getEstimatedDeliveryOfBlockNums(newTrackPostFrom);

    console.log("Processing this record:" + JSON.stringify(jsonRes));
    var result;
    try {
        result = processOneRec(jsonRes);
    }catch (ex){
        console.log ("Exception in processOneTrackNum"+ ex)
        result = {status:`Exception in processOneTrackNum=${tnum}`,
            details: oneTrackRecord}
    }
    return result;
}

async function toggleRefundEligibility (tnum)
{
    var success = true;
    try {
        const mysql = require('mysql2/promise');
        var connection = await mysql.createConnection({
            host: config.dbHostname,
            user: config.user,
            password: config.password
        });
        let query = `SELECT * FROM refund.fedex WHERE trkNbr=${tnum}`;
        let [rows, fields, err] = await connection.query(query);

        if (rows.length == 1) {
            let row = rows[0];
            let newStatus = row.refund_status == 'ONTIME' ? 'ELIGIBLE' : 'ONTIME';
            let updateQuery = `UPDATE refund.fedex SET refund_status='${newStatus}' WHERE trkNbr=${tnum}`;
            let [rows2, fields2] = await connection.query(updateQuery);
            console.log("DB updated");
        }
        console.log("results:" + JSON.stringify(rows) );
        connection.destroy();
    }catch (er){
        console.log("Go mysql exception:"+er);
        success = false;
    }
    return success;
}

function calculateExpectedTime(transitType, shippedTime) {
    console.log(shippedTime + " failed in auto calculation for shipping " + shippedTime.toLocaleString());
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
    rules["FedEx Express Saver"] = d => {
        d.setDate(d.getDate() + 3);
        d.setHours(16);
        d.setMinutes(30)
    }
    rules["FedEx Express"] = d => {
        d.setDate(d.getDate() + 3);
        d.setHours(16);
        d.setMinutes(30)
    }
    rules["FedEx 2Day"] = d => {
        d.setDate(d.getDate() + 2);
        d.setHours(16);
        d.setMinutes(30)
    };
    rules["FedEx 2Day AM"] = d => {
        d.setDate(d.getDate() + 2);
        d.setHours(10);
        d.setMinutes(30)
    };
    rules["FedEx Standard Overnight"] = d => {
        d.setDate(d.getDate() + 1);
        d.setHours(15);
        d.setMinutes(0)
    };
    rules["FedEx Priority Overnight"] = d => {
        d.setDate(d.getDate() + 1);
        d.setHours(10);
        d.setMinutes(30)
    };
    rules["FedEx First Overnight"] = d => {
        d.setDate(d.getDate() + 1);
        d.setHours(8);
        d.setMinutes(30)
    };
    rules["FedEx International Economy"] = d => {
        d.setDate(d.getDate() + 6);
    };
    if (rules[transitType])
        rules[transitType](shippedTime);
    else {
        console.log (`${transitType} is not configured yet`)
    }
    return shippedTime.toLocaleString();
}

function processOneRec(oneTrackRecord) {
    var transitType,trackingNum,expectedTime,expectedDate,deliveryTime,deliveryDate,shippedTime;
    let nodes = jp.nodes(oneTrackRecord, "$..*[?(@.isException == true)].status")
    let isDeliveryException = nodes.length > 0;
    //If there is exception, disregard the processing this tracking result.
    if (isDeliveryException) {
        console.log("This tracking record has expception :" + oneTrackRecord);
        isRefundEligible = false;
    }
    else {
        transitType = jp.query(oneTrackRecord, "$..serviceDesc")[0];
        if (transitType.match(/Fedex Ground/)) {
            console.log("Fedex Ground")
        } else if (transitType.match(/Express/)) {
            console.log("Fedex Express")
        }
        trackingNum = jp.query(oneTrackRecord, "$..trackingNbr")[0];
        expectedTime = jp.query(oneTrackRecord, "$..stdTransitTimeEnd");
        if (expectedTime[0] && expectedTime[0]  != "")
            expectedTime = expectedTime[0];
        else {
            expectedTime = jp.query(oneTrackRecord, "$..expectedTime");
            if (expectedTime[0] && expectedTime[0]  != "")
                expectedTime = expectedTime[0].replace(/(\+|\-)\d{2}\:\d{2}/,"");
            else{
                expectedTime ="";
                console.log ("COULD not find expected date");
            }
        }
        expectedDate = jp.query(oneTrackRecord, "$..displayStdTransitDate")[0];
        deliveryTime = jp.query(oneTrackRecord, "$..actDeliveryDt")[0].replace(/(\+|\-)\d{2}\:\d{2}/,"");
        deliveryDate = jp.query(oneTrackRecord, "$..displayActDeliveryDt")[0];
        shippedTime = jp.query(oneTrackRecord, "$..shipDt")[0];
        var succ = true;
        if (expectedTime == "") {
            console.log("Can not calculate estimated time. Manually doing it now:"+transitType+":"+trackingNum)
            expectedTime = calculateExpectedTime(transitType, shippedTime);
            succ = false;
        }
        //For ground, ignore time delivered. If it is delivered in same date, then it is ok
        //Got non-ground, take day and time, calculate eligiblity
        var isRefundEligible;
        if (transitType.match(/Ground/))
            isRefundEligible = new Date(deliveryDate).getTime() > new Date(expectedDate).getTime();
        else
            isRefundEligible = new Date(deliveryTime).getTime() > new Date(expectedTime).getTime();
    }
    let result =
        {
            trackingNum: trackingNum,
            expectedTime: expectedTime,
            deliveryTime: deliveryTime,
            shippedTime: shippedTime,
            isRefundEligible: isRefundEligible,
            isDeliveryException:isDeliveryException,
            transitType: transitType,
            autoCalculateSucc: succ,
            details: oneTrackRecord
        };
    return result;
}

function unzipReport(zipFileContent) {
    //write binary zip file content into file first
    let outFileName = `${config.outputFolder}/report.zip`;
    fs.writeFileSync(outFileName, zipFileContent, 'binary');

    //unzip it now
    let zip = new Zip(outFileName);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
    let fedexCzvFileName = "";
    zipEntries.forEach(function (zipEntry) {
        console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName.match(/FedEx_Shipment/)) {
            fedexCzvFileName = zipEntry.entryName;
        }
    });
    zip.extractAllTo(config.outputFolder, true);
    let csvFileName = `${config.outputFolder}/${fedexCzvFileName}`;
    return csvFileName;
}

function prepareDownloadInputJson(startDate, endDate) {
    //downloadform
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var copyToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    //regard last Sunday as today
    today = new Date(today.setDate(today.getDate() - today.getDay() - 1));
    var oneWeekBefore = new Date(copyToday.setDate(copyToday.getDate() - copyToday.getDay() - 1));
    oneWeekBefore.setDate(today.getDate() - 6);
    if (startDate)
        oneWeekBefore = startDate;
    if (endDate)
        today = endDate;
    var downloadform = config.downloadform;
    //fedex changed those following 4 fields to -1
    //fedex changed the format of date
    downloadform.reportDateEnd = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;////today.toLocaleDateString();
    downloadform.reportDateStart = `${oneWeekBefore.getMonth() + 1}/${oneWeekBefore.getDate()}/${oneWeekBefore.getFullYear()}`;//oneWeekBefore.toLocaleDateString();
    return downloadform;
}

function collectTrackNumbers(csvFileName) {
    let contents = fs.readFileSync(csvFileName);
    var records = csvparse(contents, {columns: true});
    console.log("read and parsed csv file");
    let csvMap = new Map();
    let trackingNumbers = records.map(x => {
        let trackNum = x["Shipment Tracking Number"].trim();
        csvMap.set(trackNum,x);
        return trackNum;
    });
    console.log("tracking number=" + JSON.stringify(trackingNumbers));
    return {trackingNumbers:trackingNumbers,csvMap:csvMap};

}


function reportDownloadProcess(loginPromise) {
    //let loginPromise = fedexLogin("mtahardware1","1907Fb1905Gs");
    let fileDowloaded = downloadDocument(loginPromise);
    fileDowloaded.then(res => {
        console.log("I see file");
    })
}

async function fedexLogin(userName, userPaswd) {
    let loginform = JSON.parse(JSON.stringify(config.loginform));
    loginform.username = userName;
    loginform.password = userPaswd;
    let optionsforPost = getOptionsForPost(loginform, fedexURL);
    let loginResult = await rp(optionsforPost);
    return await rp(optionsforPost)
}

async function downloadDocument(loginRes, downloadform) {

    console.log("donwloadDocument");

    var uri = "https://www.fedex.com/reporting/MainPage.do";
    var options = getOptionsForGet(uri, loginRes);
    var getres = await rp(options);
    console.log("MainPage");

    uri = "https://www.fedex.com/reporting/StandardReports.do?action=create&standardreporttype=217";
    options = getOptionsForGet(uri, getres);
    getres = await rp(options);
    console.log("Get standard report form");

    let accNums = findAccNumbers(getres.body);
    uri = "https://www.fedex.com/reporting/StandardReports.do";
    downloadform.selectedAccountNumbers = accNums;
    options = getOptionsForPost(downloadform, uri, getres);
    options.headers.Referer = uri + "?action=create&standardreporttype=217";
    var postRes = await rp(options);
    console.log("StandardReports");

    uri = "https://www.fedex.com/reporting/PrepareReport.do";
    options = getOptionsForGet(uri, postRes);
    postRes = await rp(options);
    console.log("PrepareReport");

    options = getOptionsForGet(fedexDownloadUrl, postRes);
    options.Referer = "https://www.fedex.com/reporting/DownloadPage.do";
    postRes = await rp(options);
    console.log("reporting/DownloadPage");

    let rid = postRes.body.match(/requestFileDownloadx\((\d+)/)[1];
    uri = `https://www.fedex.com/reporting/download/report/fcro_report_CSV_${rid}.zip`;
    options = getOptionsForPost(config.csvDownload, uri, postRes);
    options.encoding = "binary";
    postRes = await rp(options);
    console.log("requestFileDownloadx");
    return postRes.body;

}

function findAccNumbers(body) {
    var accountNumbers = []
    var $ = cheerio.load(body);
    var options = $("select[name=availableAccountNumbers] option,select[name=selectedAccountNumbers] option"); //
    options.each(function (index) {
        accountNumbers.push($(this).attr("value"))
    });
    return accountNumbers;
}

function getEstimatedDeliveryDate(trackingNumber) {
    var uri = fedexTrackingDetails;
    uri = uri.replace(/{.*}/, trackingNumber);
    let options = getOptionsForGet(uri);
    options.Referer = "https://www.google.com/";

    return rp(options).then(res => {
        let uri = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
        let options = getOptionsForGet(uri, res);
        options.Referer = "https://www.google.com/";
        return rp(options)
    }).then(res => {
        console.log("Got tracking detail page");
        var $ = cheerio.load(res.body);
    })
};

function getEstimatedDeliveryDateFromPost(trackingNumber) {
    var uri = fedexTrackPostCall;
    let form = JSON.parse(JSON.stringify(config.trackPostFrom));
    form.data = form.data.replace(/\{trackingNumber\}/, trackingNumber);
    let options = getOptionsForPost(form, uri);

    return rp(options).then(res => {
        let sp = JSON.parse(res.body)
        let estimatedTime = sp.TrackPackagesResponse.packageList[0].standardTransitTimeWindow.displayStdTransitTimeEnd;
        let estimatedDate = sp.TrackPackagesResponse.packageList[0].standardTransitDate.displayStdTransitDate;
        return Promise.try(function () {
            return {date: estimatedDate, time: estimatedTime};
        })
    })
};

async function getEstimatedDeliveryOfBlockNums(trackingFormObject) {

    let form = JSON.parse(JSON.stringify(trackingFormObject));
    let options = getOptionsForPost(form, fedexTrackPostCall);

    let res = await rp(options);
    console.log ("res:"+JSON.stringify(res.body));
    var result;
    try {
        result = JSON.parse(res.body);
    }catch (ex){}
    return result;
};

function getOp(promise, localCookieCash) {
    promise.then(res => {
        console.log("Seond GET call result received.");
        console.log("Body:" + JSON.stringify(res.body));
        console.log("cookies:" + getCookie(localCookieCash));
        console.log("Second GET call result received. Logged in successfully")

        let uri = "http://www.fedex.com/us/track/";
        let options = rebuildOptions(res, localCookieCash, optionsForGet, uri);
        return rp(options)
    })
};

function postOp(promise, fomrData, uri) {
    return promise.then(res => {
        let optionsForPost = getOptionsForPost(formData, uri, res);
        return rp(optionsForPost)
    })
};

function getCookie(cookies) {
    var allCookies = "";
    for (var cookieName in cookies) {
        allCookies = `${allCookies};${cookieName}=${cookies[cookieName]}`;
    }
    allCookies = allCookies.substring(1);
    console.log("cookie sent:" + allCookies);
    return allCookies;
};

function collectCookies(res) {
    let cookieObj = {};
    let cookieArr = res.headers["set-cookie"];
    if (cookieArr == null) {
        console.log("Noo cookie found");
        return cookieObj;
    }
    cookieArr.forEach(nextCookiePair => {
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
    for (var cookieName in cookies) {
        allCookies = `${allCookies};${cookieName}=${cookies[cookieName]}`;
    }
    allCookies = allCookies.substring(1);
    console.log("cookie sent:" + allCookies);
    return allCookies;
};

function getOptionsForPost(formData, uri, res) {
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

function getOptionsForGet(uri, res) {
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


function obtainCaptcha(uri) {
    console.log("Using uri " + uri);
    let options =
        {
            headers: {
                'Accept': "application/json"
            },
            resolveWithFullResponse: true,
            uri: uri,
            method: 'GET',
            followRedirect: false,
            simple: false,
            encoding: "binary"
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

    return rp(options).then(res => {
        console.log("download captcha image first!!");
        fs.writeFileSync(imageFileName, res.body, 'binary');
        formData.captchafile = fs.createReadStream(imageFileName);
        return rp.post({url: captchaUri, formData: formData, headers: {Accept: "Application/json"}}).then(resp => {
            let result = JSON.parse(resp).text;
            return Promise.try(function () {
                return result
            })
        }).catch(resp => {
            let response = JSON.parse(resp.response.body);
            let status = response.status;
            console.log("status:" + status + " captchae response=" + response.text);
            let message = resp.message;
            //status code 303
            if (message.match(/^303/)) {
                let captchaId = response.captcha;
                let nextUri = `${captchaUri}/${captchaId}`;
                console.log("next URI:" + nextUri);
                let options = {url: nextUri, headers: {Accept: "Application/json"}};
                return rp.get(options).then(resp => {
                    let result = JSON.parse(resp).text;
                    console.log("final 1  captchae result:" + result + ":" + resp + ":" + resp.message);
                    return Promise.try(function () {
                        return result
                    })
                }).then(result => {
                    if (result.length == 0) {
                        setTimeout(function () {
                            console.log('Blah blah blah blah extra-blah');
                        }, 3000);

                        rp.get(options).then(resp => {
                            let result = JSON.parse(resp).text;
                            console.log("final 2 captchae result:" + result + ":" + resp + ":" + resp.message);
                            return Promise.try(function () {
                                return result
                            })
                        });
                    } else
                        return Promise.try(function () {
                            return result
                        });
                })
            } else
                return Promise.try(function () {
                    return response.text
                });

        });
    })
}

/**
 *
 * @param trackingNumber
 * @param invoiceNumber
 * @param shipType shipType E for Express G fo Ground
 */
function processClaimForm(trackingNumber, invoiceNumber, shipType) {
    rp.get({url: fedexClaimForm, resolveWithFullResponse: true,}).then(resp => {
        return selectFirstClaimForm(shipType, resp);
    }).then(resp => {
        findClaimData(resp, trackingNumber, invoiceNumber);
    });
}

/**
 *
 * @param shipType E for Express G fo Ground
 */
function selectFirstClaimForm(shipType, resp) {
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
    let options = getOptionsForPost(form, fedexClaimUrl, resp);
    options.Referer = fedexClaimForm;
    return rp(options)
}

function findClaimData(resp, trackingNumber, invoiceNumber) {
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
        "jsp_name": "Invoiced",
        "orig_country": "US",
        "language": "english",
        "service_type": "E",
        "pay_type": "invoice",
        "request_type": "NewReq",
        "tracking_nbr": trackingNumber,
        "invoice_nbr": invoiceNumber,
        "nucaptcha-answer": "ERCC",
        "nucaptcha-answer-enter": "1494781618",
        "nucaptcha-answer-exit": "1494785092",
        "nucaptcha-token": token,
        "nds-pmd": nds_pmd,
        "ndsid": ndsid
    }

    let captchaPromise = obtainCaptcha(nucaptcha_media);
    captchaPromise.then(captchaRes => {
        console.log("Got captchaRes :" + captchaRes);
        formData["nucaptcha-answer"] = captchaRes;
        let options = getOptionsForPost(formData, fedexClaimUrl, resp);
        options.Referer = fedexClaimUrl;
        rp(options).then(res => {
            console.log("Result for claim submit:" + res);
        })

    })

}

exports.obtainCaptcha = obtainCaptcha;
exports.processOneUser=processOneUser;
exports.processOneTrackNum=processOneTrackNum;
exports.toggleRefundEligibility=toggleRefundEligibility;
exports.collectTrackNumbers=collectTrackNumbers;