import Joi from "joi";
import { ProfileSummaryInput } from "./ProfileType";
export const updateSummarySchema = Joi.object<ProfileSummaryInput>({
  title: Joi.string().required(),
  about: Joi.string().required(),
});