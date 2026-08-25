import { User } from "../models/User.model.js";
import type { IUser } from "../models/User.model.js";
export class UserRepository {
    async create(data: Partial<IUser>){
        return await User.create(data);
    }

    async findById(id: string){
        return await User.findById(id);
    }

    async findByEmail (email: string){
        return await User.findOne({email});
    }

    async findAllByCompany(companyId: string){
        return await User.find({companyId});
    }

    async update(id: string , data: Partial<IUser>){
        return await User.findByIdAndUpdate(id,data,
            {new: true,runValidators:true})
    }

    async deleteById(id: string){
        await User.findByIdAndDelete(id);
    }


}