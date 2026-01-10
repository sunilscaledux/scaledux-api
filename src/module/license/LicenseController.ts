import { Request, Response } from 'express'
import { LicenseService } from './LicenseService'
import { getIntParam } from '@utils/requestHelpers'
import { createLicenseSchema, updateLicenseSchema } from './LicenseValidation'
import { CreateLicenseInput, UpdateLicenseInput } from './LicenseType'

export const getLicenses = async (req: Request, res: Response) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  const result = await LicenseService.getLicenses(user.id)

  return res.status(result.success ? 200 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const createLicense = async (req: Request, res: Response) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  const { error, value } = createLicenseSchema.validate(req.body)
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }

  const licenseData: CreateLicenseInput = value
  const result = await LicenseService.createLicense(user.id, licenseData)

  return res.status(result.success ? 201 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const updateLicense = async (req: Request, res: Response) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  const { error, value } = updateLicenseSchema.validate(req.body)
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }

  const licenseData: UpdateLicenseInput = value
  const result = await LicenseService.updateLicense(user.id, licenseData)

  const statusCode = result.success ? 200 : (result.message === 'License not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const deleteLicense = async (req: Request, res: Response) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  const licenseId = getIntParam(req.params.id)
  if (isNaN(licenseId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid license ID'
    })
  }

  const result = await LicenseService.deleteLicense(user.id, licenseId)

  const statusCode = result.success ? 200 : (result.message === 'License not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}
