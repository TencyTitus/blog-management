const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullname: { type: String, trim: true },  // Made optional for login
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/ },
  password: { type: String, required: true, minlength: 6 },
  bio: { type: String, trim: true, default: "" },
  website: { type: String, trim: true, default: "" },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  subscription: {
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    expiresAt: { type: Date, default: null },
    plan: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    paymentId: { type: String, default: null },
    lastPaymentDate: { type: Date, default: null }
  },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  freePostsRead: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Select fields to exclude by default
UserSchema.set('toJSON', {
  transform: function(doc, ret, opt) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema); 