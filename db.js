// import mariadb
var mariadb = require('mariadb');

// create a new connection pool
const pool = mariadb.createPool({
  host: "127.0.0.1", 
  user: "root", 
  password: "estionkinorageon",
  database: "randomizer"
});

// expose the ability to create new connections
module.exports={
    getConnection: function(){
      return new Promise(function(resolve,reject){
        pool.getConnection().then(function(connection){
          resolve(connection);
        }).catch(function(error){
          reject(error);
        });
      });
    }
  } 