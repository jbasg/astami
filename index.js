const net = require('net');
const Events = require('events');


/* config properties
* host, port ,username, secret,events, name
*/

function Ami(_config) {
  var config = _config;
  var socket = net.Socket();
  var data_received = '';
  var self = this;
  var EOL = '\r\n';
  var EOE = '\r\n\r\n';

  var callbacks = new Map();
  

  var action_id = (function(){
    var counter = 0;
    return function(){
      return counter++;
      //return Promise.resolve(counter++);
    }
  })()

  self.send = function (action,callback){
    callbacks.set(action,callback);
	  socket.write(action);
  }

  var msg_to_object = function(msg){
    var obj = {};
    msg.split("\n").forEach(function(e){
        var part = e.split(":");
        var key = part.shift().toLowerCase();
        var value = part.join(":") || '';

        key = key.replace(/-/g, '_').toLowerCase();
        value = value.replace(/^\s+/g, '').replace(/\s+$/g, '');

          if (key.match(/variable/) !== null && value.match(/=/) !== null ){
              var subval = value.split("=");
              if (!obj[key]){
                  obj[key] = {};
              }
              obj[key][subval[0].toLowerCase()] = subval[1].replace(/^\s+/g, '').replace(/\s+$/g, '');
          } else {
            obj[key] = value;
          }
    })
    return Promise.resolve(obj);    
  }

  var on_data = function(data){
    data_received = data_received.concat(data);
    var events = data_received.split(EOE);
    data_received = events.pop();
    events.forEach(function(it){ 
      self.emit('on_raw_data',it);
    })
  }

  var on_raw_data = function(data){
    msg_to_object(data)
      .then(function(rsp){
        //console.log(rsp);
        if (rsp.event) {
          self.emit('event',rsp);
        } else if (rsp.response) {
          self.emit('response',rsp);
        } else {
          console.log("WITHOUT TYPE",rsp);
        } 
      })
  }

  var on_first_connect = function(data){
    var re = new RegExp("Asterisk Call Manager","");
    if (data.match(re) === null) { 
      console.log("INVALID PEER, NOT AN ASTERISK?");
    } else {
     socket.on('data',on_data);
     var msg = `Action:login\nUsername:${config.username}\nsecret:${config.secret}\nactionid:${action_id()}\n\n`;
     console.log(msg);
     self.send(msg);
    }
  }

  var on_socket_error = function (error) {
    console.log("Socket Error",error);
  };

  var on_socket_close = function (had_error) {
    console.log("Socket Close",had_error);
  };

  var on_socket_timeout =  function () {
    console.log("Socket Timeout");
  };

  var on_socket_end = function(){
    console.log("Socket End");
  };



  this.on('on_raw_data',on_raw_data)

  socket.setEncoding('ascii');
  socket.once('data', on_first_connect);
  socket.on('error',on_socket_error);
  socket.on('close',on_socket_close);
  socket.on('timeout',on_socket_timeout);
  socket.on('end',on_socket_end);

  socket.connect(config.port || 5038,config.host);

}

Ami.prototype = Object.create(Events.EventEmitter.prototype)

module.exports = Ami;










