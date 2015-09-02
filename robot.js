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

var mqtt = require('mqtt').connect('mqtt://test.mosca.io')

board.on('ready', function () {

  var pins = ports.reduce(function (acc, port) {
    var pin = new five.Pin(port)
    acc[port] = pin
    return acc
  }, {})

  pins.reset = reset
  pins.startAll = startAll
  pins.mqtt = mqtt

  reset()

  mqtt.subscribe('cocktail/' + num + '/startAll')

  mqtt.on('message', startAll)

  this.repl.inject(pins)

  function reset () {
    ports.forEach(function (port) {
      var pin = pins[port]
      pin.low()
    })

    mqtt.publish('cocktail/' + num + '/status', 'online')
  }

  function startAll () {
    ports.forEach(function (port) {
      var pin = pins[port]
      pin.high()
    })

    setTimeout(reset, 60000)
  }
})
