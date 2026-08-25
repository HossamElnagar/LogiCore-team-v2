/// here i should put the business logic from controller
import { CompanyRepository } from "../repositories/company.repository.js";
import mongoose from "mongoose"
const companyRepo = new CompanyRepository();

export class companyService {

    async createCompany(data: any){
        const existing = await companyRepo.findByEmail(data.comapnyEmail);

        if (existing) {
            throw new Error("Company already exists");
        }

        const company = await companyRepo.create(data);

        return company;
    }

    async getCompanyById(id: string) {
        const company = await companyRepo.findById(id)

        if(!company){
            throw new Error("company not found");
        }

        return company;
    }

    async getAllCompanies() {
        const companies = await companyRepo.findAll();
        return companies;
    }

    async updateCompany(id: string ,data: any){

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error("Invalid Company ID format");
            }

            if (data.CompanyEmail) {
            const emailExists = await companyRepo.findByEmail(data.email);
           //find if email exist and id not the same
            if (emailExists && emailExists._id.toString() !== id) {
                throw new Error("Email is already taken by another company");
            }
        }


        const company = await companyRepo.update(id,data);

        if(!company){
            throw new Error("Company not found");
        }

        return company;
    }

    async deleteCompany(id: string){
        const company = await companyRepo.delete(id);

        if(!company){
            throw new Error("company not found");
        }

        return company;
    }

}