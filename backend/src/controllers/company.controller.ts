import type { Request, Response } from "express";
import { companyService } from "../services/company.services.js";


const CompanyService = new companyService();

export class CompanyController {

  async create(req: Request, res: Response) {
    try {
      const company = await CompanyService.createCompany(req.body);

      return res.status(201).json({
        success: true,
        data: company,
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const company = await CompanyService.getCompanyById(req.params.id as string);

      return res.status(200).json({
        success: true,
        data: company,
      });

    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const companies = await CompanyService.getAllCompanies();

      return res.status(200).json({
        success: true,
        data: companies,
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company = await CompanyService.updateCompany(
        req.params.id as string,
        req.body
      );

      return res.status(200).json({
        success: true,
        data: company,
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await CompanyService.deleteCompany(req.params.id as string);

      return res.status(200).json({
        success: true,
        message: "Company deleted successfully",
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
