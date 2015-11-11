/*
  This module specifies the endpoints for requesting document identifiers
  and calling one's shot (read: guessing at how well they are doing).
  We support single and multiple document identifier requests through
  two different endpoints.

  In future iterations, the single document endpoint will likely go
  away since it only encourages bad (read: slow) implementations and
  can be performed using the multiple document request endpoint.
*/

var express = require('express');
var router = express.Router();
var utils = require('../util/util.js');


// This function sends a JSON object containing the relevance 
// of the provided document to the provided topic
// This is the single document request endpoint
router.get('/:teamid/:topid/:docid', function(req,res){
  var db = req.db;
  var docid = req.params.docid;
  var topid = req.params.topid;
  var teamid = req.params.teamid;
  // Requests can only be made while the run is on-going
  // Don't allow post-run collection of assessments
  utils.isnotdone(db, teamid, res, function(){
    utils.validation(db, teamid, res, function() {
    db.query('select * from judgments_'+topid+' where docid = ? limit 1;', [docid], function(err,results){
    if(err){
      res.status(404).send("Not Found");
      utils.logError(db,teamid,404,'Failed to find document for:'+ teamid + "," + topid + "," + docid);
    }else{
      var rel;
      if(results.length == 0){
        rel = 0;
        utils.logError(db,teamid,404,'Unable to find judgement for:'+ teamid + "," + topid + "," + docid);
      }
      else{
        rel = results[0].rel;
        res.json({docid:docid,judgement:rel});
        // Only insert a log of the request if it was successful
        db.query("insert into requests_"+teamid+" (docid,topid) VALUES (?,?)",[docid,topid], function(err2,results2){
          if(err2){
            utils.logError(db,teamid,404,'Failed to add request for:'+ teamid + "," + topid + "," + docid);
          }
        });
      }    
    }
    });
  });
});
});

// The endpoint to call one's shot for a run.
// This endpoint returns nothing to the caller as it merely represents
// setting a checkpoint in the log for the run
router.post('/shot/:teamid/:topid/:shot', function(req,res){
  var db = req.db;
  var teamid = req.params.teamid;
  var topid = req.params.topid;
  var shot = req.params.shot;
  // Requests can only be made while the run is on-going
  // All uncalled shots are trivially assummed to be called at the end of a run's
  // request log
  utils.isnotdone( db, teamid, res, function(){
    utils.validation(db, teamid, res, function(){
      db.query('select * from shots where type = ?;',shot,function(err1,res1){
        if(err1){
          res.status(404).send('Invalid shot to call: ' + shot);
          utils.logError(db,teamid,404,'Invalid shot: '+ shot);
          return;
        }
        db.query("insert into requests_"+teamid+" (docid, topid) VALUES (?, ?)", [shot,topid], function(err2,results2){
          if(err2){
            res.status(404).send("Unable to call shot.");
            utils.logError(db,teamid,404,'Failed to call shot:' + shot);
          }else{
            res.status(200).send();
            db.query("insert into called_shots (shot,topid,runid) values (?,?,?);",[shot,topid,teamid]);
          }
        });
      });
    });
  });
});

// This function sends a JSON array containing the relevance 
// of the provided documents to the provided topic
// This is the multiple document request endpoint
router.post('/:teamid/:topid', function(req, res){
  var db = req.db;
  var teamid = req.params.teamid;
  var topid = req.params.topid;
  var keys = Object.keys(req.body);
  var count = 0;

  // Requests can only be made while the run is on-going
  // Don't allow post-run collection of assessments
  utils.isnotdone( db, teamid, res, function(){
    utils.validation(db, teamid, res, function(){
    db.query('select * from judgments_'+topid+' where docid  in (?)',[req.body], function(err, results){
      var stmt = "";
      if(err){
        res.status(404).send("Unable to retrieve judgements for topic: " + topid);
        utils.logError(db,teamid,404,'Unable to retrieve judgments for topic: ' + topid );
      }else{
        // TODO in v2: Ensure req.body.length === results.length
        res.set('Content-Type','application/json');
        res.set('Transfer-Encoding', 'chunked');
        res.write('[');
        // Write back a JSON array of JSON objects so that they can be nicely handled by the client
        for (var key = 0; key < results.length; ++key){
          if(key !== 0){
            res.write(',{"docid":"'+results[key].docid +'","judgement":' +results[key].rel +'}');
         
          }
          else{
             res.write('{"docid":"'+results[key].docid +'","judgement":' +results[key].rel +'}');
          }
        }
        res.end(']\n');
        // Format the request so that it can be nicely inserted into the database
        // Documents are inserted in the order that they were provided in the data
        // portion of the request
        for(var i = 0; i < req.body.length; ++i){
          if(i !== 0){
            stmt += ',(\''+req.body[i]+'\',\''+topid+'\')';
          } else {
            stmt += '(\''+req.body[i]+'\',\''+topid+'\')';
          }
        }
        // Only log the request, if the relevance assessments were successfully retrieved
        db.query('insert into requests_'+teamid+' (docid,topid) values ' + [stmt], function(err2, results2){
          if(err2){
            console.log(stmt);
            utils.logError(db,teamid,404,'Unable to insert requests: ' + topid);
          }
        });
      }
    });
});
});

});
module.exports = router;
