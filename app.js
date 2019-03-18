var express = require('express');
var app = express();
var crypto = require('crypto');
var admin = require('./admin');
var simpleserver = require('./simpleserver');
var fs = require('fs');

var ini = require('./ini.default.js');

try {
    fs.lstatSync('./ini.js');
    var ini2 = require('./ini.js');
    for (var k in ini2) if (k!='database') ini[k]=ini2[k];
    
    if (ini2.database !== undefined) {
        for (var k in ini2.database) ini.database[k]=ini2.database[k];
    }
        
} catch(e) {
    console.log('File ini.js missing!');
}



var port=ini.port;
if (process.argv[2]!==undefined) port=parseInt(process.argv[2]);

var database={};
var session=[];
var models={};

for (var k in ini.database) { 
    if (models[ini.database[k].model]===undefined) {
      models[ini.database[k].model] = require('./models/'+ini.database[k].model);
    }
    database[k] = new models[ini.database[k].model]( ini.database[k] );
}


function parseCookies (rc) {
    var list = {};

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function md5(txt) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(txt);
    return md5sum.digest('hex');
}


var initApp = function() {
    for(var k in database) {
        if (!database[k].inited()) {
            database[k].init(initApp);
            return;
        } 
      
    }
    
    var server=new simpleserver(session);
    console.log('Database initialized!');


    app.use(express.static('public'));
    
    
    var io = require('socket.io').listen(app.listen(port, function () {
        console.log('App listening on port',port);
    }));
    
    
    io.sockets.on('connection', function (socket) {
        
        var cookies=parseCookies(socket.handshake.headers.cookie);
    
        if (typeof(cookies.sessid)!='undefined') {
            var hash=cookies.sessid;
        } else {
            var hash=md5(Math.random()+'_'+Date.now());
            socket.emit('cookie','sessid',hash);
        }
      
        if (typeof(session[hash])=='undefined') {
            session[hash]={};
        }
        
        session[hash].socket=socket;
        
        socket.on('disconnect',function() {
            console.log('Bye client ',hash);
            if (typeof(session[hash])!='undefined') {
                session[hash].socket=null;
            }
        });
                  

        socket.on('credentials',function(){
            fs.readFile('credentials.json',function(error,d) {
                socket.emit('credentials',JSON.parse(d));
            });
        });
                  
        console.log('Hello new client',hash); 
        var adm=admin(socket,session,hash,database,'./public',ini,console);
        server.run(socket);
        
        
        /*
        adm.debug(2,function(d){
            console.log(d);
            console.log(d.data[0]._elements);
            
        });
        */
        
    });

        
}


fs.writeFile(__dirname+'/app.pid',process.pid);

initApp();

