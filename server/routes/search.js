var express = require('express');
var router = express.Router();
var utils = require('../util/util.js');
var csv = require('csv')

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
router.get('/:corpid/:query/:docno', function(req, res, next){
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
router.get('/judge/:groupid/:corpid/:topid/:docid', function(req, res, next){
  var docid = req.params.docid;
  var topid = req.params.topid;
  var corpid = req.params.corpid;
  db.query('select topid from topics where corpid = ? and topid = ?',[corpid,topid],function(err,results){
    if(err){
      res.status(404).send('Invalid corpus and topic pair: ' + corpid + ' ' + topid)
      return;
    }
    var stmt = 'select if ((select mode from corpora where corpid = ?) in (select mode from allowed_modes where groupid = ?),1,0);'
    db.query(stmt,[corpid,groupid], function(err1,results){
      if(err1 || results[0] === 0){
        res.status(404).send('Invalid corpus and group identifier: ' + corpus + ' ' + groupid);
        return;
      }
      db.query('select rel from judgements_'+topid+' where docid = ?;',docid,function(err2,results){
        res.json({docid:docid,judgement:results[0].rel});
      });
    });
  });
});
router.get('/judge/:groupid/:corpid/:topid/:docid', function(req, res, next){
  var docid = req.params.docid;
  var topid = req.params.topid;
  var corpid = req.params.corpid;
  var groupid = req.params.groupid;
  db.query('select topid from topics where corpid = ? and topid = ?',[corpid,topid],function(err,results){
    if(err){
      res.status(404).send('Invalid corpus and topic pair: ' + corpid + ' ' + topid)
      return;
    }
    var stmt = 'select if ((select mode from corpora where corpid = ?) in (select mode from allowed_modes where groupid = ?),1,0);'
    db.query(stmt,[corpid,groupid], function(err1,results){
      if(err1 || results[0] === 0){
        res.status(404).send('Invalid corpus and group identifier: ' + corpus + ' ' + groupid);
        return;
      }
      stmt = "select t.* from topics t join corpora c where c.corpid = ? and c.mode = t.mode and t.id > (select id from topics where topid = ?) limit 1;"
      db.query(stmt, [corpid,topid], function(err,results){
        if(err){
          res.status(404).send('Next topic failed for topic: ' + topid);
          return;
        }else if (results.length == 0){
          res.json({topic:-1,corpus:-1});
        } else {
          res.json({topic:results[0].topid,corpus:results[0].corpid});
        }
      });
    });
  });
});
module.exports = router
