const mongoose = require('mongoose');
const { PHONE_PATTERN } = require('./User');

// Widen beyond the obvious pets: a Goan or Indian street rescue regularly sees
// rabbits, pigs, donkeys and squirrels, and forcing them into "other" loses
// information an NGO filters on.
const ANIMAL_TYPES = [
  'dog',
  'cat',
  'bird',
  'cow',
  'goat',
  'monkey',
  'rabbit',
  'pig',
  'horse',
  'donkey',
  'squirrel',
  'other',
];
const REPORT_STATUSES = ['pending', 'ongoing', 'completed'];

/**
 * A proper single nested subdocument with `default: undefined`.
 *
 * A plain nested object would not work here: Mongoose materialises nested paths
 * and then fails the "required" check on `coordinates` even when the report has
 * no location at all, and the 2dsphere index rejects a `{ type: 'Point' }` that
 * has no coordinates. As a subdocument the whole field simply stays absent
 * unless a location is supplied.
 */
const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    // GeoJSON order is [longitude, latitude]
    coordinates: {
      type: [Number],
      required: [true, 'A location needs both latitude and longitude'],
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length !== 2) return false;
          const [lng, lat] = value;
          return (
            Number.isFinite(lng) &&
            Number.isFinite(lat) &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

const URGENCY_LEVELS = ['low', 'moderate', 'high', 'critical'];
const SUGGESTED_CATEGORIES = ['stray', 'lost', 'injured'];

/**
 * What the AI produced while helping a reporter write the report.
 *
 * Kept as one nested subdocument so the whole block is either present or
 * absent, which is how an NGO tells an AI assisted case from a handwritten one.
 * `model` and `reviewedByUser` are stored so the summary can be audited later.
 */
const aiTriageSchema = new mongoose.Schema(
  {
    summary: { type: String, trim: true, maxlength: 4000 },
    likelySituation: { type: String, trim: true, maxlength: 200 },
    urgency: { type: String, enum: URGENCY_LEVELS, default: 'moderate' },
    firstAid: { type: [String], default: [] },
    looksStray: { type: Boolean, default: false },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    suggestedCategory: { type: String, enum: SUGGESTED_CATEGORIES, default: 'stray' },
    animalType: {
      type: String,
      enum: [...ANIMAL_TYPES],
      default: 'other',
    },
    model: { type: String, trim: true, maxlength: 120 },
    // The reporter always confirms before anything is submitted or dispatched.
    reviewedByUser: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Stray, lost and injured reports each live in their own collection, but the
 * document shape is identical. Defining it once here keeps the three models
 * from drifting apart.
 *
 * @param {'stray'|'lost'|'injured'} category locked value for the collection
 */
function buildReportSchema(category) {
  const schema = new mongoose.Schema(
    {
      category: {
        type: String,
        enum: [category],
        default: category,
        immutable: true,
      },
      // Snapshot of the reporter's name/contact as given on the form. Stored
      // separately from `reportedBy` so a case stays readable if the account
      // is later deleted.
      reporterName: {
        type: String,
        required: [true, 'Reporter name is required'],
        trim: true,
        maxlength: 80,
      },
      contact: {
        type: String,
        required: [true, 'Contact number is required'],
        trim: true,
        match: [PHONE_PATTERN, 'Please provide a valid contact number'],
      },
      animalType: {
        type: String,
        enum: ANIMAL_TYPES,
        default: 'other',
      },
      title: {
        type: String,
        required: [true, 'A short title is required'],
        trim: true,
        maxlength: 120,
      },
      description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Please describe the animal in at least 10 characters'],
        maxlength: 2000,
      },
      imageUrl: {
        type: String,
        default: null,
      },
      // Optional: stays absent unless the reporter supplied coordinates.
      location: { type: locationSchema, default: undefined },
      address: {
        type: String,
        trim: true,
        maxlength: 300,
      },
      dateReported: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: REPORT_STATUSES,
        default: 'pending',
      },
      assignedNGO: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NGO',
        default: null,
      },
      rescueNotes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },
      // Optional AI triage summary. Stays null for reports written by hand, so
      // NGOs can tell an AI assisted case apart and the reporter stays in
      // control of what was actually submitted.
      aiTriage: {
        type: aiTriageSchema,
        default: undefined,
      },
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    },
    {
      timestamps: true,
      toJSON: {
        transform(_doc, ret) {
          delete ret.__v;
          return ret;
        },
      },
      toObject: { virtuals: true },
    }
  );

  // The NGO dashboard filters by status and lists newest first.
  schema.index({ status: 1, dateReported: -1 });
  schema.index({ reportedBy: 1, dateReported: -1 });
  // Enables future "find reports near me" queries.
  schema.index({ location: '2dsphere' });

  return schema;
}

module.exports = {
  buildReportSchema,
  ANIMAL_TYPES,
  REPORT_STATUSES,
  URGENCY_LEVELS,
  SUGGESTED_CATEGORIES,
};
