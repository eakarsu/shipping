var config = require("./configs");
const mysql = require('mysql2/promise');
const fedexUtils = require("./fedexUtils");
var fs = require('fs');
var csvparse = require('csv-parse/lib/sync');
var jp = require('jsonpath');

let userKeys = `SELECT AES_DECRYPT( fedexpasswd,  '9efb502d9c288fed74c2b79112282811' ) AS fedexpasswd,fedexlogin FROM  member`;

let userPassword = `SELECT AES_DECRYPT( fedexpasswd,  '9efb502d9c288fed74c2b79112282811' ) AS fedexpasswd FROM  member where fedexlogin=':fedexlogin'`;
let insertRefund = "INSERT INTO fedex (??) VALUES ?";
let deleteRows = "DELETE FROM fedex WHERE trkNbr IN (?)";
let searchRows = "select * FROM fedex WHERE trkNbr IN (?)";

var getConnect = async ()=> {
    let connection = await mysql.createConnection({
        host: config.dbHostname,
        user: config.user,
        password: config.password,
        database:"refund"
    });
    return connection;
};

var getPassword = async (userid) =>{
    let conn = await getConnect();
    let query = userPassword.replace(":fedexlogin",userid);
    let [rows, fields] = await conn.query(query);
    let pswd =  Buffer.from(rows[0].fedexpasswd.toString(), 'base64').toString();
    console.log (`${pswd}-${userid}`);
    conn.destroy();
    return pswd;
};

var processAllUsers = async ()=>{
    let resAll = [];
    let conn = await getConnect();
    let [rows, fields] = await conn.query(userKeys);
    rows.forEach(async user=>{
        let passwd =  Buffer.from(user.fedexpasswd.toString(), 'base64').toString();
        console.log (`${passwd}${user.fedexlogin}`)
        try {
            let trackProcessRecords = await fedexUtils.processOneUser(userId, passwd);
            let results = processOneUserExt(user.fedexlogin,passwd,trackProcessRecords,conn);
            results.push(results)
        }catch (ex){
            console.log ("Exception:"+ex);
        }
    })
    conn.destroy();
    return resAll;
}

var processOneUser = async (userId)=>{
    let conn = await getConnect();
    var trackProcessRecords;
    try {
        let passwd = await getPassword(userId);
        trackProcessRecords = await fedexUtils.processOneUser(userId, passwd);
        let result = await processOneUserExt(userId,passwd,trackProcessRecords,conn);
    }catch (ex){
        console.log ("processOneUser:exception:"+ex);
    }
    conn.destroy();
    return trackProcessRecords;
}

var processOneUserExt = async (userId,passwd,trackProcessRecords,conn)=>{
    try {
        let dbColsMap = insertColumns(trackProcessRecords,userId);

        //tracking numbers
        let trackNums = Array.from(dbColsMap.keys());
        let colNames = Object.keys(dbColsMap.get(trackNums[0]));
        let colValues = [];
        trackNums.forEach(trackNum=>colValues.push(Object.values(dbColsMap.get(trackNum))));

        //first find any existing rows and delete them
        let [results,fields] = await conn.query(searchRows,[trackNums]);
        if (results.length > 0) {
            let dresults  = await conn.query(deleteRows, [trackNums]);
            if (dresults[0].affectedRows > 0) {
                console.log(`Deleted some rows in ${JSON.stringify(dresults)}`);
            }
        }

        //now we need to insert into refund table
        let iresults = await conn.query(insertRefund,[colNames,colValues])
        if (iresults[0].affectedRows > 0) {
            console.log(`Inserted some rows in ${JSON.stringify(iresults)}`);
        }

    }catch (ex){
        console.log ("Exception:"+ex);
    }
}


/**
 * Copy tracking record information in downloaded csv file into sql data that would be inserted
 * There are some columns undefined that would be calculated from processed json document
 * @param csvFile
 */
function insertColumns (trackProcessRecords,userId) {

    let csvMap = trackProcessRecords.csvMap;
    let dbMap = new Map();
    for (let trackRec of trackProcessRecords.records){
        var dbCols = {};
        let trackingNum =  trackRec.trackingNum;
        let rcvMap = csvMap.get(trackingNum);
        config.colMap.forEach(m=>{
            dbCols[m.dbc] = rcvMap[m.rcv]
            if (m.rcv.match(/^\$/)){ //jsonpath expression
                let arRes = jp.nodes(trackRec, m.rcv);
                if (arRes.length > 0) {
                    dbCols[m.dbc] = arRes[0].value;
                    if (m.dbc == "update_date")
                        dbCols[m.dbc] = `${dbCols[m.dbc].date} ${dbCols[m.dbc].time}`
                }
            }
            if (m.dbc == "actual_estimated_date") {
                dbCols [m.dbc] = trackRec.expectedTime;
                dbCols.dispEstDelDt = dbCols [m.dbc];
            }
        });
        dbCols.memberid = userId;
        dbCols.refund_status = trackRec.isRefundEligible;

        //convert string to numbers
        dbCols.trkNbr = parseInt(dbCols.trkNbr);
        dbCols.shipAmount = Number(dbCols.shipAmount);
        dbCols.shipDiscAmount = Number(dbCols.shipDiscAmount);
        dbCols.shipMiscChrg = Number(dbCols.shipMiscChrg);
        dbCols.shipTaxChrg = Number(dbCols.shipTaxChrg);
        dbCols.amount = dbCols.shipAmount+dbCols.shipDiscAmount+dbCols.shipMiscChrg+dbCols.shipTaxChrg;

        dbMap.set(dbCols.trkNbr,dbCols);
    }
    console.log (` ${JSON.stringify(dbCols)}`);
    return dbMap;
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

let test2 = async () => {
    let res = await processOneUser("mtahardware1")
    return res;
}

test2();

exports.getConnect=getConnect;
exports.processAllUsers=processAllUsers;
exports.getPassword=getPassword;
exports.processOneUser=processOneUser;
