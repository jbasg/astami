const net = require('net');
const Events = require('events');
const log = require('./logger.js');


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
  var responses = new Map();


  var action_id = (function(){
    var counter = 0;
    return function(){
      return `act_${counter++}`;
      //return Promise.resolve(counter++);
    }
  })()

  self.send = function (action,callback){
    make_action(action)
    .then(function(str_action){
      log.info("SEND ACTION ", str_action);
      callbacks.set(action.actionid,callback);
	    socket.write(str_action);
    })
    .catch(function(err){
    })
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

  var object_to_msg = function(obj){
    var msg = '';
    for (key in obj) { 
      if (key.toLowerCase()=== 'variables'){
        continue
      }
      msg = msg.concat(key).concat(": ").concat(obj[key]).concat(EOL)  
    }

    for (key in obj.variables){
      msg = msg.concat("variable: ").concat(key).concat("=").concat(obj.variables[key]).concat(EOL)
    }

    msg = msg.concat(EOL);

    return Promise.resolve(msg);
  }

  var obj_to_msg = function(object){
    var msg = JSON.stringify(a).replace(/[\"\{\}]/g,'').replace(/\:/g,": ").replace(/\,/g,EOL).concat(EOE);
    return Promise.resolve(msg);
  }

  var make_action = function(action){
    action.actionid = action_id();

    return object_to_msg(action);
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
    log.trace("ON_RAW_DATA",data);
    msg_to_object(data)
      .then(function(rsp){
        if (rsp.event) {
          self.emit('data_event',rsp);
          log.debug("ON_RAW_DATA","EVENT",rsp);
        } else if (rsp.response) {
          self.emit('data_response',rsp);
          log.debug("ON_RAW_DATA","RESPONSE",rsp);
        } else {
          log.warn("ON_RAW_DATA","NO TYPE",rsp);
        } 
      })
  }

  var on_data_event = function(event){
    if ( typeof (event.actionid) !== 'undefined'
      && (responses.has(event.actionid))
      && (responses.has(event.actionid)))
    {
      responses.get(event.actionid).events.push(event);
      if (event.eventlist === 'Complete') {
        callbacks.get(event.actionid)(responses.get(event.actionid));
        callbacks.delete(event.actionid);
        responses.delete(event.actionid);
      }
    } else {
      this.emit("ami_event",event);
      this.emit(`ami_event_${event.event}`,event);

    }
  }

  var on_data_response = function(response){
    if ( ( typeof(response.eventlist) != 'undefined')
          && (response.eventlist === 'start') )
    {
      response.events = [];
      log.debug('ON_DATA_RESPONSE', response);
      responses.set(response.actionid,response);
      console.log(responses.get(response.actionid));
      log.trace(responses.get(response.actionid));
    } else if ( callbacks.has(response.actionid)){
      callbacks.get(response.actionid)(response);
      callbacks.delete(response.actionid);
      responses.delete(response.actionid);
    }
  }

  var on_first_connect = function(data){
    var re = new RegExp("Asterisk Call Manager","");
    if (data.match(re) === null) { 
      log.error("ON_FIRST_CONNECT","Not Asterisk Call Manager connection");
    } else {
     socket.on('data',on_data);
     var msg = { action: 'Login' , username : config.username, secret : config.secret }
     //var msg = `Action:login\nUsername:${config.username}\nsecret:${config.secret}\nactionid:${action_id()}\n\n`;
     log.trace('ON FIRST CONNECT',msg);
     self.send(msg,function(err,data){ log.info(err,data)});
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

  this.on('data_event',on_data_event);
  this.on('data_response',on_data_response);

  socket.connect(config.port || 5038,config.host);

}

Ami.prototype = Object.create(Events.EventEmitter.prototype)

module.exports = Ami;










