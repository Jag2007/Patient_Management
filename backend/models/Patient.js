// Patient model with all field validation, so create and edit use the same checks. patientId looks like P-0001.
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, match: /^P-\d{4}$/ },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: { validator: (value) => value <= new Date(), message: 'Date of birth cannot be in the future' },
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^\+?\d{10,13}$/, 'Phone must be 10 to 13 digits'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    address: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

patientSchema.index({ name: 1 });

module.exports = mongoose.model('Patient', patientSchema, 'patients');
