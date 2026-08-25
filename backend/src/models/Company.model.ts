import mongoose ,{ Schema, Document } from "mongoose";
import { companyPlan, IndustryType } from "../types/company.type.js";

export interface ICompany extends Document {
    companyName: string;
    slug: string;
    companyEmail: string;
    phone?: string; 
    industry: string;
    logo?: string;
    isActive: boolean;
    subscriptionPlan: companyPlan;
    ownerId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
    {
        companyName: {
            type: String,
            trim: true,
            required: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true, // جعلناه فريداً لمنع تكرار مساحات العمل للشركات
            trim: true,
            lowercase: true
        },
        companyEmail: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String
        },
        industry: {
            type: String,
            enum: Object.values(IndustryType),
            default: IndustryType.LOGISTICS,
        },
        logo: {
            type: String,
            default: null
        },
        isActive: {
            type: Boolean,
            default: true
        },
        subscriptionPlan: {
            type: String,
            enum: Object.values(companyPlan),
            default: companyPlan.BASIC,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

companySchema.index({ slug: 1 });
companySchema.index({ ownerId: 1 });
companySchema.index({ isActive: 1 });

export const Company = mongoose.model<ICompany>("Company", companySchema);