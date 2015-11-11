/*
  This module contains assorted endpoints that did not fit well elsewhere.
  Future versions of this server will attempt to eliminate as many of these
  endpoints from this module as possible.
*/

var express = require('express');
var router = express.Router();
var utils = require('../util/util.js');
var csv = require('csv')


// Generate the unique identifier for automatic runs
// Should be in the utils module
// Will be moved in future versions
function genID(){
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var ID = '';
  for(var i=0; i < 10; i++)
    ID += chars.charAt(Math.floor(Math.random()*chars.length));
  return ID;
}


// Endpoint to check that a group identifier is valid
// Primarily used for manual submissions
router.get('/validate/:groupid', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  db.query('select groupid from trec_groups where groupid = ?;', groupid, function(err,results){
    if(err){
      res.status(404).send('Invalid groupid')
      utils.logError(db,groupid,404,'Unable to validate');
    } else if ( results.length === 0){
      res.status(404).send('Invalid groupid')
      utils.logError(db,groupid,404,'Unable to validate');
    } else {
      res.status(200).send();
    }
  })
});

// Endpoint to check that run identifier is valid
router.get('/validated/:runid/', function(req,res,next){
  var runid = req.params.runid;
  var db = req.db;
  utils.validation(db, runid, res, function(){
    res.json({'runid':runid});
  });
});

// Endpoint to check what modes are available to a group identifier
// Primarily used for manual submissions
router.get('/modes/:groupid', function(req,res){
  var db = req.db
  var groupid = req.params.groupid;
  db.query('select mode from allowed_modes where groupid = ?;', groupid, function(err,results){
    var modes = [];
    for (var key = 0; key < results.length; key++){
      modes.push(results[key].mode)
    }
    res.json(modes);
  });
});


// This function generates a runid for a particular group identifier
// with an optional alias.
// This is done to reuse code for starting runs between the two endpoints
function startRun(db,res,groupid,ip,alias){
  alias = (typeof alias === 'undefined') ? '' : alias;
  db.query("select count(*) as count from trec_groups where groupid = ? and groupid not in (select groupid from finished_groups);", [groupid], function(err, results){
    if(err){
      console.log("Group verification failed.");
      res.status(404).send("Not found.");

    } else if (results[0].count === 0){
      res.status(404).send("Unauthorized group");
      utils.logError(db,groupid,404,'Unauthorized group');
    } else {
      var id = genID();
      console.log(groupid + " " + id);
      db.query("insert into teamids (groupid,runid,mode,alias,ip) select ?,?,mode,?,? from trec_groups where groupid = ?;",[groupid,id,alias,ip,groupid], function(error, results2){
        if(error){
          res.status(404).send("Failed.");
          utils.logError(db,groupid,404,'Unable to register group');
        }else {
          db.query("select t.* from topics t join teamids g where g.runid = ? and t.mode = g.mode limit 1;",[id], function(err2, results3){
            if(err2){
              res.status(404).send("Could not start run.");
              utils.logError(db,groupid,404,'Unable to start run: ' + id);
            }else{
              res.json({runid:id,topic:results3[0].topid,corpus:results3[0].corpid});
              db.query("create table requests_"+id+" (id int NOT NULL AUTO_INCREMENT, docid text, topid text, time timestamp default current_timestamp, index (docid(40),topid(40)),primary key(id));", function(cerr,cres){
                if(cerr){
                  console.log("Could not create request table for run: " + id);
                }
              })
            }
          })
        }
      });
    }
  });  
}

// Endpoint to start a run for a group with no alias
router.get('/start/:groupid',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  startRun(db,res,groupid,req.connection.remoteAddress);
  // TODO: Remove this comment once tested
/*  db.query("select count(*) as count from trec_groups where groupid = ? and groupid not in (select groupid from finished_groups);", [groupid], function(err, results){
    if(err){
      console.log("Group verification failed.");
      res.status(404).send("Not found.");

    } else if (results[0].count === 0){
      res.status(404).send("Unauthorized group");
      utils.logError(db,groupid,404,'Unauthorized group');
    } else {
      var id = genID();
      console.log(groupid + " " + id);
      console.log(req.connection.remoteAddress)
      db.query("insert into teamids (groupid,runid,mode,ip) select ?,?,mode,? from trec_groups where groupid = ?;",[groupid,id,req.connection.remoteAddress,groupid], function(error, results2){
        if(error){
          res.status(404).send("Failed.");
          utils.logError(db,groupid,404,'Unable to register group');
        }else {
          db.query("select t.* from topics t join teamids g where g.runid = ? and t.mode = g.mode limit 1;",[id], function(err2, results3){
            if(err2){
              res.status(404).send("Could not start run.");
              utils.logError(db,groupid,404,'Unable to start run: ' + id);
            }else{
              console.log(results3);
              res.json({runid:id,topic:results3[0].topid,corpus:results3[0].corpid});
              db.query("create table requests_"+id+" (id int NOT NULL AUTO_INCREMENT, docid text, topid text, time timestamp default current_timestamp, index (docid(40),topid(40)),primary key(id));", function(cerr,cres){
                if(cerr){
                  console.log("Could not create request table for run: " + id);
                }
              });
            }
          })
        }
      });
    }
  });  */
});

// Start a run for a group with an alias
router.get('/start/:groupid/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  startRun(db,res,groupid,req.connection.remoteAddress,alias);
});

// An endpoint to generate the gain curve for a single topic
// and run identifier
// This endpoint will be replaced with a suitable call to 
// the generateTopResults in a subsequent verison of the server
// to reduce code duplication
// Accordingly, the JSON response will change slightly to be
// inline with that of the other result generation endpoints
router.get('/results/:runid/:topid', function(req,res){
  var db = req.db;  
  var runid = req.params.runid;
  var topid = req.params.topid;
  utils.isdoneeval(db, runid, res, function(){
    utils.validation(db, runid, res, function(){
      db.query('select j.rel, j.docid from judgments_'+topid+' j join requests_'+runid+' r on j.topid = r.topid and j.docid = r.docid order by r.id;',
                function(err, results){
        if(err){
          console.log("Result generation failed: " + runid + "," + topid);
          res.status(400).send("Result generation failed for topic " + topid)
          utils.logError(db,runid,404,'Result generation failed for topic ' + topid);
        } else if(results.length == 0){
          res.json({});
        }else{
          db.query("select rel from topics where topid = ?", [topid], function(err2, sqlres){
            var total = sqlres[0].rel;
            var seen = [];
            var effort = 0
            var rel = 0;
            var rec_cutoff = 0.1;
            var resp = []
            for(var key in results){
              var docid = results[key].docid;
              ++effort;
              if(results[key].rel === 1){
                if(seen.indexOf(docid) === -1){
                  ++rel;
                  seen.push(docid);
                }
              }
              var recall = rel / total;
              var prec = rel / effort;
              var f1 = 2 * ((prec * recall) / (prec + recall));
              if(rec_cutoff <= recall){
                resp.push({'recall':(rec_cutoff.toFixed(4) * 100.0).toFixed(1), 'effort':effort, 'prec':(prec.toFixed(4)*100.0).toFixed(1),'f1':(f1.toFixed(4)*100.0).toFixed(1)});
                rec_cutoff += 0.1;
              }
            }
            var recall = rel / total;
            var prec = rel / effort;
            var f1 = 2 * ((prec * recall) / (prec + recall));
            resp.push({'recall':(recall.toFixed(4) * 100.0).toFixed(1), 'effort':effort, 'prec':(prec.toFixed(4)*100.0).toFixed(1),'f1':(f1.toFixed(4)*100.0).toFixed(1)});
            res.json(resp);
          });
        }
      });
    });
  });
});

// This functions generates the gain curve for the current
// topic specified by idx in topids
// It recursively calls itself to generate gain curves
// for all topics in the topids list
// It writes the JSON response as a chunked reponse
function generateTopResults(db, res,runid, idx, topids){
  if(idx === topids.length){
    res.end('}\n');
    return;
  }else if(idx != 0){
    res.write(',');
  }
  var topid = topids[idx].topid;
  db.query('select j.rel, j.docid from judgments_'+topid+' j join requests_'+runid+' r on j.topid = r.topid and j.docid = r.docid order by r.id;',
      function(err, results){
    if(err){
      utils.logError(db,runid,404,'Result generation failed for topic ' + topid);
      res.write('"' + topid + '": []');
      generateTopResults(db, res,runid,idx+1,topids);
    } else if(results.length == 0){
      res.write('"' + topid  + '": []');
      generateTopResults(db, res,runid,idx+1,topids);
    }else{
      db.query("select rel from topics where topid = ?", [topid], function(err2, sqlres){
        var total = sqlres[0].rel;
        var seen = [];
        var effort = 0
        var rel = 0;
        var rec_cutoff = 0.1;
        var resp = []
        for(var key =0; key < results.length; key++){
          var docid = results[key].docid;
          ++effort;
          
          if(results[key].rel === 1){
            if(seen.indexOf(docid) === -1){
              ++rel;
              seen.push(docid);
            }
          }
          var recall = rel / total;
          var prec = rel / effort;
          var f1 = 2 * ((prec * recall) / (prec + recall));
          //console.log(rec_cutoff,recall,prec,effort);
          if(rec_cutoff <= recall + 0.0000001){
            resp.push({'recall':(rec_cutoff.toFixed(4) * 100.0).toFixed(1), 'effort':effort, 'prec':(prec.toFixed(4)*100.0).toFixed(1),'f1':(f1.toFixed(4)*100.0).toFixed(1)});
            rec_cutoff += 0.1;
          }
        }
        var recall = rel / total;
        var prec = rel / effort;
        var f1 = 2 * ((prec * recall) / (prec + recall));
        resp.push({'recall':(recall.toFixed(4) * 100.0).toFixed(1), 'effort':effort, 'prec':(prec.toFixed(4)*100.0).toFixed(1),'f1':(f1.toFixed(4)*100.0).toFixed(1)});
        res.write('"' + topid + '":' + JSON.stringify(resp));
        generateTopResults(db, res,runid,idx+1,topids);
      });
    }
  });
}

// This endpoint generates all the gain curves for 
// an automatic run
// Note that this can be prohibited for certain modes
// by adding entiries into the eval_modes table
// in the SQL database
router.get('/results/:runid/', function(req,res){
  var db = req.db;  
  var runid = req.params.runid;
  utils.isdoneeval(db, runid, res, function(){
    utils.validation(db, runid, res, function(){
      db.query("select t.topid from topics t join teamids g where g.runid = ? and g.mode = t.mode;", [runid], function(serr,sresults){
        res.set('Content-Type','application/json');
        res.set('Transfer-Encoding', 'chunked');
        res.write('{');
        generateTopResults(db, res,runid,0,sresults)
      });
    });
  });
});

// This endpoint generates all the gain curves for 
// a manual run
// Note that this can be prohibited for certain modes
// by adding entiries into the eval_modes table
// in the SQL database
// This endpoint will be removed in subsequent versions
// of the server when automatic and manual run management
// is consolidated
router.get('/manualresults/:runid/', function(req,res){
  var db = req.db;  
  var runid = req.params.runid;
  utils.isdoneeval(db,runid,res, function(){
  db.query("select t.topid from topics t join manual_runs g where g.runid = ? and g.mode = t.mode;", [runid], function(serr,sresults){
    res.set('Content-Type','application/json');
    res.set('Transfer-Encoding', 'chunked');
    res.write('{');
    generateTopResults(db, res,runid,0,sresults)
  });
  }, true);
});

// This endpoint is used to denote that a run has finished
// This facilitates result generation 
router.get('/finalize/:runid', function(req, res){
  var db = req.db;
  var runid = req.params.runid;
  utils.validation(db, runid, res, function(){
    db.query('update teamids set finalized = 1 where runid = ?;', [runid], function(err,sqlres){
      if(err){
        res.status(400).send("Failed to finalize");
        utils.logError(db,runid,404,'Failed to finalize run');
      }else {
        res.status(200).send();
      }
    })
  });
});

// The endpoint returns all shots that have been called
// for a particular run and a particular topic
router.get('/shots/:runid/:topid', function(req,res){
  var db = req.db;
  var runid = req.params.runid;
  var topid = req.params.topid;
  db.query('select type from shots where type in (select shot from  called_shots where topid = ? and runid = ?);', [topid,runid], function(err,results){
    res.json(results);
  });
});

// This endpoint is used to change the mode associated
// with a particular group identifier 
// Modes are used to control what topics and corpora
// are available to runs
// This will likely become deprecated in subsequent iterations
// of the server, as modes are effectively supported on a per-run
// basis at this point.
router.get('/mode/:groupid/:mode', function(req,res){
  var mode = req.params.mode;
  var groupid = req.params.groupid;
  var db = req.db;
  db.query('select * from allowed_modes am join trec_groups g where am.groupid = g.groupid and g.groupid = ? and am.mode = ?;',[groupid,mode],function(err1,res1){
    if(err1){
      res.status(404).send('Unable to determine if mode is allowed.');
      utils.logError(db,groupid,404,'Unable to determine if mode is allowed.');
    } else if(res1.length === 0){
      res.status(404).send('Mode not allowed');
      utils.logError(db,groupid,404,'Mode not allowed for group');
    }else {
      db.query("update trec_groups set mode =? where groupid = ?", [mode,groupid], function(err,results){
        if(err){
          res.status(404).send("Unable to change group mode");
          utils.logError(db,groupid,404,'Failed to chnage group mode');
        }else{
          res.status(200).send();
        }
      });
    }
  });
});

// The following is to support ElasticSearch
// of the trivial, test, and bigtest collections
// for the Total Recall 2015 track.
// This support will be moved to its own module
// in subsequent iterations.
// In all likelihood, ElasticSearch will also be 
// replaced with some other search engine
var es = require('elasticsearch');
var esclient = new es.Client({
  host: 'localhost:9200'
});
router.get('/search/:corpid/:query/:docno', function(req, res, next){
  var query = req.params.query;
  var docno = req.params.docno;
  var corpid = req.params.corpid;
  if(corpid !== "20ng" && corpid !== "oldreut" && corpid !== "20ng-sample" && corpid !== "oldreut-sample" && corpid !== "enron"){
    res.status(404).send("Invalid corpus");
    return;
  }
  esclient.search({
    index:  corpid,
    type: 'doc',
    body: {
      query : {
        match : {
          contents : query
        }
      },
      from: docno,
      size : 1,
    } 
  }).then(function(resp){
    var hits = resp.hits.hits;
    var mhits = hits.length;
    if(mhits == 0){
      res.json({docid:"NOHITS", snip:"No search hits", full:"No search hits"});
    }else {
        var doc = {};
        doc['full'] = hits[0]._source.contents;  
        doc['docid'] = hits[0]._source.docid;
        res.json(doc);
    }
  }, function(err){
    res.status(404).send("Search failed.")
    console.log(err);
  });
});



module.exports =router;
