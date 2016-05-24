/*
 This module defines a set of endpoints to crawl various points of information,
 including corpora, runs, and errors produced by runs.
*/

var express = require('express');
var router = express.Router();
var fs = require("fs")
var utils = require("../util/util.js");

// Return information for a particular corpus that this run has permission
// to access
// Ensure that this is not a malicious request by validating based upon
// a run identifier
router.get('/corpus/:corpid/:runid', function(req,res){
  var db = req.db;
  var corpid = req.params.corpid;
  var runid = req.params.runid;
  utils.validation(db, runid, res, function(){
    db.query('select * from corpora where corpid = ? and mode = (select mode from teamids where runid = (?))', [corpid,runid], function(err, results){
      if(err){
        res.status(404).send("Request for corpus failed: " + corpid);
        utils.logError(db,teamid,404,'Corpus request failed: ' + corpid);
        return;
      } else if(results.length == 0){
        res.status(404).send("Invalid corpus identifier");
        utils.logError(db,teamid,404,'Invalid corpus identifier: ' + corpid);
        return;
      } else {
        res.json({corpus:results[0].corpid,
          url:req.headers.host + "/" + results[0].uri+".tgz",
          lang:results[0].lang, 
          type:results[0].type, 
          restricted:results[0].restricted
        });
      }
    });
  });
});


// Return a JSON list of all the errors associated with an identifier
// An identifier could be a group identifier or a run identifier
router.get('/errors/:id', function(req,res){
  var db = req.db;
  var id = req.params.id;
  db.query('select * from errlog where runid = ?',id, function(err,results){
    res.json(results);
  });
});

// Return all information relating to the corpora available to a particular group.
router.get('/corpora/:groupid', function(req,res){
  var db = req.db
  var groupid = req.params.groupid;
  utils.groupValid(db, groupid, res, function(){
    var stmt ='select * from corpora where mode in (select mode from allowed_modes where groupid = ?);' 
    db.query(stmt,groupid, function(err, results){
      if(err){
        res.status(404).send("Corpora request failed.");
        utils.logError(db,groupid,404,'Request for corpora failed');
        return;
      }
      res.json(results);
     });
  });
});

// Return the information for all runs relating to a particular group identifier
router.get('/runs/:groupid', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  db.query('select * from teamids where groupid = ?;', [groupid], function(err,results){
    if(err){
      res.status(404).send("Unable to fetch runs");
      utils.logError(db,groupid,404,'Unable to fetch runs for group');
      return
    }
    res.json(results);
  });
});

// Return all runs associated with the group identifier, the current mode, and the appropriate type
router.get('/runs/:groupid/:mode/:type', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  var type = req.params.type;
  var stmt ='select runid,mode,finalized,alias from teamids where groupid = ? and mode = ?'
  if(type === 'auto')
    stmt += 'and type = "auto"' 
  else if(type === 'manual')
    stmt += 'and type = "manual"' 
  db.query(stmt,[groupid,mode],function(err,results){
    if(err){
      res.status(404).send('Unable to retrieve runid')
      utils.logError(db,groupid,404,'Unable to retrieve runid');
      return;
    }
    res.json(results)
  });
});

module.exports = router;
