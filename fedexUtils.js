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
var fedexURL = "https://www.fedex.com/fcl/logon.do";
let fedexDownloadUrl = "https://www.fedex.com/reporting/DownloadPage.do";
let fedexDownloadPrepareUrl = "https://www.fedex.com/reporting/StandardReports.do";

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
    "selectedAccountNumbers":"235101130",
    "selectedAccountNumbers":"721459721",
    "selectedFilterColumn":"Show All",
    "filterValueForSelectedColumn":"",
    "StartWeek":"Start week",
    "EndWeek":"End week",
    "StartMonth":"Start month",
    "EndMonth":"End month",
    "reportOccurrence":"onetime",
    "onetime_reportview":"monthly",
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

let cookiesCache = {};
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
    if (cookies)
        optionsForGet.headers.Cookie = getCookie(cookies);
    return optionsForGet
}

loginAndSetCookie ("username", "passowrd");

//new comment added
function getCookie(inreq) {
    var allCookies = "";
    for (var cookieName in inreq.cookies){
        allCookies = `${allCookies};${cookieName}=${inreq.cookies[cookieName]}`;
    }
    allCookies = allCookies.substring(1);
    console.log ("cookie sent:"+allCookies);
    return allCookies;
};

function pacerHost(req)
{
    var host = req.query.host;
    if (host.endsWith("/")){
        host = host.slice(0,-1);
    }
    return host;
}

function loginAndSetCookie(userName,userPaswd) {

    console.log("loginAndSetCookie");

    loginform.username = userName;
    loginform.password = userPaswd;
    let optionsforPost = getOptionsForPost(loginform,fedexURL);
    var localCookieCash = {};

    rp(optionsforPost).then(res=>{
        let uri = "https://www.fedex.com/reporting/StandardReports.do";
        let options =  getOptionsForPost(downloadform,uri,res);
        options.headers.Referer = uri+"?action=create&standardreporttype=217"
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
        let uri = "https://www.fedex.com/reporting/download/report/fcro_report_CSV_5065426.zip";
        let options =  getOptionsForPost(csvDownload,uri,res);
        options.encoding = "binary";
        return rp (options)
    }).then (res=> {
        console.log("download completed!!");
        fs.writeFileSync("test.zip", res.body, 'binary');
    })
}

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

function downloadFile ()
{

}
