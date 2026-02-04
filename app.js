/**
 * app.js
 * Use `app.js` to run your app.
 * To start the server, run: `node app.js`.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
global.__basedir = __dirname;
const postmanToOpenApi = require('postman-to-openapi');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
require('./config/db');
require('./workers/emailWorker');
const listEndpoints = require('express-list-endpoints');
const passport = require('passport');
const User = require('./model/user');
const dbService = require('./utils/dbService');

let logger = require('morgan');
const { userPassportStrategy } = require('./config/userPassportStrategy');
const app = express();
const corsOptions = { origin: process.env.ALLOW_ORIGIN };
app.use(cors(corsOptions));

//template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(require('./utils/response/responseHandler'));

//all routes
const routes = require('./routes');
// app.use(require('./middleware/activityLog').addActivityLog);

userPassportStrategy(passport);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(routes);

//swagger Documentation
postmanToOpenApi(
  'postman/postman-collection.json',
  path.join('postman/swagger.yml'),
  { defaultTag: 'General' }
)
  .then((data) => {
    let result = YAML.load('postman/swagger.yml');
    result.servers[0].url = '/';
    app.use('/swagger', swaggerUi.serve, swaggerUi.setup(result));
  })
  .catch((e) => {
    console.log('Swagger Generation stopped due to some error');
  });

app.get('/', (req, res) => {
  res.render('index');
});
// Start cron jobs
require('./crons/autoLogout.cron');
if (process.env.NODE_ENV !== 'test') {
  require('./jobs');
  const {
    seedData:seeder, seedSuperAdminSettings, seedDeleteLeaveRecord
  } = require('./seeders');
  const allRegisterRoutes = listEndpoints(app);
  seedSuperAdminSettings();
  seedDeleteLeaveRecord();
  dbService
    .findOne(User, { userType: 1 })
    .then((res) => {
      if (!res) {
        seeder(allRegisterRoutes).then(() => {
          console.log('Seeding done.');
        });
      }
    })
    .catch((e) => {
      console.log('User not found, some error occurred');
    });

  // seeder(allRegisterRoutes).then(()=>{console.log('Seeding done.');});
  app.listen(process.env.PORT, () => {
    console.log(`your application is running on ${process.env.PORT}`);
  });
} else {
  module.exports = app;
}
