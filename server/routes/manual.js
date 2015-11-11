/*
  This module contains manual run specific endpoints
  However, many of these endpoints are duplicates for
  automatic runs.

  The next iteration of the server will consolidate
  most of this functionality with automatic runs.

  Due to these two reasons, most of these endpoints
  are left undocumented due to their similarity to
  existing endpoints.
*/

var express = require('express');
var router = express.Router();
var utils = require('../util/util.js');
var csv = require('csv')

router.get('/getshots/:runid/:topid', function(req,res){
  var db = req.db;
  var runid = req.params.runid;
  var topid = req.params.topid;
  db.query('select type from shots where type not in (select shot from  called_shots where topid = ? and runid = ?);', [topid,runid], function(err,results){
    res.json(results);
  });
});
router.post('/shot/:teamid/:topid/:shot', function(req,res){
  var db = req.db;
  var teamid = req.params.teamid;
  var topid = req.params.topid;
  var shot = req.params.shot;
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

// Endpoint is used to retrieve and return judgements in csv
// format for a particular topic and identifier
// This will likely become deprecated when client-side conversion
// of csv to JSON is implemented.
router.post('/upload/:teamid/:topid', function(req,res){
  var db = req.db;
  var teamid = req.params.teamid;
  var topid = req.params.topid;
  req.pipe(req.busboy);
  req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var data ="";
    if(filename.indexOf('csv',filename.length - 3) === -1){
//    if(mimetype !== 'text/csv'){
      return res.status(404).json({'message':'File not csv', 'type':mimetype});
    }
    file.on('data', function(chunk){
      data += chunk;
    });
    file.on('end', function(){
      csv.parse(data,function(err,cleaned){
        db.query('select docid,rel from judgments_'+topid+' where docid in (?)',[cleaned], function(err, results){
          var stmt = "";
          if(err){
            res.status(404).send("Unable to retrieve judgements for topic: " + topid);
            utils.logError(db,teamid,404,'Unable to retrieve judgments for topic: ' + topid );
          }else if (results.length === 0){
            res.set('Content-disposition', 'attachment; filename=qrels.csv');
            res.set('Transfer-Encoding', 'chunked');
            res.set('Content-Type', 'text/csv');
            res.write("");
            res.end();
          }else{
            res.set('Content-disposition', 'attachment; filename=qrels.csv');
            res.set('Transfer-Encoding', 'chunked');
            res.set('Content-Type', 'text/csv');
            csv.stringify(results, function(err,data){
              res.write(data);
              res.end();
            })
            for(var i = 0; i < cleaned.length; ++i){
              if(i !== 0){
                stmt += ',(\''+cleaned[i]+'\',\''+topid+'\')';
              } else {
                stmt += '(\''+cleaned[i]+'\',\''+topid+'\')';
              }
            }
            db.query('insert into requests_'+teamid+' (docid,topid) values ' + [stmt], function(err2, results2){
              if(err2){
                utils.logError(db,teamid,404,'Unable to insert requests: ' + topid);
                console.log(err2);
              }
            });
          }
        });
      });
    })
  });
});

router.get('/mode/:groupid/:mode', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  db.query('select runid from manual_runs where groupid = ? and mode = ?;',[groupid,mode],function(err,results){
    if(err){
      res.status(404).send('Unable to retrieve runid')
      utils.logError(db,groupid,404,'Unable to retrieve runid');
    }else if(results.length === 0 ){
      res.status(404).send('Unable to retrieve runid')
      utils.logError(db,groupid,404,'Unable to retrieve runid');
    } else{
      res.json({"runid":results[0].runid})
    }
  });
});
router.get('/topics/:groupid/:mode', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  db.query('select topid,corpid,need,(select uri from corpora where corpid = t.corpid) as uri from topics t where mode = ? and mode in (select mode from allowed_modes where groupid = ?);',[mode,groupid],function(err,results){
    if(err){
      res.status(404).send('Unable to retrieve topics')
      utils.logError(db,groupid,404,'Unable to retrieve topics');
    }else{
      res.json(results);
    }
  });
});

// Manual identifiers are currently 12 character long compared to 10 characters
// for automatic runs.
// This was done to easily distinguish them.
// However, this is largely not useful and will be removed in the next iteration
function genManualID(){
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var ID = '';
  for(var i=0; i < 12; i++)
    ID += chars.charAt(Math.floor(Math.random()*chars.length));
  return ID;
}
router.get('/start/:groupid/:mode/:alias', function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  var alias = req.params.alias;
  db.query("select count(*) as count from trec_groups where groupid = ?;", [groupid], function(err, results){
    if(err){
      console.log("Group verification failed.");
      res.status(404).send("Not found.");
    } else if (results[0].count === 0){
      res.status(404).send("Unauthorized group");
      utils.logError(db,groupid,404,'Unauthorized group');
    } else {
      var id = genManualID();
      console.log(groupid + " " + id);
      db.query("insert into manual_runs (groupid,runid,mode,alias,ip) values (?,?,?,?,?);",[groupid,id,mode,alias,req.connection.remoteAddress], function(error, results2){
        if(error){
          res.status(404).send("Failed.");
          utils.logError(db,groupid,404,'Unable to register group');
        }else {
          res.json({runid:id,alias:alias,finalized:0,mode:mode});
          db.query("create table requests_"+id+" (id int NOT NULL AUTO_INCREMENT, docid text, topid text, time timestamp default current_timestamp, index (docid(40),topid(40)),primary key(id));", function(cerr,cres){
            if(cerr){
              console.log("Could not create request table for run: " + id);
            }
          });
        }
      });
    }
  });    
});
router.get('/runs/:groupid/:mode',function(req,res){
  var db = req.db;
  var groupid = req.params.groupid;
  var mode = req.params.mode;
  db.query('select runid,mode,finalized,alias from manual_runs where groupid = ? and mode = ?;',[groupid,mode],function(err,results){
    if(err){
      res.status(404).send("Unable to fetch runds");
      utils.logError(db,groupid,404,'Unable to fetch runs');
    }else{
      res.json(results);
    }
  })
});
router.get('/finalize/:runid', function(req,res){
  var db = req.db;
  var runid = req.params.runid;
  db.query('update manual_runs set finalized = 1 where runid = ?;', [runid], function(err,sqlres){
    if(err){
      res.status(400).send("Failed to finalize");
      utils.logError(db,runid,404,'Failed to finalize run');
    }else {
      res.status(200).send();
    }
  });
});
module.exports =router;
