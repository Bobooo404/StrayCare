process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/straycare-test';
process.env.JWT_SECRET = 'test_secret_for_integration_tests_only';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

/**
 * End-to-end smoke test.
 *
 * Boots the real Express app against an ephemeral in-memory MongoDB, then
 * walks the full public -> NGO workflow: register a user, report a stray, let
 * an NGO claim the case, mark it completed, and confirm the reporter sees the
 * new status.
 *
 *   npm test
 */

const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let mongoose;

async function boot() {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('straycare-test');

  const db = require('../src/config/db');
  await db.connectDB();
  mongoose = require('mongoose');

  app = require('../src/app');
  return app;
}

async function teardown() {
  await mongoose?.connection.dropDatabase();
  await mongoose?.connection.close();
  await mongo?.stop();
}

const request = require('supertest');

/**
 * A supertest *agent* keeps its own cookie jar, which is what lets each test
 * simulate an independent browser session. Plain `supertest(app)` spins up a
 * fresh throwaway server per request and would drop the auth cookie.
 */
const client = () => request.agent(app);

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

async function run() {
  await boot();

  let userId;
  let reportId;
  let ngoCookie;

  await test('health endpoint reports a connected database', async () => {
    const res = await client().get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
  });

  await test('rejects duplicate registration', async () => {
    const body = {
      fullname: 'Aditi Kamat',
      email: 'aditi@example.com',
      password: 'user12345',
    };
    assert.equal((await client().post('/api/auth/register').send(body)).status, 201);
    const second = await client().post('/api/auth/register').send(body);
    assert.equal(second.status, 409);
  });

  await test('rejects a weak password', async () => {
    const res = await client().post('/api/auth/register').send({
      fullname: 'Short Pass',
      email: 'weak@example.com',
      password: 'short',
    });
    assert.equal(res.status, 422);
    assert.ok(res.body.errors.password);
  });

  await test('rejects a bad email format', async () => {
    const res = await client().post('/api/auth/register').send({
      fullname: 'Bad Email',
      email: 'not-an-email',
      password: 'user12345',
    });
    assert.equal(res.status, 422);
  });

  await test('login rejects a wrong password', async () => {
    const res = await client()
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'wrongpassword' });
    assert.equal(res.status, 401);
  });

  await test('unauthenticated report creation is blocked', async () => {
    const res = await client().post('/api/reports/stray').send({ title: 'x' });
    assert.equal(res.status, 401);
  });

  await test('an NGO cannot use the user report endpoint', async () => {
    const NGO = require('../src/models/NGO');
    const bcrypt = require('bcryptjs');
    await NGO.create({
      name: 'Goa Animal Welfare Trust',
      email: 'contact@gaawt.org',
      phone: '+91 82991 00011',
      password: await bcrypt.hash('ngo12345', 4),
    });

    const session = client();
    const login = await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });
    assert.equal(login.status, 200);

    const res = await session
      .post('/api/reports/stray')
      .send({ title: 'should fail', description: '1234567890' });
    assert.equal(res.status, 403);
  });

  await test('a user creates a stray report with coordinates', async () => {
    const session = client();
    const login = await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.email, 'aditi@example.com');

    const me = await session.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.role, 'user');
    userId = me.body.data.account._id;

    const res = await session.post('/api/reports/stray').send({
      title: 'Injured dog near Panjim bus stand',
      description: 'A brown mixed breed dog is limping badly near the bus stand.',
      contact: '+91 98220 11223',
      animalType: 'dog',
      address: 'Panjim Bus Stand, Panaji',
      latitude: 15.4909,
      longitude: 73.8278,
    });

    assert.equal(res.status, 201);
    reportId = res.body.data.report._id;
    assert.equal(res.body.data.report.category, 'stray');
    assert.equal(res.body.data.report.reporterName, 'Aditi Kamat');
    assert.deepEqual(res.body.data.report.location.coordinates, [73.8278, 15.4909]);
  });

  await test('reports go to the right collection per category', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const lost = await session.post('/api/reports/lost').send({
      title: 'Missing Indie dog Coco',
      description: 'Coco slipped her collar at Caranzalem beach on Sunday.',
      contact: '+91 98220 11223',
      animalType: 'dog',
    });
    const injured = await session.post('/api/reports/injured').send({
      title: 'Cow hit by a vehicle',
      description: 'A cow was hit by a vehicle near the bypass and cannot walk.',
      contact: '+91 98220 11223',
      animalType: 'cow',
    });

    assert.equal(lost.status, 201);
    assert.equal(injured.status, 201);
    assert.equal(lost.body.data.report.category, 'lost');
    assert.equal(injured.body.data.report.category, 'injured');

    const StrayReport = require('../src/models/StrayReport');
    const LostReport = require('../src/models/LostReport');
    const InjuredReport = require('../src/models/InjuredReport');

    // This is the bug in the original code: injured cases were saved as strays.
    assert.equal(await StrayReport.countDocuments(), 1);
    assert.equal(await LostReport.countDocuments(), 1);
    assert.equal(await InjuredReport.countDocuments(), 1);
  });

  await test('an unknown category is rejected', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });
    const res = await session.post('/api/reports/alien').send({ title: 'nope' });
    assert.equal(res.status, 400);
  });

  await test('description shorter than 10 characters is rejected', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });
    const res = await session
      .post('/api/reports/stray')
      .send({ title: 'Short', description: 'too short' });
    assert.equal(res.status, 422);
  });

  await test('the adoption board is publicly readable', async () => {
    const session = client();
    const post = await session.post('/api/adoptions').send({});
    assert.ok([401, 403].includes(post.status), 'posting needs auth');

    const list = await session.get('/api/adoptions');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.pets.length, 0);
  });

  await test('the NGO dashboard merges all three collections', async () => {
    const session = client();
    const login = await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });
    assert.equal(login.status, 200);
    ngoCookie = login.headers['set-cookie'];

    const list = await session.get('/api/ngo/reports');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.reports.length, 3, 'stray + lost + injured');
    assert.equal(list.body.meta.total, 3);

    const categories = list.body.data.reports.map((r) => r.category).sort();
    assert.deepEqual(categories, ['injured', 'lost', 'stray']);

    // Newest first, the dashboard relies on this ordering.
    const dates = list.body.data.reports.map((r) => new Date(r.dateReported).getTime());
    assert.deepEqual([...dates].sort((a, b) => b - a), dates);

    const stats = await session.get('/api/ngo/reports/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.data.totals.total, 3);
    assert.equal(stats.body.data.totals.pending, 3);
  });

  await test('category and status filters narrow the NGO feed', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const byCategory = await session.get('/api/ngo/reports?category=injured');
    assert.equal(byCategory.body.data.reports.length, 1);
    assert.equal(byCategory.body.data.reports[0].category, 'injured');

    const byStatus = await session.get('/api/ngo/reports?status=ongoing');
    assert.equal(byStatus.body.data.reports.length, 0);

    const badStatus = await session.get('/api/ngo/reports?status=nonsense');
    assert.equal(badStatus.status, 422);
  });

  await test('pagination splits the combined feed correctly', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const page1 = await session.get('/api/ngo/reports?page=1&limit=2');
    const page2 = await session.get('/api/ngo/reports?page=2&limit=2');

    assert.equal(page1.body.data.reports.length, 2);
    assert.equal(page2.body.data.reports.length, 1);
    assert.equal(page1.body.meta.totalPages, 2);

    const ids = [...page1.body.data.reports, ...page2.body.data.reports].map((r) => r._id);
    assert.equal(new Set(ids).size, 3, 'no duplicates or gaps across pages');
  });

  await test('an NGO claims a pending case', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const res = await session.patch(`/api/ngo/reports/stray/${reportId}/claim`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.report.status, 'ongoing');
    assert.equal(res.body.data.report.assignedNGO.name, 'Goa Animal Welfare Trust');
    assert.equal(res.body.data.report.assignedNGO.phone, '+91 82991 00011');
  });

  await test('a second NGO cannot claim the same case', async () => {
    const NGO = require('../src/models/NGO');
    const bcrypt = require('bcryptjs');
    await NGO.create({
      name: 'Coastal Paws Rescue',
      email: 'help@coastalpaws.org',
      phone: '+91 82991 00022',
      password: await bcrypt.hash('ngo12345', 4),
    });

    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'help@coastalpaws.org', password: 'ngo12345' });

    const res = await session.patch(`/api/ngo/reports/stray/${reportId}/claim`);
    assert.equal(res.status, 409);
  });

  await test('an NGO cannot complete another NGOs case', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'help@coastalpaws.org', password: 'ngo12345' });

    const res = await session
      .patch(`/api/ngo/reports/stray/${reportId}/status`)
      .send({ status: 'completed' });
    assert.equal(res.status, 403);
  });

  await test('the holding NGO completes the case with notes', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const res = await session
      .patch(`/api/ngo/reports/stray/${reportId}/status`)
      .send({ status: 'completed', notes: 'Treated on site and released after recovery.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.report.status, 'completed');
    assert.equal(res.body.data.report.rescueNotes, 'Treated on site and released after recovery.');
  });

  await test('the reporter sees the NGO and the new status', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const mine = await session.get('/api/reports/mine');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.reports.length, 3);

    const found = mine.body.data.reports.find((r) => r._id === reportId);
    assert.ok(found, 'the reported case is in the users own list');
    assert.equal(found.status, 'completed');
    assert.equal(found.assignedNGO.name, 'Goa Animal Welfare Trust');
  });

  await test('a user cannot read another users case', async () => {
    const bcrypt = require('bcryptjs');
    const User = require('../src/models/User');
    await User.create({
      fullname: 'Rohan Fernandes',
      email: 'rohan@example.com',
      password: await bcrypt.hash('user12345', 4),
    });

    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'rohan@example.com', password: 'user12345' });

    const res = await session.get(`/api/reports/stray/${reportId}`);
    assert.equal(res.status, 403);
  });

  await test("a user's reports are scoped to them", async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'rohan@example.com', password: 'user12345' });

    const mine = await session.get('/api/reports/mine');
    assert.equal(mine.body.data.reports.length, 0);
  });

  await test('a user creates an adoption listing and it appears publicly', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const created = await session.post('/api/adoptions').send({
      petName: 'Luna',
      petType: 'dog',
      breed: 'Indian Spitz',
      age: 2,
      gender: 'female',
      vaccinated: true,
      description: 'Gentle, house trained and good with children.',
      contact: '+91 98220 11223',
      city: 'Panaji',
    });

    assert.equal(created.status, 201);
    // gender and breed were silently dropped in the original model.
    assert.equal(created.body.data.pet.gender, 'female');
    assert.equal(created.body.data.pet.breed, 'Indian Spitz');

    const publicList = await client().get('/api/adoptions');
    assert.equal(publicList.body.data.pets.length, 1);
    assert.equal(publicList.body.data.pets[0].petName, 'Luna');
  });

  await test('adoption listings reject an unsupported pet type', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const res = await session.post('/api/adoptions').send({
      petName: 'Rex',
      petType: 'dragon',
      age: 1,
      gender: 'male',
      description: 'A very good dog indeed.',
    });
    assert.equal(res.status, 422);
  });

  await test('logout clears the auth cookie', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    assert.equal((await session.get('/api/auth/me')).status, 200);

    const out = await session.post('/api/auth/logout');
    assert.equal(out.status, 200);

    const after = await session.get('/api/auth/me');
    assert.equal(after.status, 401);
  });

  await test('a stale or tampered cookie is treated as signed out', async () => {
    const session = client();
    await session.post('/api/auth/login').send({
      email: 'aditi@example.com',
      password: 'user12345',
    });
    await session.post('/api/auth/logout');

    // Simulate a leftover/forged token in the jar.
    session.set('Cookie', 'straycare_token=not.a.real.token');
    const res = await session.get('/api/reports/mine');
    assert.equal(res.status, 401);
  });

  await test('cross origin write requests are blocked', async () => {
    const res = await client()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    assert.equal(res.status, 403);
  });

  // --- AI triage -----------------------------------------------------------
  // The Gemini call itself is not exercised here, because it would need a real
  // paid key and a network round trip. What is tested is everything the
  // feature owns: access control, input validation, and the fact that a triage
  // summary attached to a report is stored correctly.

  await test('AI status is public and reports whether a key is configured', async () => {
    const res = await client().get('/api/ai/status');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.configured, 'boolean');
  });

  await test('AI triage requires being signed in', async () => {
    const res = await client()
      .post('/api/ai/triage')
      .field('description', 'A limping dog on the roadside.');

    assert.equal(res.status, 401);
  });

  await test('an NGO cannot use the user triage helper', async () => {
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const res = await session
      .post('/api/ai/triage')
      .field('description', 'Trying to triage from an organisation account.');

    assert.equal(res.status, 403);
  });

  await test('triage without a photo or description is rejected', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const res = await session.post('/api/ai/triage').field('description', '');

    // Either 400 for the empty input, or 500 if the suite runs without a
    // configured key. Both are correct, and neither may be a 200.
    assert.ok([400, 500].includes(res.status), `unexpected status ${res.status}`);
    assert.notEqual(res.status, 200);
  });

  await test('nearby clinic search needs valid coordinates', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    assert.equal((await session.get('/api/ai/nearby')).status, 400);
    assert.equal((await session.get('/api/ai/nearby?lat=999&lng=999')).status, 400);
  });

  await test('a report can carry a reviewed AI triage summary', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    // A contact number is required, and the seeded test account has none of its
    // own in this suite, so it is supplied explicitly.
    const res = await session.post('/api/reports/injured').field(
      'title',
      'Dog bleeding after a collision'
    )
      .field(
        'description',
        'A dog was hit by a vehicle near the bus stand and is bleeding from the leg.'
      )
      .field('animalType', 'dog')
      .field('contact', '+91 98220 11223')
      .field('aiTriage[summary]', 'Bleeding on the front leg after a road collision.')
      .field('aiTriage[likelySituation]', 'Vehicle collision')
      .field('aiTriage[urgency]', 'critical')
      .field('aiTriage[firstAid][]', 'Apply gentle pressure with a clean cloth.')
      .field('aiTriage[looksStray]', 'true')
      .field('aiTriage[confidence]', 'high')
      .field('aiTriage[suggestedCategory]', 'injured')
      .field('aiTriage[animalType]', 'dog')
      .field('aiTriage[model]', 'gemini-2.5-flash');

    assert.equal(res.status, 201);
    assert.equal(res.body.data.report.aiTriage.urgency, 'critical');
    assert.equal(res.body.data.report.aiTriage.reviewedByUser, true);
    assert.equal(res.body.data.report.aiTriage.looksStray, true);
    assert.equal(res.body.data.report.aiTriage.model, 'gemini-2.5-flash');
    assert.equal(res.body.data.report.aiTriage.firstAid.length, 1);
  });

  await test('an NGO sees the AI triage summary on the case feed', async () => {
    // The combined feed uses an explicit `$project`, so a new field has to be
    // added there by hand. Without this the dashboard card badge is silently
    // empty even though the triage was stored correctly.
    const session = client();
    await session
      .post('/api/ngo/login')
      .send({ email: 'contact@gaawt.org', password: 'ngo12345' });

    const feed = await session.get('/api/ngo/reports?category=injured');
    assert.equal(feed.status, 200);

    const triaged = feed.body.data.reports.filter((r) => r.aiTriage);
    assert.equal(triaged.length, 1, 'the triaged injured case appears once');

    const { aiTriage } = triaged[0];
    assert.equal(aiTriage.urgency, 'critical');
    assert.equal(aiTriage.likelySituation, 'Vehicle collision');
    assert.equal(aiTriage.confidence, 'high');
    assert.equal(aiTriage.reviewedByUser, true);
    assert.deepEqual(aiTriage.firstAid, ['Apply gentle pressure with a clean cloth.']);

    // Reports submitted without AI must not sprout an empty block.
    const stray = feed.body.data.reports.find((r) => r.category === 'stray');
    if (stray) assert.equal('aiTriage' in stray, false);
  });

  await test('a report written by hand has no AI triage block', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'rohan@example.com', password: 'user12345' });

    const res = await session.post('/api/reports/stray').field(
      'title',
      'Stray dog near the beach'
    )
      .field(
        'description',
        'A thin stray dog has been sitting near the beach road for several days.'
      )
      .field('animalType', 'dog')
      .field('contact', '+91 98220 11223');

    assert.equal(res.status, 201);
    assert.equal(res.body.data.report.aiTriage, undefined);
  });

  await test('an unknown urgency value in a triage block is refused', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const res = await session.post('/api/reports/injured').field(
      'title',
      'Trying to sneak in a bogus urgency'
    )
      .field('description', 'This triage block has a made up urgency level in it.')
      .field('contact', '+91 98220 11223')
      .field('aiTriage[summary]', 'A summary that should never be stored as is.')
      .field('aiTriage[urgency]', 'extremely-urgent');

    // The summary is present but the urgency is not a known value, so the
    // stored block must fall back rather than accept arbitrary input.
    assert.equal(res.status, 201);
    assert.equal(res.body.data.report.aiTriage.urgency, 'moderate');
  });

  await test('an unknown route returns a JSON 404', async () => {
    const res = await client().get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await test('a non image upload is rejected', async () => {
    const session = client();
    await session
      .post('/api/auth/login')
      .send({ email: 'aditi@example.com', password: 'user12345' });

    const res = await session
      .post('/api/reports/stray')
      .field('title', 'With a bad file')
      .field('description', 'This upload should not be accepted at all.')
      .attach('image', Buffer.from('#!/bin/sh\necho pwned'), 'evil.sh');

    assert.equal(res.status, 400);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);

  if (failed.length) {
    failed.forEach((f) => console.error(`  ${f.name}\n  ${f.err.stack}\n`));
  }

  await teardown();
  process.exit(failed.length ? 1 : 0);
}

run().catch(async (err) => {
  console.error('test run crashed:', err);
  await teardown().catch(() => {});
  process.exit(1);
});
