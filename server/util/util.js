/*
  This module contains general utility functions that
  are used across several modules.
*/

module.exports = {
  // Simple function to log errors to the error table
  logError : function(db, runid, code, msg){
    db.query('insert into errlog (runid,code,msg) VALUES ((?),(?),(?))',[runid,code,msg], function(err,res){
      if(err){
        console.log('Unable to log: ', runid, ' ', code, ' ',msg);
      }
    });
  },
  groupValid: function(db,groupid,res,func){
    db.query("select groupid from trec_groups where groupid = ?;", [groupid], function(err1,res1){
      if(err1){
        res.status(404).send("Runid verifcation failed");
        module.exports.logError(db,teamid,404,'Unable to verify run');
      }else if (res1.length === 0){
        res.status(404).send("Unauthorized access");
        module.exports.logError(db,teamid,404,'Unauthorized access');
      } else{
        func();
      }
    });    
  },
  // F,unction to ensure that the run identifier is valid and the group has
  // not said that they are done submitting runs
  validation: function(db, teamid, res, func){
    db.query("select * from teamids where runid = ? and groupid not in (select groupid from finished_groups);", [teamid], function(err1,res1){
    if(err1){
      res.status(404).send("Runid verifcation failed");
      module.exports.logError(db,teamid,404,'Unable to verify run');
    }else if (res1.length == 0){
      res.status(404).send("Unauthorized access");
      module.exports.logError(db,teamid,404,'Unauthorized access');
    } else{
      func();
    }
    });
  },
  // Determines if a run has been finalized
  // Used to facilitate the generation of live results
  // Evaluation is disabled if a mode is not in eval_modes table
  isdoneeval : function(db, teamid, res, func){
    db.query('select finalized from teamids where runid = ? and mode in (select mode from eval_modes);', [teamid], 
      function(err1,res1){
      if(err1){
        res.status(401).send("Runid verifcation failed");
        module.exports.logError(db,teamid,404,'Unable to verify run');
      } else if(res1.length === 0){
        res.status(401).send("Unauthorized. Run is either not complete or trying to evaluate an athome topic.");
        module.exports.logError(db,teamid,404,'Run not finalized or invalid evaluation attempt.');
      } else{
        func();
      }
    });
  },
  // A more general version of the negation of the above function
  isnotdone : function(db, teamid, res, func){
    db.query("select finalized from teamids where runid = ?;", [teamid], function(err1,res1){
    if(err1){
      res.status(401).send("Runid verifcation failed");
      module.exports.logError(db,teamid,404,'Unable to verify run');
    }else if(res1.length === 0){
      res.status(401).send("Unauthorized. Run not found");
      module.exports.logError(db,teamid,404,'Run not found');
    }else if (res1[0].finalized === 0){
      func();
    } else{
      res.status(401).send("Unauthorized. Done");
      module.exports.logError(db,teamid,404,'Run is done');
    }
  });    
  }
};
