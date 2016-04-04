//Libs
var cluster = require('cluster');
var express = require('express');
var http = require('http');

//interaction with OS
var os = require('os');
var fs = require('fs');

//JSON body parsers (middleware)
var bodyParser = require('body-parser');

//database
var massive = require("massive");

//conf
var app = express();
app.use(bodyParser.json());         
app.use(bodyParser.urlencoded({ extended: true }));                                

//custom conf
var conf;

try {
	conf = JSON.parse(fs.readFileSync('conf.json', 'utf8'));
	}catch (e) {
		if (e.code === 'ENOENT') {
			console.log('No conf.json file detected.');
			process.exit();
		} else {
			throw e;
		}
	}
	
//Read conf
var AGENT_PORT 		= conf.Conf.General.AGENT_PORT;
var VERSION			= conf.Conf.General.VERSION;
var DB_HOST 		= conf.Conf.Database.DB_HOST;
var DB_PORT 		= conf.Conf.Database.DB_PORT;
var DB_NAME 		= conf.Conf.Database.DB_NAME;
var DB_USER 		= conf.Conf.Database.DB_USER;
var DB_PASSWORD 	= conf.Conf.Database.DB_PASSWORD;
var numProcesses 	= conf.Conf.Cluster.numProcesses;

//DB conn
var connectionString = "postgres://"+DB_USER+":"+DB_PASSWORD+"@"+DB_HOST+"/"+DB_NAME;
var massiveInstance = massive.connectSync({connectionString : connectionString})

app.set('db', massiveInstance);

//Darkwood AGENT PORT
var PORT = AGENT_PORT || 8000;

//Master logic
if (cluster.isMaster) {
	
    for (var i = 0; i < numProcesses; i++) {
        cluster.fork();
    }
	
	app.get('/status', function (req, res) {
		var jsonData = {"Version":VERSION, "Workers":[],"Instance Information":[]};
		
		info = [];
		
		//uptime
		info.push({"Uptime":os.uptime()});
		
		//platform
		info.push({"Platform":os.platform()});
		
		//home dir
		info.push({"Home dir":os.homedir()});
		
		//Free Memory
		info.push({"Free Memory":os.freemem()});
		
		//Hostname
		info.push({"Hostname":os.hostname()});
		
		
		//current workers	
		workers_list = []

		Object.keys(cluster.workers).forEach(function(id) {
			
			var id = 	cluster.workers[id].id;
			var state = cluster.workers[id].state;
			workers_list.push({"id":id,"state":state});
		
		});
		
		jsonData['Workers'] = workers_list;
		jsonData['Instance Information'] = info;
	
		//the response
		res.send(jsonData);
	});
	
	//The master node listen for requests, on a different port
	app.listen(PORT+1, function () {
		console.log('Master darkwood api working on port '+ parseInt(PORT+1));
	});
	
	// Listen for dying workers
	cluster.on('exit', function (worker) {
		// Replace the dead worker,
		console.log('Worker %d died, ', worker.id);
		cluster.fork();
	});

//Worker logic	
} else {
	
	app.post('/', function (req, res) {
	
		var db = app.get('db');

		var infoSQL = 'INSERT INTO metrics(data) VALUES ($1);';
		
		db.run(infoSQL, [req.body], function(err, savedMetric) {
			if(err) {
				console.log(err);
				//return res.send(err);
			} else {
				//console.log(savedMetric);
			}
		});
		
		res.send(req.body);
		
	});

	
	app.listen(8000, function () {
		console.log('Darkwood agent working on port '+ PORT +' with id ' + cluster.worker.id);
	});
}


process.on('uncaughtException', function(err) {
	if(err.errno === 'EADDRINUSE')
		console.log("Port "+ PORT +" is already in use");
	if(err.errno === 'ETIMEDOUT')
		console.log("TIMEOUT trying to connect to data base" + DB_NAME +" in host "+ DB_HOST);
	else
		console.log(err);
	process.exit(1);
});