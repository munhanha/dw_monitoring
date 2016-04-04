//Libs
var cluster = require('cluster');
var express = require('express');
var router = express.Router();
var http = require('http');
var path = require('path');

//interaction with OS
var os = require('os');
var fs = require('fs');

//database
var massive = require("massive");

//conf
var app = express();

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
var API_PORT 		= conf.Conf.General.API_PORT;
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

//Darkwood API PORT
var PORT = API_PORT || 7000;

app.use(express.static('public'));

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

	router.use(function(req, res, next) {
		var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
		var date  = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
		console.log('Time: ', date,'From: ',ip, req.method, req.url);	
		next(); 
	});
	//Main page
	router.get('/', function(req, res) {
	
		res.sendFile(path.join(__dirname + '/public/index.html'));
		
	});
	//Demo Infrastructure page
	router.get('/demo_infrastructure/', function(req, res) {
	
		res.sendFile(path.join(__dirname + '/public/demo_infrastructure.html'));
		
	});
	//Demo Host page
	router.get('/demo_host/', function(req, res) {
	
		res.sendFile(path.join(__dirname + '/public/demo_host.html'));
		
	});
	//Demo Instance page
	router.get('/demo_instance/', function(req, res) {
	
		res.sendFile(path.join(__dirname + '/public/demo_instance.html'));
		
	});
	
	//host queries
	router.get('/hosts/websphere/', function (req, res) {
		
		var db = app.get('db');
		
		//querie to be made
		var querie = conf.Conf.Queries.Hosts.websphere;
	
		db.run(querie, [], function(err, result) {
			//error 500
			if(err) {
				console.log(err);
				res.sendStatus(500);
			} else {
				
				/*if (!result[0] || result[0].data == null){
					return res.sendStatus(204);
				}*/
				
				return res.send(result);
			}
		});
	});
	
	//Websphere
	router.get('/:host/websphere/:trigram?/:option?/:resource?/', function (req, res) {

		var db = app.get('db');
		
		//fixed params
		var host = req.params['host'];
		var trigram = req.params['trigram'];
		if (trigram){trigram = trigram.toLowerCase();}
		var option = req.params['option'];
		var resource = req.params['resource'];
		
		//Sanitize input
		if (!/^\w+$/i.test(host) || host.length>12) {return res.sendStatus(400);}
		if (trigram && (!/^\w+$/i.test(trigram) || trigram.length>6)) {return res.sendStatus(400);}
		if (option && option.length>10) {return res.sendStatus(400);}
		if (resource && (!/^\w+$/i.test(resource) || host.length>12)) {return res.sendStatus(400);}
				
		//optional params
		var limit = req.query.limit || 1;
		if (limit > conf.Conf.Metrics.max_limit){limit = conf.Conf.Metrics.max_limit;}
		
		//last status
		var last_status = req.query.last_status;
		if (last_status) {
			last_status = last_status.toUpperCase();
			if (conf.Conf.Metrics.websphere_status.indexOf(last_status) < 0){
				return res.sendStatus(400);
			}
			limit = 1;
		}
		if (last_status && resource) {return res.sendStatus(400);}
		
		
		//querie to be made
		var querie = conf.Conf.Queries.Websphere.all;
		
		if (trigram) {
			querie = conf.Conf.Queries.Websphere.trigram;
			
			if (option) {
				querie = conf.Conf.Queries.Websphere.option;
				
				if (resource) {
					querie = conf.Conf.Queries.Websphere.resource;
				}
				//if last_status you cannot choose a resource
				if (last_status) {
					querie = conf.Conf.Queries.Websphere.last_status;
				}
				
			}
		}
		
		//for the fixed parts (horrible solution)
		querie = querie.split("REPLACE_HOST").join(host);
		querie = querie.split("REPLACE_TRIGRAM").join(trigram);
		querie = querie.split("REPLACE_OPTION").join(option);
		querie = querie.split("REPLACE_RESOURCE").join(resource);
		querie = querie.split("REPLACE_STATUS").join(last_status);
		
		
		db.run(querie, [limit], function(err, result) {
			//error 500
			if(err) {
				console.log(err);
				res.sendStatus(500);
			} else {
				
				if (!result[0] || result[0].data == null){
					return res.sendStatus(204);
				}
				if (limit > 1){
					return res.send(result);
				}
				else{return res.send(result[0]);}
			}
		});
	});
	
	//default 404
	router.get('*', function(req, res){
		res.sendStatus(404);
	});

	//Where the route will be applied
	app.use('/api/', router);

	app.listen(PORT, function () {
		console.log('Darkwood api working on port '+ PORT +' with id ' + cluster.worker.id);
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