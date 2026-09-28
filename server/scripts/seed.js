require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const NGO = require('../src/models/NGO');
const StrayReport = require('../src/models/StrayReport');
const LostReport = require('../src/models/LostReport');
const InjuredReport = require('../src/models/InjuredReport');
const AdoptionPet = require('../src/models/AdoptionPet');

const ROUNDS = 12;

const Panjim = { latitude: 15.4909, longitude: 73.8278 };

const users = [
  {
    fullname: 'User',
    email: 'straycare@example.com',
    phone: '+91 98220 11223',
    password: 'user12345',
  },
  {
    fullname: 'Rohan Fernandes',
    email: 'rohan@example.com',
    phone: '+91 98220 44556',
    password: 'user12345',
  },
];

const ngos = [
  {
    name: 'Goa Animal Welfare Trust',
    email: 'contact@gaawt.org',
    phone: '+91 82991 00011',
    password: 'ngo12345',
    registrationNumber: 'GA/AWT/2011/0447',
    serviceArea: 'Panaji, Margao, Vasco da Gama',
    description:
      'A registered non-profit operating a 24 hour rescue helpline and animal shelter since 2011.',
  },
  {
    name: 'Coastal Paws Rescue',
    email: 'help@coastalpaws.org',
    phone: '+91 82991 00022',
    password: 'ngo12345',
    registrationNumber: 'GA/CPR/2016/1180',
    serviceArea: 'Dabolim, Margao, Bardez',
    description:
      'Volunteer driven rescue network focused on street dog sterilisation and emergency care.',
  },
];

const reports = [
  {
    collection: StrayReport,
    reporterName: 'User',
    contact: '+91 98220 11223',
    animalType: 'dog',
    title: 'Injured dog near Panjim bus stand',
    description:
      'A brown mixed breed dog is limping badly near the east bus stand. It looks hurt and is scared of traffic. Please send help quickly.',
    // Bundled demo art from client/public, served by Vite at the site root.
    imageUrl: '/injured-dog.jpeg',
    address: 'Panjim Bus Stand, Panaji',
    coordinates: [Panjim.longitude, Panjim.latitude],
  },
  {
    collection: StrayReport,
    reporterName: 'Rohan Fernandes',
    contact: '+91 98220 44556',
    animalType: 'cat',
    title: 'Stray kitten family under stairwell',
    description:
      'A mother cat with four kittens is living under the stairwell of our building. They need feeding and vaccination.',
    address: 'Fontainhas, Panaji',
    coordinates: [73.8335, 15.4955],
  },
  {
    collection: LostReport,
    reporterName: 'User',
    contact: '+91 98220 11223',
    animalType: 'dog',
    title: 'Missing Indie dog "Coco"',
    description:
      'Coco slipped her collar at the Caranzalem beach on Sunday evening. She is shy and will not come to strangers. Last seen near the rocks.',
    imageUrl: '/Dog.jpeg',
    address: 'Caranzalem Beach, Panaji',
    coordinates: [73.8305, 15.5021],
  },
  {
    collection: LostReport,
    reporterName: 'Rohan Fernandes',
    contact: '+91 98220 44556',
    animalType: 'cat',
    title: 'Missing house cat "Mishti"',
    description:
      'Our indoor cat got out through the balcony last night. She has a blue collar with a bell. Last spotted near the bakery on 18th June Road.',
    address: '18th June Road, Panaji',
    coordinates: [73.8318, 15.4983],
  },
  {
    collection: InjuredReport,
    reporterName: 'User',
    contact: '+91 98220 11223',
    animalType: 'cow',
    title: 'Cow hit by a vehicle on NH66',
    description:
      'A cow was hit by a vehicle near the bypass. She is bleeding from the leg and cannot walk. There is heavy traffic on this stretch.',
    imageUrl: '/cow-hit.jpeg',
    address: 'NH66 Bypass, Bambolim',
    coordinates: [73.8292, 15.4632],
  },
  {
    collection: InjuredReport,
    reporterName: 'Rohan Fernandes',
    contact: '+91 98220 44556',
    animalType: 'monkey',
    title: 'Monkey with an injured arm near the temple',
    description:
      'A macaque is holding its left arm and screams when it tries to climb. It has been sitting by the temple steps since morning.',
    address: 'Shri Ganesh Temple, Panjim',
    coordinates: [73.8339, 15.4998],
  },
];

const adoptions = [
  {
    ownersName: 'User',
    contact: '+91 98220 11223',
    petName: 'Luna',
    petType: 'dog',
    // Bundled demo art from client/public, served by Vite at the site root.
    imageUrl: '/Dog.jpeg',
    breed: 'Indian Spitz',
    age: 2,
    gender: 'female',
    vaccinated: true,
    city: 'Panaji',
    description:
      'Luna is a gentle, house trained two year old who is good with children. She is looking for a calm indoor home.',
  },
  {
    ownersName: 'Rohan Fernandes',
    contact: '+91 98220 44556',
    petName: 'Whiskers',
    petType: 'cat',
    imageUrl: '/Cat.jpeg',
    breed: 'Domestic shorthair',
    age: 1,
    gender: 'male',
    vaccinated: true,
    city: 'Margao',
    description:
      'Whiskers is a playful one year old who loves to chase a ball and always supervises the kitchen.',
  },
  {
    ownersName: 'User',
    contact: '+91 98220 11223',
    petName: 'Coco Jr',
    petType: 'rabbit',
    imageUrl: '/Rabbit.jpeg',
    breed: 'Mixed',
    age: 3,
    gender: 'female',
    vaccinated: false,
    city: 'Panaji',
    description:
      'A calm rabbit used to being handled. Looking for an indoor home as our apartment is moving to a second floor flat.',
  },
];

/**
 * Wipes and repopulates every collection with demo data.
 *
 * Exported so `npm run dev:memory` can reuse it against an in-memory
 * MongoDB, hence the `disconnect` option.
 */
async function seed({ disconnect = true } = {}) {
  await connectDB();

  console.log('[seed] clearing existing data');
  await Promise.all([
    User.deleteMany({}),
    NGO.deleteMany({}),
    StrayReport.deleteMany({}),
    LostReport.deleteMany({}),
    InjuredReport.deleteMany({}),
    AdoptionPet.deleteMany({}),
  ]);

  const createdUsers = [];
  for (const { password, ...rest } of users) {
    const hashed = await bcrypt.hash(password, ROUNDS);
    createdUsers.push(await User.create({ ...rest, password: hashed }));
  }
  console.log(`[seed] ${createdUsers.length} users`);

  const createdNgos = [];
  for (const { password, ...rest } of ngos) {
    const hashed = await bcrypt.hash(password, ROUNDS);
    createdNgos.push(await NGO.create({ ...rest, password: hashed }));
  }
  console.log(`[seed] ${createdNgos.length} organisations`);

  // Reports are spread across the three collections and across two NGOs so
  // the dashboard shows pending, ongoing and completed cases out of the box.
  for (const [index, report] of reports.entries()) {
    const { collection, coordinates, ...rest } = report;
    const assigned =
      index === 2 || index === 4
        ? { assignedNGO: createdNgos[0]._id, status: 'ongoing' }
        : index === 3
          ? { assignedNGO: createdNgos[0]._id, status: 'completed', rescueNotes: 'Pet reunited with the owner at the bakery.' }
          : {};

    await collection.create({
      location: { type: 'Point', coordinates },
      // Most demo cases are filed without a photo, so a case with no imageUrl
      // falls back to the placeholder. This has to stay a default rather than a
      // blanket value, or it would overwrite the images set above.
      imageUrl: null,
      ...rest,
      reportedBy: createdUsers[index % createdUsers.length]._id,
      dateReported: new Date(Date.now() - index * 36e5 * 9),
      ...assigned,
    });
  }
  console.log(`[seed] ${reports.length} reports across 3 collections`);

  for (const [index, adoption] of adoptions.entries()) {
    await AdoptionPet.create({
      ...adoption,
      postedBy: createdUsers[index % createdUsers.length]._id,
      datePosted: new Date(Date.now() - index * 36e5 * 24),
    });
  }
  console.log(`[seed] ${adoptions.length} adoption listings`);

  console.log('\n  Sign in with:');
  console.log('    User  straycare@example.com  / user12345');
  console.log('    User  rohan@example.com      / user12345');
  console.log('    NGO   contact@gaawt.org    / ngo12345');
  console.log('    NGO   help@coastalpaws.org / ngo12345\n');

  if (disconnect) await disconnectDB();
}

module.exports = { seed };

if (require.main === module) {
  seed().catch(async (err) => {
    console.error('[seed] failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}
