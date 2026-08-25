import joi from "joi";

export const registerSchema = joi.object({
    companyName: joi.string().min(3).max(100).required(),
    slug: joi.string().min(2).max(100).optional(),
    industry: joi.string().min(3).max(100).default("LOGISTICS").required(),
    companyEmail: joi.string().email().required(),
    name: joi.string().min(2).max(100).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(30).required(),
    confirmPassword: joi.string().valid(joi.ref("password")).required().messages({"any.only": "Passwords do not match"}),
    phone: joi.string().min(10).max(15).optional(),
}).options({
    abortEarly: false,
    stripUnknown: true,
})

export const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
}).options({
    abortEarly: false,
    stripUnknown: true,
})

export const refreshTokenSchema = joi.object({
  refreshToken: joi.string()
    .required()
});

export const forgotPasswordSchema = joi.object({
  email: joi.string()
    .email()
    .required()
});

export const resetPasswordSchema = joi.object({
  token: joi.string()
    .required(),

  password: joi.string()
    .min(8)
    .required(),

  confirmPassword: joi.string()
    .valid(joi.ref("password"))
    .required()
});