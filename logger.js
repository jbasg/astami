'use strict';


module.exports = {
    color : { info : "\x1b[32m", error : "\x1b[31m", warn : "\x1b[33m", debug : "\x1b[34m" ,trace: "\x1b[36m" } ,
    levels : ['trace','debug','info','warn','error'],
    level :0 ,
    set_level : function(lv) { level = lv },

    info : function(data){  this.write('info',Array.from(arguments)); },
    error  : function(data){  this.write('error',Array.from(arguments)); } ,
    warn : function(data){  this.write('warn',Array.from(arguments)); },
    debug : function(data){ this.write('debug',Array.from(arguments)); },
    trace : function(data){ this.write('trace',Array.from(arguments)); },
    write : function(tipo,data){
      if (this.levels.indexOf(tipo) <= this.level)
      {
        console.log(this.color[tipo],`[ ${new Date().toISOString() } ][${tipo.toUpperCase()}]`,data);
      }
    }
}


