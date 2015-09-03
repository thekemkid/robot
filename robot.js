//var Raspi = require('raspi-io')
//var five = require('johnny-five')
//var raspi = new Raspi()
//var board = new five.Board({
//  io: raspi
//})
var worker = process.argv[2] || 'default';
var mqtt = require('mqtt').connect('mqtt://localhost:2048');
var when = require('when-conditional');

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

initMachines();

mqtt.subscribe('pi1');
mqtt.publish('connections', JSON.stringify({status: 'worker connected', worker: worker}));
//mqtt.publish(worker, JSON.stringify({worker: worker, status: 'ready'}));

mqtt.on('message', function(topic, message) {

  console.log(message.toString());

  message = JSON.parse(message.toString());
  if (message.jobs) {
    console.log('received jobs' + JSON.stringify(message.jobs, null, 2));
    //if both machines are ready to accept jobs
    if (machines.every(function(machine) { return machine.ready })) {
      var finishedJobs = 0;
      message.jobs.forEach(function(job) {
        machines[job.pump].runJob(job, function(){
          finishedJobs++;
        });
      });

      when(function(){return finishedJobs === 2}, function(){
        console.log('machines for worker (' + worker + ') finished jobs:', message.jobs);
        
        mqtt.publish(worker, JSON.stringify({worker: worker, status: 'ready'}));
      });
    }
  }
});

function initMachines() {
  machines.forEach(function (machine) {
    machine.pins = machine.ports.reduce(function (acc, port) {
      var pin = {
        high: function(){
          console.log('pin high for port:', port);
        },
        low: function(){
          console.log('pin low for port:', port);
        }  
      }
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

    machine.runJob = function(job, cb) {
      var machine = this;

      machine.ready = false;

      var finished = 0;
      console.log('running job on machine', machine.id)
      mqtt.publish(worker, JSON.stringify({status: 'running job on machine ' + machine.id}));
      

      machine.ports.forEach(function(port, index) {
        var pin = machine.pins[port];
        pin.high();

        setTimeout(function() {
          pin.low();
          finished++;
        }, job.activations[index])
      })

      when(function(){return finished === 3;}, function(){
        machine.ready = true
        console.log('machine (' + machine.id + ') finished job:', job);
        cb();
      })
    }
  })
}
