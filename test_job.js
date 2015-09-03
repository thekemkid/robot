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

  logging('Server up!')
})

mqtt.on('message', function(topic, message) {

  logging(chalk.blue('(topic: '+topic+') ') + chalk.white(message.toString()));

  message = JSON.parse(message);

  if(topic === 'connections') handleConnectionsTopicMessages();
  else handleOtherTopic();

  function handleConnectionsTopicMessages(){
    if(message.status === 'worker here'){
      if(!connectedWorkers[message.worker]) workerConnected(message.worker);

      resetWorkerDisconnectTimeout(message.worker);
    }
  }

  function handleOtherTopic(){
    var worker = topic;

    if(!connectedWorkers[worker]) workerConnected(worker);
    resetWorkerDisconnectTimeout(worker);

    if(message.status === 'ready'){
      logging('worker ('+worker+') is ready');
      setTimeout(function(){
        controller.free(worker);
      }, 1456);
    }
    if(message.status === 'not ready'){
      //wait
    }
    if(message.status === 'button pressed'){
      controller.free(worker);
    }
  }
});

function workerConnected(worker){
  connectedWorkers[worker] = {};

  mqtt.subscribe(worker); // subscribe to the worker
  
  // controller emitted some jobs for the worker
  controller.on(worker, function(executables){
    mqtt.publish(worker, JSON.stringify({status: 'new jobs', jobs:executables}));
  });
}

function resetWorkerDisconnectTimeout(worker){
  if(connectedWorkers[worker].disconnectTimeout){
    clearTimeout(connectedWorkers[worker].disconnectTimeout);
  }

  connectedWorkers[worker].disconnectTimeout = setTimeout(function(){
    logging(chalk.red('Worker disconnected:') + worker);
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
})