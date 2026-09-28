const AdoptionPet = require('../models/AdoptionPet');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toPublicUrl } = require('../middleware/upload');
const { validators } = require('../utils/validate');
const { PET_TYPES } = require('../models/AdoptionPet');

const GENDERS = ['male', 'female', 'other'];

/** POST /api/adoptions */
const createAdoption = asyncHandler(async (req, res) => {
  const { body } = req;
  const user = req.user;

  const petName = validators.string(body.petName, 'petName', {
    min: 1,
    max: 60,
    label: 'Pet name',
  });

  const petType = validators.enum(body.petType, PET_TYPES, { label: 'Pet type' });
  const gender = validators.enum(body.gender, GENDERS, { label: 'Gender' });

  const age = validators.number(body.age, 'Age', { min: 0, max: 40 });

  const description = validators.string(body.description, 'description', {
    min: 10,
    max: 2000,
    label: 'Description',
  });

  const contact = body.contact
    ? validators.phone(body.contact, { required: true, label: 'contact number' })
    : user.phone;

  if (!contact) {
    throw ApiError.badRequest(
      'A contact number is required so adopters can reach you'
    );
  }

  const pet = await AdoptionPet.create({
    ownersName: user.fullname,
    petName,
    petType,
    breed: body.breed
      ? validators.string(body.breed, 'breed', { max: 60, label: 'Breed' })
      : undefined,
    age,
    gender,
    vaccinated: validators.boolean(body.vaccinated),
    description,
    contact,
    city: body.city
      ? validators.string(body.city, 'city', { max: 100, label: 'City' })
      : undefined,
    imageUrl: req.file ? toPublicUrl(req.file.filename) : null,
    postedBy: user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Your pet is now listed for adoption',
    data: { pet },
  });
});

/** GET /api/adoptions - public listing, optionally filtered. */
const listAdoptions = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

  const filter = {
    status: req.query.status === 'adopted' ? 'adopted' : 'available',
  };

  if (req.query.petType && PET_TYPES.includes(req.query.petType)) {
    filter.petType = req.query.petType;
  }

  const [pets, total] = await Promise.all([
    AdoptionPet.find(filter)
      .sort({ datePosted: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('postedBy', 'fullname')
      .lean(),
    AdoptionPet.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { pets },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
});

/** GET /api/adoptions/mine */
const listMyAdoptions = asyncHandler(async (req, res) => {
  const pets = await AdoptionPet.find({ postedBy: req.user._id })
    .sort({ datePosted: -1 })
    .lean();

  res.json({ success: true, data: { pets } });
});

/** PATCH /api/adoptions/:id - only the lister can edit. */
const updateAdoption = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'listing id');

  const pet = await AdoptionPet.findById(req.params.id);
  if (!pet) throw ApiError.notFound('Listing not found');

  if (String(pet.postedBy) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit your own listings');
  }

  const { body } = req;

  if (body.petName !== undefined) {
    pet.petName = validators.string(body.petName, 'petName', {
      min: 1,
      max: 60,
      label: 'Pet name',
    });
  }
  if (body.petType !== undefined) {
    pet.petType = validators.enum(body.petType, PET_TYPES, { label: 'Pet type' });
  }
  if (body.gender !== undefined) {
    pet.gender = validators.enum(body.gender, GENDERS, { label: 'Gender' });
  }
  if (body.breed !== undefined) {
    pet.breed = body.breed
      ? validators.string(body.breed, 'breed', { max: 60, label: 'Breed' })
      : null;
  }
  if (body.age !== undefined) {
    pet.age = validators.number(body.age, 'Age', { min: 0, max: 40 });
  }
  if (body.description !== undefined) {
    pet.description = validators.string(body.description, 'description', {
      min: 10,
      max: 2000,
      label: 'Description',
    });
  }
  if (body.contact !== undefined) {
    pet.contact = validators.phone(body.contact, {
      required: true,
      label: 'contact number',
    });
  }
  if (body.city !== undefined) {
    pet.city = body.city
      ? validators.string(body.city, 'city', { max: 100, label: 'City' })
      : null;
  }
  if (body.vaccinated !== undefined) {
    pet.vaccinated = validators.boolean(body.vaccinated);
  }
  if (body.status !== undefined) {
    pet.status = validators.enum(body.status, ['available', 'adopted'], {
      label: 'Status',
    });
  }

  if (req.file) pet.imageUrl = toPublicUrl(req.file.filename);

  await pet.save();

  res.json({ success: true, message: 'Listing updated', data: { pet } });
});

/** DELETE /api/adoptions/:id */
const deleteAdoption = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'listing id');

  const pet = await AdoptionPet.findById(req.params.id);
  if (!pet) throw ApiError.notFound('Listing not found');

  if (String(pet.postedBy) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only remove your own listings');
  }

  await pet.deleteOne();

  res.json({ success: true, message: 'Listing removed' });
});

module.exports = {
  createAdoption,
  listAdoptions,
  listMyAdoptions,
  updateAdoption,
  deleteAdoption,
};
