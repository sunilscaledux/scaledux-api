import Joi from "joi";
import { ProfileSummaryInput } from "./ProfileType";
export const updateSummarySchema=Joi.object<ProfileSummaryInput>({
FirstName:Joi.string().required(),
LastName:Joi.string().required(),
title:Joi.string().required(),
about:Joi.string().required(),
})