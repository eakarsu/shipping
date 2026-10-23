
'use strict'; var express=require("express"); var crypto=require("crypto"); var w=require("../lib-wave4d"); var router=express.Router();
function auth(req,res,next){ var exp=process.env.SHIPPING_ADMIN_API_KEY||""; if(exp.length<32) return res.status(503).json({error:"Admin API is not configured"}); var a=crypto.createHash("sha256").update(exp).digest(), b=crypto.createHash("sha256").update(req.get("x-admin-key")||"").digest(); if(!crypto.timingSafeEqual(a,b)) return res.status(401).json({error:"Unauthorized"}); next(); }
router.get("/shipments",auth,function(req,res){ res.json({data:w.filterShipments(w.shipments,req.query.q||req.query.search||"",req.query.status||"")}); });
router.post("/shipments",auth,function(req,res){ try{ res.status(201).json(w.createShipment(req.body)); }catch(e){ res.status(e.status||400).json({error:e.message}); } });
router.get("/shipments/export",auth,function(req,res){ var rows=w.filterShipments(w.shipments,req.query.q||"",req.query.status||""); if(req.query.format==="json") return res.json({data:rows}); res.set("Content-Type","text/csv"); res.set("Content-Disposition","attachment; filename=shipments.csv"); res.send(w.toCsv(rows)); });
router.get("/tasks",auth,function(req,res){ res.json({data:w.listTasks(req.query.q||"",req.query.status||"")}); });
router.post("/tasks",auth,function(req,res){ try{ res.status(201).json(w.createTask(req.body)); }catch(e){ res.status(e.status||400).json({error:e.message}); } });
router.patch("/tasks/:id",auth,function(req,res){ try{ var t=w.updateTask(req.params.id,req.body); if(!t) return res.status(404).json({error:"Task not found"}); res.json(t); }catch(e){ res.status(e.status||400).json({error:e.message}); } });
router.post("/ai/delay-risk",auth,async function(req,res){ res.json(await w.maybeProvider("delay-risk",w.delayRisk(req.body||{}))); });
router.post("/ai/refund-brief",auth,async function(req,res){ res.json(await w.maybeProvider("refund-brief",w.refundBrief(req.body||{}))); });
router.post("/ai/exception-summary",auth,async function(req,res){ res.json(await w.maybeProvider("exception-summary",w.exceptionSummary((req.body&&req.body.shipments)||w.shipments))); });
module.exports=router;
