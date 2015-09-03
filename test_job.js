var mqtt = require('mqtt').connect('mqtt://localhost:2048');

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
  }
}
var defs = {
  cocktails: cocktails,
  workers: {
    bob: {
      cocktails: ['bloody', 'spritz']
    },
    mark: {
      cocktails: ['spritz', 'spritz']
    }
  }
}

var jobs = [{
        id: 0,
        name: 'Matteo',
        cocktail: 'spritz',
        pump: 1,
        activations: defs.cocktails.spritz.activations
      }, {
        id: 3,
        name: 'David',
        cocktail: 'bloody',
        pump: 0,
        activations: defs.cocktails.bloody.activations
      }]


mqtt.on('connect', function() {
	mqtt.subscribe('pi1');
	mqtt.publish('pi1', JSON.stringify({jobs: jobs}));
	console.log('pushed messaged');
})

mqtt.on('message', function(topic, message) {
	console.log('received message', message.toString());
})