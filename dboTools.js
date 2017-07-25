var config = require("./configs");
const mysql = require('mysql2/promise');
const fedexUtils = require("./fedexUtils");
var fs = require('fs');
var csvparse = require('csv-parse/lib/sync');
let insertedRows = `trkNbr,dispShpDt,dispEstDelDt,statBarCD,srvDesc,recpCoNm,recpAddr1,recpCity,recpNm,
recpCntryCD,recpZip,recpStCD,shprCoNm,shprAddr1,shprCity,shprNm,shprCntryCD,shprZip,shprStCD,invNbr,orgPiecCt,
pkgType,dispTotLbsWt,update_date,memberid,api_sent,service,actual_delivery,actual_pickup,ship_date,
actual_estimated_date,commitment_date,anticipated_tender,actual_tender,
refund_status,amount,refund_date,decline_reason,accountnbr,shipAmount,shipMiscChrg,shipTaxChrg,shipDiscAmount`;

let userKeys = `SELECT AES_DECRYPT( fedexpasswd,  '9efb502d9c288fed74c2b79112282811' ),fedexlogin AS fedex_pass FROM  member`;


var getConnect = async ()=> {
    let connection = await mysql.createConnection({
        host: config.dbHostname,
        user: config.user,
        password: config.password
    });
    return connection;
};


var processAllUsers = async ()=>{
    let conn = getConnect();
    let [rows, fields] = await conn.query(userKeys);
    rows.forEach(user=>{
        let trackProcessRecords = fedexUtils.processOneUser (user.fedexlogin,user.fedexpasswd);
        let csvMap = trackProcessRecords.csvMap;
        //all tracking records including isRefundEligible and isDeliveryException fields annotated
        let records = trackProcessRecords.records;
    })
    conn.destroy();
}


let test1 = ()=> {
    let contents = fs.readFileSync("/tmp/FedEx_Shipment_Detail_Payer_Detail_5065426.csv");
    var records = csvparse(contents, {columns: true});
    console.log("read and parsed csv file:" + records);
    Object.keys(records[0]).forEach(key => {
            console.log(key.trim(), ":", records[0][key].trim());
        }
    );
}



exports.getConnect=getConnect;
exports.processAllUsers=processAllUsers;
