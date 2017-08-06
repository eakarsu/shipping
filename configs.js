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

let dbHostname="localhost";
let user="";
let password="";

let colMap=[
    { csv: 'trkNbr', rcv: 'Shipment Tracking Number' },
    { csv: 'dispShpDt', rcv: 'Shipment Date' },
    { csv: 'dispEstDelDt', rcv: '' }, //To be calculated form isRefundEligible column
    { csv: 'statBarCD', rcv: 'details.TrackPackagesResponse.packageList[0].keyStatus' },
    { csv: 'srvDesc', rcv: 'details.TrackPackagesResponse.packageList[0].serviceDesc' },
    { csv: 'recpCoNm', rcv: 'Recipient Company Name' },
    { csv: 'recpAddr1', rcv: 'Shipper Address' },
    { csv: 'recpCity', rcv: 'Shipper City' },
    { csv: 'recpNm', rcv: 'Shipper Name' },
    { csv: 'recpCntryCD', rcv: 'Recipient Country' },
    { csv: 'recpZip', rcv: 'Recipient Postal Code' },
    { csv: 'recpStCD', rcv: 'Recipient State' },
    { csv: 'shprCoNm', rcv: 'Shipper Company Name' },
    { csv: 'shprAddr1', rcv: 'Shipper Address' },
    { csv: 'shprCity', rcv: 'Shipper City' },
    { csv: 'shprNm', rcv: 'Shipper Name' },
    { csv: 'shprCntryCD', rcv: 'Shipper Country' },
    { csv: 'shprZip', rcv: 'Shipper Postal Code' },
    { csv: 'shprStCD', rcv: 'Shipper State' },
    { csv: 'invNbr', rcv: 'Invoice number' },
    { csv: 'orgPiecCt', rcv: 'Pieces in Shipment' },
    { csv: 'pkgType', rcv: 'Package Type' },
    { csv: 'dispTotLbsWt', rcv: 'Original weight' },
    { csv: 'update_date', rcv: 'details.TrackPackagesResponse.packageList[0].scanEventList[last()].date and time' },
    { csv: 'memberid', rcv: 'memberid from member table' },
    { csv: 'api_sent', rcv: '????' },
    { csv: 'service', rcv: 'details.TrackPackagesResponse.packageList[0].serviceCD' },
    { csv: 'actual_delivery', rcv: 'deliveryTime' },
    { csv: 'actual_pickup', rcv: 'details.TrackPackagesResponse.packageList[0].displayPickupDateTime' },
    { csv: 'ship_date', rcv: 'details.TrackPackagesResponse.packageList[0].shipDt' },
    //Usually take the date form these columns. Try to add the time to the day based on service. Priority by 8:30 AM like this
    { csv: 'actual_estimated_date', rcv: 'expectedTime or $..stdTransitTimeEnd' },
    { csv: 'anticipated_tender', rcv: '..tenderedDt' },
    { csv: 'actual_tender', rcv: '..tenderedDt?????' },
    { csv: 'refund_status', rcv: '' }, //to be calculated isRefundEligible field
    { csv: 'amount', rcv: '' }, //to be calculated
    { csv: 'accountnbr', rcv: 'Payer Account' },
    { csv: 'shipAmount', rcv: 'Shipment Freight Charge Amount' },
    { csv: 'shipMiscChrg', rcv: 'Shipment Miscellaneous Charge' },
    { csv: 'shipTaxChrg', rcv: 'Shipment Duty and Tax Charge' },
    { csv: 'shipDiscAmount', rcv: 'Shipment Discount Amount' }
];

function insertColumns () {

}

exports.trackPostFrom = trackPostFrom;
exports.oneTrackReq = oneTrackReq;
exports.csvDownload = csvDownload;
exports.downloadform = downloadform;
exports.loginform = loginform;
exports.outputFolder=outputFolder;
exports.dbHostname=dbHostname;
exports.user=user;
exports.password=password;
exports.insertColumns=insertColumns;

