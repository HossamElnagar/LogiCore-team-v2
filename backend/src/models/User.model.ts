import mongoose, { Schema, Document } from "mongoose";
import { UserRole, AuthProvider } from "../types/user.type.js";

export interface IUser extends Document {
    companyId: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    userName: string;
    email: string; 
    password?: string; // اختياري لأنه قد يسجل عبر جوجل مباشرة
    phone?: string;
    role: UserRole;
    authProvider: AuthProvider;
    googleId?: string; // لمعرف حساب جوجل
    unreconciledCash: number; // الخزنة المعلقة للمندوب في الشارع (COD)
    isActive: boolean;
    isOnline: boolean;
    currentSocketId?: string;
    lastSeen?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            default: null,
            index: true,
        },
        userName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: function(this: IUser) {
                return this.authProvider === AuthProvider.LOCAL;
            } // إجباري فقط لو التسجيل محلي وليس عبر جوجل
        },
        phone: String,
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.DRIVER
        },
        authProvider: {
            type: String,
            enum: Object.values(AuthProvider),
            default: AuthProvider.LOCAL
        },
        googleId: {
            type: String,
            index: true,
            sparse: true // يسمح بوجود قيم فارغة دون تضارب الـ Unique index
        },
        unreconciledCash: {
            type: Number,
            default: 0,
            min: 0
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        currentSocketId: String,
        lastSeen: Date,
    },
    {
        timestamps: true,
    }
);

userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, isActive: 1 });
userSchema.index({ companyId: 1, departmentId: 1 });

export const User = mongoose.model<IUser>("User", userSchema);