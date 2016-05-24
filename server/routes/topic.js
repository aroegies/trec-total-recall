/*
  This module contains all endpoints relating to the fetching
  of topics and information regarding topics.
*/

var express = require('express');
var router = express.Router();
var utils = require("../util/util.js");


// Endpoint to access all topics available to a
// group  by runid
router.get('/all/:runid',function(req, res){
  var db = req.db;
  var runid = req.params.runid;
  utils.validation(db,runid, res, function(){
    var stmt ="select topid,corpid,need,mode from topics where mode in (select mode from allowed_modes where groupid = (select groupid from teamids where runid = ?));" 
    db.query(stmt,runid , function(err,results){
      if(err){
        res.status(404).send('Failed to dump all topics');
        utils.logError(db,runid,404,'Failed to dump all topics');
        return;
      }
      res.json(results);
    });  
  });
});

// Endpoint to access all  topics available to a particular run
router.get('/topics/:runid/', function(req,res){
  var db = req.db;
  var runid = req.params.runid;
  utils.validation(db,runid,res, function(){
    db.query('select topid,corpid,need,mode from topics where mode = (select mode from teamids where runid = ?);',runid,function(err,results){
      res.json(results);
    });
  });
});

// Endpoint to access all topics associated with a particular
// group identifier and mode
router.get('/group/:groupid/:mode', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  var stmt = 'select topid,corpid,need,(select uri from corpora where corpid = t.corpid) as uri from topics t where mode = ? and mode in (select mode from allowed_modes where groupid = ?);'
  db.query(stmt,[mode,groupid],function(err,results){
    if(err){
      console.log(err)
      res.status(404).send('Unable to retrieve topics')
      utils.logError(db,groupid,404,'Unable to retrieve topics');
      return;
    }
    res.json(results);
  });
});

// Endpoint to access all topics available to a
// group 
router.get('/group/:groupid',function(req, res){
  var db = req.db;
  var groupid = req.params.groupid;
  utils.groupValid(db,groupid, res, function(){
    var stmt ="select topid,corpid,need,(select uri from corpora where corpid = t.corpid),mode from topics t where mode in (select mode from allowed_modes where groupid = ?);" 
    db.query(stmt,groupid , function(err,results){
      if(err){
        console.log(err)
        res.status(404).send('Failed to dump all topics');
        utils.logError(db,groupid,404,'Failed to dump all topics');
        return;
      }
      res.json(results);
    });  
  });
});

// Endpoint to fetch the next topic that the run
// should process
router.get('/:runid/:topid', function(req,res){
  var db = req.db;
  var topid = req.params.topid;
  var runid = req.params.runid;
  utils.validation(db,runid, res, function(){
    db.query("select t.* from topics t join teamids g where g.runid = ? and g.mode = t.mode and t.id > (select id from topics where topid = ?) limit 1;", [runid,topid], function(err,results){
    if(err){
      res.status(404).send('Next topic failed for topic: ' + topid);
      utils.logError(db,runid,404,'Next topic failed for topic: ' + topid);
      return;
    }else if (results.length == 0){
      res.json({topic:-1,corpus:-1});
    } else {
      res.json({topic:results[0].topid,corpus:results[0].corpid});
    }
    });
  });
});

// Endpoint to select the information need for a particular
// topic. The run identifier is used to validate the run.
router.get('/need/:runid/:topid', function(req,res){
  var db = req.db;  
  var topid = req.params.topid;
  var runid = req.params.runid;
  utils.validation(db,runid, res, function(){
    db.query("select need from topics where topid = ? ", [topid], function(err,results){
      if(err){
        res.status(404).send("Topic not found: " + topid);
        utils.logError(db,runid,404,'Topic not found: ' + topid);
        return;
      }else if(results.length == 0){
        res.json({topic:-1,need:-1})
      }else {
        res.json({topic:topid,need:results[0].need});
      }
    });
  });
});



module.exports = router;
