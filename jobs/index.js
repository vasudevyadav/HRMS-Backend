const cron = require('node-cron');

let everyminutes = cron.schedule('* * * * *', () => { 
  try {
    //Do something here
  } catch (error) {
    throw error;        
  }
});   

everyminutes.start();