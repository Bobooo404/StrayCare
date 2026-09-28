const mongoose = require('mongoose');
const { PHONE_PATTERN } = require('./User');

const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'other'];
const ADOPTION_STATUSES = ['available', 'adopted'];

const adoptionPetSchema = new mongoose.Schema(
  {
    ownersName: {
      type: String,
      required: [true, 'Your name is required'],
      trim: true,
      maxlength: 80,
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      match: [PHONE_PATTERN, 'Please provide a valid contact number'],
    },
    petName: {
      type: String,
      required: [true, 'Pet name is required'],
      trim: true,
      maxlength: 60,
    },
    petType: {
      type: String,
      required: [true, 'Pet type is required'],
      enum: PET_TYPES,
      lowercase: true,
      trim: true,
    },
    breed: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [40, 'Please enter a realistic age'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other'],
      lowercase: true,
      trim: true,
    },
    vaccinated: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Please describe your pet in at least 10 characters'],
      maxlength: 2000,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ADOPTION_STATUSES,
      default: 'available',
    },
    datePosted: {
      type: Date,
      default: Date.now,
    },
    postedBy: {
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
  }
);

adoptionPetSchema.index({ status: 1, datePosted: -1 });
adoptionPetSchema.index({ petType: 1, status: 1 });

module.exports = mongoose.model('AdoptionPet', adoptionPetSchema);
module.exports.PET_TYPES = PET_TYPES;
module.exports.ADOPTION_STATUSES = ADOPTION_STATUSES;
