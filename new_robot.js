var Raspi = require('raspi-io')
var five = require('johnny-five')
var raspi = new Raspi()
var board = new five.Board({
  io: raspi
})
var worker = 'pi1'
var mqtt;

var machines = [
  {
    id: 1,
    ports: ['GPIO24', 'GPIO9', 'GPIO18'],
    ready: true,
    pins: {}
  },
  {
    id: 2,
    ports : ['GPIO22', 'GPIO23', 'GPIO27'],
    ready: true,
    pins: {}
  }
];

board.on('ready', function () {

  mqtt = require('mqtt').connect('mqtt://192.168.1.83:2048');
  initMachines();
  mqtt.subscribe('pi1');

  var pin = 'GPIO4'
  var button = new five.Button(pin);

  button.on('down', function () {
    console.log('DOWN!')
  })

  this.repl.inject({
    machines: machines,
    button: button
  });

  mqtt.publish(worker, JSON.stringify({worker: worker, status: 'ready'}));

  mqtt.on('message', function(topic, message) {
    console.log(message.toString());
    message = JSON.parse(message.toString());
    if (message.jobs) {
      console.log('received jobs' + JSON.stringify(message.jobs, null, 2));
      //if both machines are ready to accept jobs
      if (machines.every(function(machine) { return machine.ready })) {
        message.jobs.forEach(function(job) {
          machines[job.pump].runJob(job)
        });
      }
    }
  });
})

function initMachines() {
  machines.forEach(function(machine) {
    machine.pins = machine.ports.reduce(function (acc, port) {
      var pin = new five.Pin(port)
      acc[port] = pin
      return acc
    }, {})

    machine.reset = function () {
      var machine = this;
      this.ports.forEach(function (port) {
        var pin = machine.pins[port];
        pin.low()
      })
    }
  
    machine.start = function () {
      var machine = this;
      this.ports.forEach(function (port) {
        var pin = machine.pins[port]
        pin.high()
      })
    }

    machine.runJob = function(job) {
      var machine = this;
      this.ready = false;
      console.log('running job on machine', machine.id)
      mqtt.publish(worker, JSON.stringify({status: 'running job on machine ' + machine.id}));
      

      machine.ports.forEach(function(port, index) {
        var pin = machine.pins[port];
        pin.high();

        setTimeout(function() {
          pin.low();
          this.ready = true;
        }, job.activations[index])
      })
    }
  })
}