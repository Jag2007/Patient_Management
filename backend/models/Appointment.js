// An appointment that belongs to one patient (stored as a reference to the Patient).
// The "date must be in the future and within one year" rule lives in appointmentService,
// because past appointments are valid history and must still be storable (e.g. seed data).
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: [true, 'Patient is required'] },
    dateTime: { type: Date, required: [true, 'Date and time are required'] },
    clinician: { type: String, required: [true, 'Clinician is required'], trim: true, maxlength: 100 },
    reason: { type: String, required: [true, 'Reason is required'], trim: true, maxlength: 300 },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, dateTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema, 'appointments');
