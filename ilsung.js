//"use strict";
const SerialPort = require('serialport');
// const ByteLength = require('./byte-length');
const Readline = SerialPort.parsers.Readline;
const port = new SerialPort('/dev/ttyAMA0',{
// baudRate: 115200
   baudRate: 230400
// baudRate: 38400
});
//const parser = port.pipe(new ByteLength({length:811}));
const parser = new Readline();
port.pipe(parser);

port.on('open',function(err){
   if(err) return console.log('Error on write : '+ err.message);
   console.log('serial open');
});

port.on('error', function(err) {
    console.log('Error: ', err.message);
    console.log('Error Occured');
});

const eventEmitter = require('events');
class MyEmitter extends eventEmitter{};
const myEmitter = new MyEmitter();

var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var cons         = require('consolidate');

var routes    = require('./routes/index');
var users     = require('./routes/users');
var receiver  = require('./lib/receiver');
var debug     = require('debug')('ploty:server');
var portAddr  = process.env.PORT || '3000';

//--- create express application
var app = express();
app.set('port', portAddr);

//--- create server
var server = require('http').Server(app);

//--- connect socket.io to server
var io = require('socket.io')(server);

//--- view engine setup
app.engine('html',cons.swig);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

//--- uncomment after placing your favicon in /public
//--- app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


var count = 0 
var channel = 0;
var dataLength = 600;
var traceOnOff =0;			// 1 --> send tarace data to client
var monitorOnOff = 0;
var getCodeList = 0;
//--- start server
console.log('http on : ' + portAddr.toString());
server.listen(portAddr);

//--- socket.io support

io.on('connection', function (socket) {
	var host  = socket.client.request.headers.host;
	console.log('connected to : ' + host);
	socket.on('disconnect', function () {
  	console.log('disconnected from : ' + host);
  });

//	socket.on('codeTable',function(from,msg){
	socket.on('codeTable',function(msg){
  	console.log('received codeTable request',msg);
  });

	socket.on('traceOnOff',function(msgTx){
		traceOnOff = msgTx;
		traceCount = 0;
	});

	socket.on('getCodeList',function(msg){
		port.write('9:4:901:0.000e+0');
		getCodeList = 1;
	});

	socket.on('btnClick',function(msgTx){
		var digitalOut = 1;
  });

	socket.on('monitor',function(msg){
		traceOnOff = 0;
		monitorOnOff = msg;
		console.log('rx monitor');
  });

	//--- emitt graph proc 
	myEmitter.on('event',function(param){
		socket.emit('graph',param);
	});    

	myEmitter.on('monitor',function(param){
		socket.emit('monitor',param);
	});    

	myEmitter.on('codeTable',function(msg){
		socket.emit('codeTable',msg);
	});    
	//-- end of emitt grpah proc
/*
	setInterval(function() {
		traceData.state = machineState;
		// socket.emit('trace',traceData);
	},2000);
*/
});

var graphData=[[],[],[],[]];
var graphProcCount = 0;
var testMsg = {data:[]};
var buffer2 = new Buffer(811);
var buffer3 = new Buffer(811);

parser.on('data',function (data){
	var temp1 = 0;
	var temp2 = 0;
	var y =0;

	if(getCodeList){

		//console.log(data);
		var tmp1 = data.split(':');

//		tmp1.forEach(function(key){
//			console.log(key);
//		});
		
		getCodeList = 0;		
		myEmitter.emit('codeTable', data);
		return;

	}else if( traceOnOff){

		console.log('data = %d',data.length);
		temp1 = data.length-4;
		y = data.slice(temp1,temp1+4);
		var ch = y.toString();
		var tmp1 = data.split(',');

		var graphArry =[];

		for( var i = 0; i< 100; i++){
			graphArry.push( tmp1[i] * 1);
		}

		if		 ( ch[2] == '0') graphData[0] = graphArry;
		else if( ch[2] == '1') graphData[1] = graphArry;
		else if( ch[2] == '2') graphData[2] = graphArry;
		else if( ch[2] == '3'){
			graphData[3] = graphArry;
			//socket.emit('graph',graphData);
			myEmitter.emit('event', graphData);
		}      		

		return;
	}else if(monitorOnOff){
		// console.log(data);
		myEmitter.emit('monitor',data);
		return;
	}else{
		console.log(data);
		return;
	}	
	return;

});

setInterval(function() {
	if(traceOnOff){
	  port.write('9:4:900:1.000e+2');
	}else	if(monitorOnOff){
	  port.write('9:4:900:0.000e+0');
	}
},2000);

var exec = require('child_process').exec;

function shutdown(callback){
	exec('shutdown now', function(error, stdout, stderr){ callback(stdout); });
}

var gracefulShutdown = function() {
  console.log("Received kill signal, shutting down gracefully.");
  server.close(function() {
    console.log("Closed out remaining connections.");
    process.exit()
  });
  
   // if after 
   setTimeout(function() {
       console.error("Could not close connections in time, forcefully shutting down");
       process.exit()
  }, 10*1000);
}

process.on('SIGTERM', function () {
    process.exit(0);
});

process.on('SIGINT', function () {
    process.exit(0);
});
 
process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    process.exit(0);
});

