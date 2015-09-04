var mqtt = require('mqtt').connect('mqtt://localhost:2048');
var chalk = require('chalk');
var Controller = require('@matteo.collina/cocktail-control');
var level = require('level')
var tmp = require('tmp')
var parallel = require('fastparallel')();

var cocktails = {
  bloody: {
    activations: [
      2000, // milleseconds
      1000,
      3000
    ]
  },
  spritz: {
    activations: [
      4000, // milleseconds
      8000,
      12000
    ]
  },
  vodka: {
    activations: [
     2000,
     2000,
     2000
    ]
  }
}

var defs = {
  cocktails: cocktails,
  workers: {
    pi1: {
      cocktails: ['bloody', 'spritz'] //cocktails a worker can make
    },
    pi2: {
      cocktails: ['vodka', 'spritz']
    }
  }
}

var dir = tmp.dirSync()
var db = level(dir.name)
var controller = Controller(db, defs)

var connectedWorkers = {};

mqtt.on('connect', function() {
  mqtt.subscribe('connections');

  Object.keys(defs.workers).forEach(function(key, index){
    mqtt.publish(key, JSON.stringify({status: 'ping'}));
  });

  logging(chalk.yellow('Server up!'));
})

mqtt.on('message', function(topic, message) {

  logging(chalk.blue('(topic: '+topic+') ') + chalk.white(message.toString()));

  message = JSON.parse(message);

  if      (topic === 'connections') handleConnectionsTopicMessages();
  else if (topic === 'admin') handleAdminMessages();
  else    handleOtherTopic();

  // handle connection topic logic.
  // the connection topic is a topic for meta information that is only relevant for the server.
  function handleConnectionsTopicMessages(){
    if(message.status === 'worker here'){
      if(!connectedWorkers[message.worker]) workerConnected(message.worker);

      resetWorkerDisconnectTimeout(message.worker);
    }
  }

  //handle admin topic logic
  function handleAdminMessages(){
    if(message.status === 'button press'){
      if(connectedWorkers[message.worker] && connectedWorkers[message.worker].ready){
        freeWorker(message.worker);
      } else {
        logging(chalk.red(chalk.bold('[ERROR] NOT READY TO FREE WORKER: ' + message.worker)));
      }
    }
  }

  // handle topics for workers.
  function handleOtherTopic(){
    var worker = topic;

    if(!connectedWorkers[worker]) workerConnected(worker);
    resetWorkerDisconnectTimeout(worker);

    if(message.status === 'ready'){
      if(!connectedWorkers[worker].ready) logging(chalk.yellow('worker is now ready: ' + worker));
      
      connectedWorkers[worker].ready = true;
    }
    if(message.status === 'not ready'){
      //wait
    }
    if(message.status === 'mix ready'){
      var job = message.job;
      logging(chalk.yellow('(ID: '+job.id+') Mix ready for ' + job.name + '. He ordered a ' + job.cocktail + '.'));
    }
    if(message.status === 'button pressed'){
      freeWorker(worker);
    }
  }
});

// params: worker - String.
//
// worker is a string of a workerID. 
//
// A worker will only be freed if it is connected and ready
//
// returns true if successfully freed worker.
// returns false if failure freeing.
function freeWorker(worker){
  if(connectedWorkers[worker] && connectedWorkers[worker].ready){
    logging(chalk.yellow('Freeing worker: ' + worker))
    controller.free(worker);
    return true;
  } 
  return false;
}

// method to handle logic of a worker connecting
function workerConnected(worker){
  connectedWorkers[worker] = {};

  mqtt.subscribe(worker); // subscribe to the worker
  
  // controller emitted some jobs for the worker
  controller.on(worker, function(executables){
    mqtt.publish(worker, JSON.stringify({status: 'new jobs', cocktails:executables}));
    connectedWorkers[worker].ready = false;
  });
}

// method to handle logic of a user timing out
function resetWorkerDisconnectTimeout(worker){
  if(connectedWorkers[worker].disconnectTimeout){
    clearTimeout(connectedWorkers[worker].disconnectTimeout);
  }

  connectedWorkers[worker].disconnectTimeout = setTimeout(function(){
    logging(chalk.red('Worker disconnected: ' + worker));
    mqtt.unsubscribe(worker);
    delete connectedWorkers[worker];
  }, 30000) 
}

function logging(str){
  console.log(chalk.green(new Date().toString()), chalk.white(str));
}

controller.enqueue({
  cocktail: 'spritz',
  name: 'Matteo'
}).enqueue({
  cocktail: 'spritz',
  name: 'Cian'
}).enqueue({
  cocktail: 'spritz',
  name: 'Tammy'
}).enqueue({
  cocktail: 'bloody',
  name: 'David'
}).enqueue({
  cocktail: 'bloody',
  name: 'Richard'
}).enqueue({
  cocktail: 'vodka',
  name: 'Glen'
})

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(__dirname+'/views/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
  socket.emit('current queue', controller.queue);
});