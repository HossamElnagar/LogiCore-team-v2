import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Company } from "../models/Company.model.js";
import { User } from "../models/User.model.js";
import { AuthProvider, UserRole } from "../types/user.type.js";
import { companyPlan, IndustryType } from "../types/company.type.js";

export class AuthService {
  async register(payload: any) {
    const { companyName, companyEmail, phone, industry, name, email, password, confirmPassword, slug } = payload;

    if (!companyName || !companyEmail || !name || !email || !password) {
      throw new Error("Please provide all required registration fields");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const existingCompany = await Company.findOne({ companyEmail });
    if (existingCompany) {
      throw new Error("Company already exists");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const companySlug = (slug || companyName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const company = await Company.create({
      companyName,
      slug: companySlug,
      companyEmail,
      phone,
      industry: industry || IndustryType.LOGISTICS,
      subscriptionPlan: companyPlan.BASIC,
      isActive: true,
      ownerId: new mongoose.Types.ObjectId(),
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const owner = await User.create({
      companyId: company._id,
      userName: name,
      email,
      password: hashedPassword,
      phone,
      role: UserRole.OWNER,
      authProvider: AuthProvider.LOCAL,
    });

    await Company.findByIdAndUpdate(company._id, { ownerId: owner._id });

    const token = this.signToken(owner._id.toString(), company._id.toString(), owner.role);

    return {
      token,
      user: {
        id: owner._id,
        companyId: company._id,
        userName: owner.userName,
        email: owner.email,
        role: owner.role,
        departmentId: null,
      },
      company: {
        id: company._id,
        companyName: company.companyName,
        slug: company.slug,
      },
    };
  }

  async login(payload: { email: string; password: string }) {
    const { email, password } = payload;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email }).lean();
    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    if (user.isActive === false) {
      throw new Error("Account is deactivated");
    }

    const token = this.signToken(user._id.toString(), user.companyId.toString(), user.role, user.departmentId?.toString());

    return {
      token,
      user: {
        id: user._id,
        companyId: user.companyId,
        userName: user.userName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId || null,
      },
    };
  }

  private signToken(userId: string, companyId: string, role: string, departmentId?: string | null) {
    return jwt.sign({ sub: userId, companyId, role, departmentId: departmentId || null }, process.env.JWT_SECRET || "dev-secret", {
      expiresIn: "7d",
    });
  }
}
