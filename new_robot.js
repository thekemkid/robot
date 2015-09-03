var Raspi = require('raspi-io')
var five = require('johnny-five')
var raspi = new Raspi()
var board = new five.Board({
  io: raspi
})
var num = 1

var ports = [
  'GPIO18',
  'GPIO27',
  'GPIO22',
  'GPIO23',
  'GPIO24',
  'GPIO9'
]

var machines = [
  {
    ports: ['GPIO24', 'GPIO9', 'GPIO18'],
    ready: false,
    pins: {}
  },
  {
    ports : ['GPIO22', 'GPIO23', 'GPIO27'],
    ready: false,
    pins: {}
  }
];

var mqtt = require('mqtt').connect('mqtt://test.mosca.io')

board.on('ready', function () {

  machines.forEach(function(machine) {
    machine.pins = machine.ports.reduce(function (acc, port) {
      var pin = new five.Pin(port)
      acc[port] = pin
      return acc
    }, {})

    machine.reset = function () {
      this.ports.forEach(function (port) {
        var pin = this.pins[port]
        pin.low()
      })

      mqtt.publish('cocktail/' + num + '/status', 'online')
    }
  
    machine.start = function () {
      this.ports.forEach(function (port) {
        var pin = this.pins[port]
        pin.high()
      })
    }
  });

  reset()

  this.repl.inject(machines);

  function reset () {
    machines.forEach(function (machine) {
      machine.reset();
    });

    mqtt.publish('cocktail/' + num + '/status', 'online')
  }

  function startAll () {
    machines.forEach(function (machine) {
      machine.start();
    })

    setTimeout(reset, 60000)
  }
})
