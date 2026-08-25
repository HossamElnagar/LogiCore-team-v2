import { UserRepository } from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import { User } from "../models/User.model.js";

const userRepo = new UserRepository();

export class UserService {
    async createUser(data: any){
        // check email if exist
        const existingUser = 
            await userRepo.findByEmail(data.email);

        if(existingUser){
            throw new Error("User already exists");
        }
        // hashing password
        const hashedPassword = 
           await bcrypt.hash(data.password,10)
        //create user
        return await userRepo.create({
            ...data,
            password:hashedPassword
        })
        
    }

    async getUserById(id:string){
        // find user
        const user = await userRepo.findById(id);
        // if not exist
        if(!user){
            throw new Error("user not found");
        }
        // if exist
        return user;
    }



    async getCompanyUsers(companyId: string){
        return await userRepo.findAllByCompany(companyId);
    }


    async updateUser(id: string, data:any){

        // find by id and update
        const user = 
            await userRepo.update(id, data);

        if(!user){
            throw new Error("user not found");
        }
        
        return user;
    }

    async deleteUser(id: string){
        //check if user exist
        const user = await userRepo.findById(id);
          
        if(!user){
            throw new Error("User not found");
        }

        await userRepo.deleteById(id);
        
        return user;
    }

    /**
     * Updates the password of the currently authenticated user.
     * 1. Fetches the full user document (including password hash).
     * 2. Verifies the supplied currentPassword against the stored bcrypt hash.
     * 3. If valid, hashes the new password and persists it.
     *
     * @throws Error if user not found, no local password, or currentPassword is wrong.
     */
    async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        // Fetch user with the password field explicitly selected (excluded by default in some schemas)
        const user = await User.findById(userId).select("+password");

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.password) {
            throw new Error("Password update is not available for OAuth accounts");
        }

        // Securely compare current password against the stored hash
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new Error("Current password is incorrect");
        }

        // Hash the new password with a work factor of 12
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return { message: "Password updated successfully" };
    }
}