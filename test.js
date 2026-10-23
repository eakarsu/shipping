'use strict';

var assert = require('assert');
var fedexUtils = require('./fedexUtils');

assert.strictEqual(fedexUtils.validateTrackingNumber('123456789012'), '123456789012');
assert.throws(function() {
  fedexUtils.validateTrackingNumber('../not-a-tracking-number');
}, /10 to 30 digits/);

console.log('Local validation checks passed');

var w4=require('./lib-wave4d'); var tk=w4.createTask({title:'Check shipment'}); assert.strictEqual(w4.listTasks('shipment')[0].id,tk.id); assert.strictEqual(w4.updateTask(tk.id,{status:'done'}).status,'done'); assert.throws(function(){w4.createTask({});},/title is required/); var sh=w4.createShipment({trackingNumber:'123456789012',amount:0,status:'exception'}); assert.strictEqual(w4.filterShipments([sh],'1234')[0].id,sh.id); assert.ok(w4.toCsv([sh]).includes(',0')); assert.strictEqual(w4.delayRisk(sh).aiGenerated,false); assert.strictEqual(w4.refundBrief(sh).metrics.amount,0); console.log('Wave4D checks passed');
(async function(){ assert.strictEqual(w4.providerConfig({}),null); assert.strictEqual(w4.providerConfig({OPENAI_API_KEY:'sk-test'}).name,'openai'); var fb=w4.delayRisk(sh); assert.strictEqual(await w4.maybeProvider('delay-risk',fb,{}),fb); var fake=async function(){ return {ok:true,json:async function(){ return {model:'m1',choices:[{message:{content:'grounded'}}]}; }}; }; var pv=await w4.maybeProvider('delay-risk',fb,{OPENAI_API_KEY:'sk-test'},fake); assert.strictEqual(pv.aiGenerated,true); assert.strictEqual(pv.metrics.amount,0); console.log('Wave6B provider checks passed'); })().catch(function(e){ console.error(e); process.exit(1); });
