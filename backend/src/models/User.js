import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  refreshTokenHash: { type: String, default: null }
}, { timestamps: true });

userSchema.methods.publicProfile = function () {
  return { id: this._id, name: this.name, email: this.email, createdAt: this.createdAt };
};

export default mongoose.model('User', userSchema);
