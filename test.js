const util = require('util');

var extract = require('extract-zip')

async function test ()
        {
            let fn = "tmp/report.zip";
            let promiseExract = util.promisify(extract);
            let unzippedRes = await promiseExract(fn, {dir: "/tmp"});
            return unzippedRes;
        }


function unzipReport (zipFile)
{
    let zip = new AdmZip(zipFile);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
    let fedexCzvFileName = "";
    zipEntries.forEach(function(zipEntry) {
        console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName.match(/FedEx_Shipment/)) {
            fedexCzvFileName = zipEntry.entryName;
        }
    });
    zip.extractAllTo(config.outputFolder,true);
    let csvFileName = `${config.outputFolder}/${fedexCzvFileName}`;
    return  csvFileName;
}

var AdmZip = require('adm-zip');

config = {}
config.outputFolder = "tmp";

var fn =  unzipReport ("tmp/report.zip");

// reading archives
var zip = new AdmZip("tmp/report.zip");
var zipEntries = zip.getEntries(); // an array of ZipEntry records

zipEntries.forEach(function(zipEntry) {
    console.log(zipEntry.toString()); // outputs zip entries information
    if (zipEntry.entryName.match(/Fedex_Shipment/)) {
        console.log(zipEntry.data.toString('utf8'));
        console.log(zip.readAsText(zipEntry));
    }
});

zip.extractAllTo("tmp",true);

console.log(zip.readAsText("some_folder/my_file.txt"));

