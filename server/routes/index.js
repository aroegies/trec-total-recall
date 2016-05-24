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
function genID(length){
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var ID = '';
  for(var i=0; i < length; i++)
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
      return;
    } else if ( results.length === 0){
      res.status(404).send('Invalid groupid')
      utils.logError(db,groupid,404,'Unable to validate');
      return;
    }
    res.status(200).send();
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
function startRun(db,res,groupid,ip,type,alias,mode){
  alias = (typeof alias === 'undefined') ? '' : alias;
  var stmt = "select count(*) as count from trec_groups where groupid = ? and groupid not in (select groupid from finished_groups);"
  db.query(stmt, [groupid], function(err, results){
    if(err){
      console.log("Group verification failed.");
      res.status(404).send("Not found.");
      return;
    } else if (results[0].count === 0){
      res.status(404).send("Unauthorized group");
      utils.logError(db,groupid,404,'Unauthorized group');
      return;
    }
    var id = genID(type === 'auto'? 10 : 12);

    stmt = "insert into teamids (groupid,runid,mode,alias,type,ip) values (?,?,?,?,?,?);"
    db.query(stmt,[groupid,id,mode,alias,type,ip], function(error, results2){
      if(error){
        res.status(404).send("Failed.");
        utils.logError(db,groupid,404,'Unable to register group');
        return;
      }
      stmt = "select * from topics where mode = ?;"
      db.query(stmt,[mode], function(err2, results3){
        if(err2){
          res.status(404).send("Could not start run.");
          utils.logError(db,groupid,404,'Unable to start run: ' + id);
          return;
        }
        res.json({runid:id,topic:results3[0].topid,corpus:results3[0].corpid});
        db.query("create table requests_"+id+" like requests_template;", function(cerr,cres){
          if(cerr)
             console.log("Could not create request table for run: " + id);
        });
      });
    });
  });
}

// Fetch current group mode to start a run with that mode
function startRunNoMode(db,res,groupid,ip,type,alias){
  db.query('select mode from trec_groups where groupid = ?',groupid,function(err,results){
    if(err || results.length === 0){
      res.status(404).send('Could not start run for groupid: ' + groupid + ', no mode');
      utils.logError(db,groupid,404,'No mode found: ' + groupid);
      return
    }
    startRun(db,res,groupid,ip,type,alias,results[0].mode)
  });
}

// Start a manual run for a group with no alias
router.get('/start/manual/:groupid/',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  startRunNoMode(db,res,groupid,req.connection.remoteAddress,'manual');
});
// Start a manual run for a group with an alias
router.get('/start/manual/:groupid/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  startRunNoMode(db,res,groupid,req.connection.remoteAddress,'manual',alias);
});
// Start a manual run for a group with an alias and a mode
router.get('/start/manual/:groupid/:mode/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  var mode = req.params.mode
  startRun(db,res,groupid,req.connection.remoteAddress,'manual',alias,mode);
});

// Endpoint to start a run for a group with no alias
router.get('/start/:groupid',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  startRunNoMode(db,res,groupid,req.connection.remoteAddress,'auto');
});

// Endpoint to get the runid for a particular alias
router.get('/resume/:groupid/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  var stmt = 'select runid from teamids where groupid = ? and alias = ? order by time desc limit 1;'
  db.query(stmt,[groupid,alias],function(err,results){
    if(err){
      res.status(404).send('Could not start resume run for groupid: ' + groupid + ', ' + alias);
      utils.logError(db,groupid,404,'No run resumed for: ' + groupid + ', ' + alias);
      return
    }else if(results.length === 0){
      res.status(404).send('Could not find run for alias: ' + groupid + ', ' + alias);
      utils.logError(db,groupid,404,'No run for alias: ' + groupid + ', ' + alias);
      return
    }
    res.json({groupid : groupid, alias : alias, runid : results[0].runid})
  });
});

// Start a run for a group with an alias
router.get('/start/:groupid/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  startRunNoMode(db,res,groupid,req.connection.remoteAddress,'auto',alias);
});

// Start a run for a group with an alias and a mode
router.get('/start/:groupid/:mode/:alias',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var alias = req.params.alias;
  var mode = req.params.mode;
  startRun(db,res,groupid,req.connection.remoteAddress,'auto',alias,mode);
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
      db.query('select IFNULL(j.rel,-1), j.docid from judgments_'+topid+' j left join requests_'+runid+' r on j.topid = r.topid and j.docid = r.docid order by r.id;',
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
  var stmt ='select j.rel, j.docid from judgments_'+topid+' j join requests_'+runid+' r on j.topid = r.topid and j.docid = r.docid order by r.id;' 
  db.query(stmt, function(err, results){
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
// an automatic or manual run
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
  db.query('select type from shots where type in (select shot from called_shots where topid = ? and runid = ?);', [topid,runid], function(err,results){
    res.json(results);
  });
});

// The endpoint returns all shots that have been not called
// for a particular run and a particular topic
router.get('/unshots/:runid/:topid', function(req,res){
  var db = req.db;
  var runid = req.params.runid;
  var topid = req.params.topid;
  db.query('select type from shots where type not in (select shot from called_shots where topid = ? and runid = ?);', [topid,runid], function(err,results){
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
  var stmt ='select * from allowed_modes am join trec_groups g where am.groupid = g.groupid and g.groupid = ? and am.mode = ?;' 
  db.query(stmt,[groupid,mode],function(err1,res1){
    if(err1){
      res.status(404).send('Unable to determine if mode is allowed.');
      utils.logError(db,groupid,404,'Unable to determine if mode is allowed.');
      return;
    } else if(res1.length === 0){
      res.status(404).send('Mode not allowed');
      utils.logError(db,groupid,404,'Mode not allowed for group');
      return;
    }
    db.query("update trec_groups set mode =? where groupid = ?", [mode,groupid], function(err,results){
      if(err){
        res.status(404).send("Unable to change group mode");
        utils.logError(db,groupid,404,'Failed to chnage group mode');
        return
      }
      res.status(200).send();
    });
  });
});

module.exports =router;
