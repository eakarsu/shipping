var outputFolder = "/tmp";

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
    "onetimestarting_month":"-1",
    "onetimestarting_year":"-1",
    "reportDateStart":"4/23/2017",
    "onetimeending_month":"-1",
    "onetimeending_year":"-1",
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

let dbHostname="162.243.203.26"; //"localhost"
let user="eakarsu";
let password="erol33";

let colMap=[
    { dbc: 'trkNbr', rcv: 'Shipment Tracking Number' },
    { dbc: 'dispShpDt', rcv: 'Shipment Date' },
    { dbc: 'dispEstDelDt', rcv: '' }, //To be calculated form isRefundEligible column
    { dbc: 'statBarCD', rcv: '$..packageList[0].keyStatus' },
    { dbc: 'srvDesc', rcv: '$..packageList[0].serviceDesc' },
    { dbc: 'recpCoNm', rcv: 'Recipient Company Name' },
    { dbc: 'recpAddr1', rcv: 'Shipper Address' },
    { dbc: 'recpCity', rcv: 'Shipper City' },
    { dbc: 'recpNm', rcv: 'Shipper Name' },
    { dbc: 'recpCntryCD', rcv: 'Recipient Country' },
    { dbc: 'recpZip', rcv: 'Recipient Postal Code' },
    { dbc: 'recpStCD', rcv: 'Recipient State' },
    { dbc: 'shprCoNm', rcv: 'Shipper Company Name' },
    { dbc: 'shprAddr1', rcv: 'Shipper Address' },
    { dbc: 'shprCity', rcv: 'Shipper City' },
    { dbc: 'shprNm', rcv: 'Shipper Name' },
    { dbc: 'shprCntryCD', rcv: 'Shipper Country' },
    { dbc: 'shprZip', rcv: 'Shipper Postal Code' },
    { dbc: 'shprStCD', rcv: 'Shipper State' },
    { dbc: 'invNbr', rcv: 'Invoice number' },
    { dbc: 'orgPiecCt', rcv: 'Pieces in Shipment' },
    { dbc: 'pkgType', rcv: 'Package Type' },
    { dbc: 'dispTotLbsWt', rcv: 'Original weight' },
    { dbc: 'update_date', rcv: '$..scanEventList[0]' },
    { dbc: 'memberid', rcv: 'memberid from member table' },
    { dbc: 'api_sent', rcv: '????' },
    { dbc: 'service', rcv: '$..packageList[0].serviceCD' },
    { dbc: 'actual_delivery', rcv: '$..deliveryTime' },
    { dbc: 'actual_pickup', rcv: '$..packageList[0].displayPickupDateTime' },
    { dbc: 'ship_date', rcv: '$..packageList[0].shipDt' },
    //Usually take the date form these columns. Try to add the time to the day based on service. Priority by 8:30 AM like this
    { dbc: 'actual_estimated_date', rcv: 'expectedTime or $..stdTransitTimeEnd' },
    { dbc: 'anticipated_tender', rcv: '$..tenderedDt' },
    { dbc: 'actual_tender', rcv: '$..tenderedDt' },
    { dbc: 'refund_status', rcv: '' }, //to be calculated isRefundEligible field
    { dbc: 'amount', rcv: '' }, //to be calculated
    { dbc: 'accountnbr', rcv: 'Payer Account' },
    { dbc: 'shipAmount', rcv: 'Shipment Freight Charge Amount' },
    { dbc: 'shipMiscChrg', rcv: 'Shipment Miscellaneous Charge' },
    { dbc: 'shipTaxChrg', rcv: 'Shipment Duty and Tax Charge' },
    { dbc: 'shipDiscAmount', rcv: 'Shipment Discount Amount' }
];

exports.trackPostFrom = trackPostFrom;
exports.oneTrackReq = oneTrackReq;
exports.csvDownload = csvDownload;
exports.downloadform = downloadform;
exports.loginform = loginform;
exports.outputFolder=outputFolder;
exports.dbHostname=dbHostname;
exports.user=user;
exports.password=password;
exports.colMap=colMap;

