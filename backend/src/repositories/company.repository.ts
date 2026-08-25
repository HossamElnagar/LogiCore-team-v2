import { Company } from "../models/Company.model.js";
import type { ICompany } from "../models/Company.model.js";

export class CompanyRepository {
  // //partial makes all fields optional
  async create(data: Partial<ICompany>) {
    return await Company.create(data);
  }

  async findById(id: string) {
    return await Company.findById(id).populate("ownerId", "name email role");
  }

  async findByEmail(companyEmail: string) {
    return await Company.findOne({ companyEmail });
  }

  async findBySlug(slug: string) {
    return await Company.findOne({ slug });
  }

  async findAll() {
    return await Company.find().populate("ownerId", "name email");
  }

  async update(id: string, data: Partial<ICompany>) {
    return await Company.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string) {
    return await Company.findByIdAndDelete(id);
  }
}