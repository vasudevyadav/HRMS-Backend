jest.setTimeout(30000);
/**
 * auth.test.js
 * @description :: contains test cases of APIs for authentication module.
 */
const dotenv = require('dotenv');
dotenv.config();
process.env.NODE_ENV = 'test';
const db = require('mongoose');
const request = require('supertest');
const { MongoClient } = require('mongodb');
const app = require('../../app');
const authConstant = require('../../constants/authConstant');
const uri = process.env.DB_TEST_URL;

const client = new MongoClient(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

let insertedUser = {};

/**
 * @description : model dependencies resolver
 */
beforeAll(async () => {
  try {
    await client.connect();
    const dbInstance = client.db('hrms-test');

    const user = dbInstance.collection('users');
    insertedUser = await user.insertOne({
      username: 'Yvonne.Becker31',
      password: '2xD1rw5aoyZ9lvd',
      email: 'Tate_Konopelski@hotmail.com',
      name: 'Mr. Kari Schulist',
      userType: 658,
      mobileNo: '(951) 611-4860',
      resetPasswordLink: {},
      loginRetryLimit: 955,
      loginReactiveTime: '2024-08-20T09:12:55.133Z',
      id: '66a71eb30dd43405eb690895',
    });
  } catch (error) {
    console.error(`we encountered ${error}`);
    throw error; // Fail the tests if there's an error
  }
});

// test cases

describe('POST /register -> if email and username is given', () => {
  test('should register a user', async () => {
    const registeredUser = await request(app)
      .post('/super-admin/auth/register')
      .send({
        username: 'Fredrick19',
        password: '4QmTY7dx3aqGdId',
        email: 'Wade78@yahoo.com',
        name: 'Cheryl Marks',
        userType: authConstant.USER_TYPES.SUPER_ADMIN,
        mobileNo: '(130) 759-3307',
        addedBy: insertedUser.insertedId,
        updatedBy: insertedUser.insertedId,
      });
    expect(registeredUser.statusCode).toBe(200);
    expect(registeredUser.body.status).toBe('SUCCESS');
    expect(registeredUser.body.data).toMatchObject({ id: expect.any(String) });
  });
});

describe('POST /login -> if username and password is correct', () => {
  test('should return user with authentication token', async () => {
    const user = await request(app).post('/super-admin/auth/login').send({
      username: 'Fredrick19',
      password: '4QmTY7dx3aqGdId',
    });
    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('SUCCESS');
    expect(user.body.data).toMatchObject({
      id: expect.any(String),
      token: expect.any(String),
    });
  });
});
describe('POST /login -> if username is incorrect', () => {
  test('should return unauthorized status and user not exists', async () => {
    let user = await request(app).post('/super-admin/auth/login').send({
      username: 'wrong.username',
      password: '4QmTY7dx3aqGdId',
    });

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('POST /login -> if password is incorrect', () => {
  test('should return unauthorized status and incorrect password', async () => {
    let user = await request(app).post('/super-admin/auth/login').send({
      username: 'Fredrick19',
      password: 'wrong@password',
    });

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('POST /login -> if username or password is empty string or has not passed in body', () => {
  test('should return bad request status and insufficient parameters', async () => {
    let user = await request(app).post('/super-admin/auth/login').send({});

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('POST /forgot-password -> if email has not passed from request body', () => {
  test('should return bad request status and insufficient parameters', async () => {
    let user = await request(app)
      .post('/super-admin/auth/forgot-password')
      .send({ email: '' });

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('POST /forgot-password -> if email passed from request body is not available in database ', () => {
  test('should return record not found status', async () => {
    let user = await request(app)
      .post('/super-admin/auth/forgot-password')
      .send({ email: 'unavailable.email@hotmail.com' });

    expect(user.statusCode).toBe(404);
    expect(user.body.status).toBe('RECORD_NOT_FOUND');
  });
});

describe('POST /forgot-password -> if email passed from request body is valid and OTP sent successfully', () => {
  test('should return success message', async () => {
    let user = await request(app)
      .post('/super-admin/auth/forgot-password')
      .send({ email: 'Tate_Konopelski@hotmail.com' });

    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('SUCCESS');
  });
});

describe('POST /validate-otp -> OTP is sent in request body and OTP is correct', () => {
  test('should return success', () => {
    return request(app)
      .post('/super-admin/auth/login')
      .send({
        username: 'Fredrick19',
        password: '4QmTY7dx3aqGdId',
      })
      .then((login) => () => {
        return request(app)
          .get(`/super-admin/user/${login.body.data.id}`)
          .set({
            Accept: 'application/json',
            Authorization: `Bearer ${login.body.data.token}`,
          })
          .then((foundUser) => {
            return request(app)
              .post('/super-admin/auth/validate-otp')
              .send({ otp: foundUser.body.data.resetPasswordLink.code })
              .then((user) => {
                expect(user.statusCode).toBe(200);
                expect(user.body.status).toBe('SUCCESS');
              });
          });
      });
  });
});

describe('POST /validate-otp -> if OTP is incorrect or OTP has expired', () => {
  test('should return invalid OTP', async () => {
    let user = await request(app)
      .post('/super-admin/auth/validate-otp')
      .send({ otp: '12334' });

    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('FAILURE');
  });
});

describe('POST /validate-otp -> if request body is empty or OTP has not been sent in body', () => {
  test('should return insufficient parameter', async () => {
    let user = await request(app)
      .post('/super-admin/auth/validate-otp')
      .send({});

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('PUT /reset-password -> code is sent in request body and code is correct', () => {
  test('should return success', () => {
    return request(app)
      .post('/super-admin/auth/login')
      .send({
        username: 'Fredrick19',
        password: '4QmTY7dx3aqGdId',
      })
      .then((login) => () => {
        return request(app)
          .get(`/super-admin/user/${login.body.data.id}`)
          .set({
            Accept: 'application/json',
            Authorization: `Bearer ${login.body.data.token}`,
          })
          .then((foundUser) => {
            return request(app)
              .put('/super-admin/auth/validate-otp')
              .send({
                code: foundUser.body.data.resetPasswordLink.code,
                newPassword: 'newPassword',
              })
              .then((user) => {
                expect(user.statusCode).toBe(200);
                expect(user.body.status).toBe('SUCCESS');
              });
          });
      });
  });
});

describe('PUT /reset-password -> if request body is empty or code/newPassword is not given', () => {
  test('should return insufficient parameter', async () => {
    let user = await request(app)
      .put('/super-admin/auth/reset-password')
      .send({});

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('PUT /reset-password -> if code is invalid', () => {
  test('should return invalid code', async () => {
    let user = await request(app).put('/super-admin/auth/reset-password').send({
      code: '123',
      newPassword: 'testPassword',
    });

    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('FAILURE');
  });
});

/*
 * afterAll(function (done) {
 * db.connection.db.dropDatabase(function () {
 *  db.connection.close(function () {
 *    done();
 *  });
 * });
 * });
 */

afterAll(async () => {
  await client.close();
  db.connection.db.dropDatabase(() => {
    db.connection.close();
  });
});
