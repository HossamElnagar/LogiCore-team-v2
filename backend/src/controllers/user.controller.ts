import type { request, Request,response,Response } from "express";

import { UserService } from "../services/user.services.js";

const userServices = new UserService();

export class userController {
    async create(req:Request, res: Response) {
        try{
            const user = await userServices.createUser(req.body);
            return res.status(201).json({
                success: true,
                data: user
            })
        } catch (error:any){
            return res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }

    async getById(req: Request, res:Response){
      try{
            const { id } = req.params;
            // extract id and check if exist
            if (!id) {
            return res.status(400).json({
                success: false,
                message: "User id is required",
            });
            }
            // type must be string as services
            if (typeof id !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid id",
            });
            }
            const user = 
                await userServices.getUserById(
                    id
                )
                
            return res.status(200).json({
                success: true,
                data: user
            })
    }catch(error: any){
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }}


    async getCompanyUsers(req:Request,res:Response){
        try{
            const { companyId } = req.params;
            // extract id and check if exist
            if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company id is required",
            });
            }
            // type must be string as services
            if (typeof companyId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid id",
            });
        }
            const users = await userServices.getCompanyUsers(
                companyId)
            
            return res.status(200).json({
                success: true,
                data: users
            })            
        }catch(error:any){
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }
    
    }
    async update(req:Request,res:Response){
        try{
            const { id } = req.params;
        // extract id and check if exist
        if (!id) {
        return res.status(400).json({
            success: false,
            message: "User id is required",
        });
        }
        // type must be string as services
        if (typeof id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid id",
        });
        }
        const user = await userServices.updateUser(
            id,
            req.body
        )
        return res.status(200).json({
        success: true,
        data: user
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async delete(
    req: Request,
    res: Response
  ) {

    try {
        const { id } = req.params;
        // extract id and check if exist
        if (!id) {
        return res.status(400).json({
            success: false,
            message: "User id is required",
        });
        }
        // type must be string as services
        if (typeof id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid id",
        });
        }
      await userServices.deleteUser(id)

      return res.status(200).json({
        success: true,
        message: "User deleted successfully"
      });

    } catch (error: any) {

      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PATCH /api/users/update-password
   * Allows the currently authenticated user to change their own password.
   * The user ID is extracted from the verified JWT payload (req.user.sub),
   * never from the request body, to prevent privilege escalation.
   */
  async updatePassword(req: any, res: Response) {
    try {
      const userId = req.user?.sub as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "currentPassword and newPassword are required",
        });
      }

      const result = await userServices.updatePassword(userId, currentPassword, newPassword);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      // Return 400 for business logic errors (wrong password, etc.)
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}