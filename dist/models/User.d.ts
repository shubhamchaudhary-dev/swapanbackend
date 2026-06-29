import mongoose, { Document } from 'mongoose';
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
    otp?: string;
    otpExpires?: Date;
    certificates?: {
        fileUrl: string;
        fileName: string;
        note?: string;
        uploadedAt: Date;
    }[];
    createdAt: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map