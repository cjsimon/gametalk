// MQTT Setup
//var mqtt = require('mqtt');
var options = {
  port: 1883,
  host: '192.168.43.246',
  clientId: 'Game_MQTT_Publisher'
};
//var ////client = mqtt.connect(options);

var twilioclient = require('twilio')(
  "ACb683f5856834e7844d9005b7a43f316c",
  //process.env.TWILIO_ACCOUNT_SID,
  "9c70c204f5a2307c676b689e3ccc0302"
  //process.env.TWILIO_AUTH_TOKEN
);

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

// here's a fake hardware device that we'll expose to HomeKit
var GAME = {
  powerOn: false,
  brightness: 100, // percentage

  setPowerOn: function(on) { 
    console.log("Turning Game %s!", on ? "on" : "off");
    
    // Numbers
    // TODO: Sanitize the input that is coming in just in case the numbers were compromised
    var numbers = process.env.Numbers;
    
    // MQTT
    if(on) {
      ////client.publish('Game', 'on');
      
      numbers.forEach(function(number){
        twilioclient.messages.create({
          from: "+15072014108",
          to: number,
          body: "Game is running!",
          mediaUrl: "https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg"
        }, function(err, message) {
          if(err) {
            console.error(err.message);
          }
        });
      });
      
    } else {
      //client.publish('Game','off');
      
      numbers.forEach(function(number){
        twilioclient.messages.create({
          from: "+15072014108",
          to: number,
          body: "Game is no longer running...",
          mediaUrl: "https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg"
        }, function(err, message) {
          if(err) {
            console.error(err.message);
          }
        });
      });
      
    }
  },
  setBrightness: function(brightness) {
    console.log("Setting light brightness to %s", brightness);
    GAME.brightness = brightness;
  },
  identify: function() {
    console.log("Identify the light!");
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var light = exports.accessory = new Accessory('Light', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3C:4D:5E:FF";
light.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Oltica")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
light.on('identify', function(paired, callback) {
  GAME.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
light
  .addService(Service.Lightbulb, "Game") // services exposed to the user should have "names" like "Game" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    GAME.setPowerOn(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });
  

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    
    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    
    var err = null; // in case there were any problems
    
    if (GAME.powerOn) {
      console.log("Are we on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we on? No.");
      callback(err, false);
    }
  });

// also add an "optional" Characteristic for Brightness
light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    callback(null, GAME.brightness);
  })
  .on('set', function(value, callback) {
    GAME.setBrightness(value);
    callback();
  })
