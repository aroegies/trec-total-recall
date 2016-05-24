
var cluster = require("cluster");

if(cluster.isMaster){
  var count = 8;
  for(var i = 0; i < count; i += 1){
    cluster.fork();
  }
}else {
  var express = require("express");
  var bodyParser = require('body-parser');
  var morgan = require('morgan');
  var mysql = require("mysql");
  var busboy = require('connect-busboy')
  var app = express();
  var index = require('./routes/index.js');
  var topic = require('./routes/topic.js');
  var crawl = require('./routes/crawl.js');
  var submit = require('./routes/submit.js');
  var search = require('./routes/search.js');
  app.use(bodyParser.json({limit:'900mb'}));
  app.use(bodyParser.urlencoded({limit:'900mb',extended:true}));
  
  app.use(busboy())
  // TODO: Overall - ensure team validation occurs at all stages.
  var config = {
    host : 'localhost',
    database : 'total_recall',
    connectionLimit : 20
  };
  var winston = require('winston')
  winston.emitErrs = true;
  require('winston-mysql-transport').Mysql;
  var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
          level: 'debug',
          handleExceptions: true,
          json: false,
          colorize: true
        }),
        new winston.transports.Mysql({database : 'total_recall', host :'localhost', connectionLimit:15, table : 'log_table',user:" "})
    ],
    exitOnError:false
})
 logger.stream = {
    write: function(message,encoding){
      logger.info(message)
    }
  }
  

  app.use(morgan('combined',{'stream':logger.stream}));
  var connection = mysql.createPool(config);
  /*function retryOnDisconnect(){
    connection = mysql.createConnection(config);
    connection.connect(function(err){
      if(err){
       console.log('DB disconnect: ', err);
        setTimeout(retryOnDisconnect, 2000);
      }
    });
    connection.on('error', function(err){
      console.log('DB Error: ', err);
      if(err.code === "PROTOCOL_CONNECTION_LOST"){
        retryOnDisconnect();
      }
    });
  }
  retryOnDisconnect();*/

  app.use(function(req,res,next){
    res.setTimeout(0)
    req.setTimeout(0)
    req.db = connection;
    next();
  });
  app.use('/',index);
  app.use('/topic',topic);
  app.use('/crawl',crawl);
  app.use('/judge',submit);
  app.use('/search',search);
  app.use(express.static(__dirname+'/public'));
  var server = app.listen(33332,"0.0.0.0",function(){
    console.log('Listening on port %d', server.address().port);
  });
  server.setTimeout(0)
  server.on('connection',function(sock){
    var db = connection;
    db.query('select ip from disallowed_ips where ip = ?;',sock.remoteAddress,function(err,results){
      if(err){
        console.log('SQL check for IP address failed: ' + sock.remoteAddress);
      }else if(results.length !== 0){
        sock.end('Potential rogue process. Constant invalid request stream. Contact the track organizers to undo this operation.\n');
        sock.destroy();
      }else{
        console.log("Connecting address: " + sock.remoteAddress);
      }
    })
  });
}
