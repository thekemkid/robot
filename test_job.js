var mqtt = require('mqtt').connect('mqtt://localhost:2048');
var Controller = require('@matteo.collina/cocktail-control');
var level = require('level')
var tmp = require('tmp')
var parallel = require('fastparallel')();

var cocktails = {
  bloody: {
    activations: [
      2000, // milleseconds
      1000,
      5000
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

var workers = {};

mqtt.on('connect', function() {
  mqtt.subscribe('connections');

  mqtt.publish('connections', {status: 'server connected'});
})

mqtt.on('message', function(topic, message) {

  message = JSON.parse(message);
  console.log('(Topic: '+topic+') Server received message', message);

  if(topic === 'connections') handleConnectionsTopicMessages();
  else handleOtherTopid();

  function handleConnectionsTopicMessages(){
    if(status === 'worker connected'){
      mqtt.subscribe(message.worker); // subscribe to the worker
      mqtt.publish(message.worker, JSON.stringify({status: 'enquiring'}));

      // controller emitted some jobs for the worker
      controller.on(message.worker, function(executables){
        mqtt.publish(message.worker, JSON.stringify({jobs:executables}));
      });
    }
  }

  function handleOtherTopic(){
    var worker = topic;
    if(status === 'ready'){
      console.log('worker ('+worker+') is ready');
      setTimeout(function(){
        controller.free(worker);
      }, 1456);
    }
    if(status === 'not ready'){
      //wait
    }
    if(status === 'button pressed'){
      controller.free(worker);
    }
  }
})



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