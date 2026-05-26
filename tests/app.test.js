const request = require('supertest');
const app = require('../src/app');

describe('GET /', () => {
  it('should return welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Welcome to the DevOps Demo API');
    expect(res.body.version).toBe('1.0.0');
  });
});

describe('GET /health', () => {
  it('should return status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('GET /users', () => {
  it('should return list of users', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /users/:id', () => {
  it('should return a single user', async () => {
    const res = await request(app).get('/users/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.name).toBe('Alice');
  });

  it('should return 404 for unknown user', async () => {
    const res = await request(app).get('/users/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});

describe('POST /users', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Charlie', email: 'charlie@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Charlie');
    expect(res.body.id).toBeDefined();
  });

  it('should return 400 when fields are missing', async () => {
    const res = await request(app).post('/users').send({ name: 'NoEmail' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Name and email required');
  });
});

describe('DELETE /users/:id', () => {
  it('should delete an existing user', async () => {
    const res = await request(app).delete('/users/1');
    expect(res.statusCode).toBe(204);
  });

  it('should return 404 when user not found', async () => {
    const res = await request(app).delete('/users/999');
    expect(res.statusCode).toBe(404);
  });
});
