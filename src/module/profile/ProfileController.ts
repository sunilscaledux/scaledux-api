import {Request,Response} from 'express'
import { ProfileSummaryInput } from './ProfileType'
import { prisma } from '@config/prisma';
import { resendOtpSchema } from '@module/auth/AuthValidation';
import { updateSummarySchema } from './ProfileValidation';
import { ApiResponse } from '@utils/ApiResponse';

export async function updateProfileSummary(req:Request,res:Response){
    const rawBody=req.body||{};

      const {value,error}=updateSummarySchema.validate(rawBody, {
    abortEarly: false,
  });
  if(error){
    return ApiResponse.joiValidationError(res,error)
  }

    const userId=req.user.id;

     const user = await prisma.user.update({
        where:{
            id:userId,
        },
        data:{
            FirstName:value.FirstName,
            LastName:value.LastName,
            title:value.title,
            about:value.about
        }
      })

      // re

}