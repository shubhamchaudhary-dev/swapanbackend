import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'reader' | 'researcher' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: UserRole;
  avatarUrl?: string;
  institution?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  department?: string;
  designation?: string;
  fieldOfResearch?: string;
  researchInterests?: string;
  highestQualification?: string;
  orcid?: string;
  googleScholar?: string;
  linkedin?: string;
  bio?: string;
  country?: string;
  state?: string;
  city?: string;
  availableAsReviewer?: boolean;
  emailNotifications?: boolean;
  newIssueAlerts?: boolean;
  isVerified: boolean;
  isRootAdmin: boolean;
  hasMembership: boolean;
  membershipPlan?: 'monthly' | 'yearly' | 'lifetime';
  membershipExpiresAt?: Date;
  otp?: string;
  otpExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  certificates?: {
    fileUrl: string;
    fileName: string;
    note?: string;
    uploadedAt: Date;
  }[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true },
    role: { type: String, enum: ['reader', 'researcher', 'admin'], default: 'reader' },
    avatarUrl: { type: String },
    institution: { type: String, trim: true },
    phone: { type: String, trim: true },
    dob: { type: String },
    gender: { type: String },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    fieldOfResearch: { type: String, trim: true },
    researchInterests: { type: String, trim: true },
    highestQualification: { type: String, trim: true },
    orcid: { type: String, trim: true },
    googleScholar: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    bio: { type: String, trim: true },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    availableAsReviewer: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    newIssueAlerts: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isRootAdmin: { type: Boolean, default: false },
    hasMembership: { type: Boolean, default: false },
    membershipPlan: { type: String, enum: ['monthly', 'yearly', 'lifetime'] },
    membershipExpiresAt: { type: Date },
    otp: { type: String },
    otpExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    certificates: [
      {
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        note: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IUser>('User', UserSchema);
