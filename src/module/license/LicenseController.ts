import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { createLicenseSchema, updateLicenseSchema } from './LicenseValidation'
import { CreateLicenseInput, UpdateLicenseInput } from './LicenseType'

const prisma = new PrismaClient()

export const getLicenses = async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      })
    }

    const licenses = await prisma.license.findMany({
      where: {
        user_id: user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Licenses retrieved successfully',
      data: licenses
    })
  } catch (error) {
    console.error('Error fetching licenses:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const createLicense = async (req: Request, res: Response) => {
  try {
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

    const newLicense = await prisma.license.create({
      data: {
        user_id: user.id,
        institute: licenseData.institute,
        license_name: licenseData.license_name,
        completed_month: licenseData.completed_month,
        completed_year: licenseData.completed_year,
        description: licenseData.description,
        skills: licenseData.skills || []
      }
    })

    return res.status(201).json({
      success: true,
      message: 'License created successfully',
      data: newLicense
    })
  } catch (error) {
    console.error('Error creating license:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const updateLicense = async (req: Request, res: Response) => {
  try {
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

    // Check if license exists and belongs to user
    const existingLicense = await prisma.license.findFirst({
      where: {
        id: licenseData.id,
        user_id: user.id
      }
    })

    if (!existingLicense) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      })
    }

    const updatedLicense = await prisma.license.update({
      where: {
        id: licenseData.id
      },
      data: {
        institute: licenseData.institute,
        license_name: licenseData.license_name,
        completed_month: licenseData.completed_month,
        completed_year: licenseData.completed_year,
        description: licenseData.description,
        skills: licenseData.skills || []
      }
    })

    return res.status(200).json({
      success: true,
      message: 'License updated successfully',
      data: updatedLicense
    })
  } catch (error) {
    console.error('Error updating license:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const deleteLicense = async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      })
    }

    const licenseId = parseInt(req.params.id)
    if (isNaN(licenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid license ID'
      })
    }

    // Check if license exists and belongs to user
    const existingLicense = await prisma.license.findFirst({
      where: {
        id: licenseId,
        user_id: user.id
      }
    })

    if (!existingLicense) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      })
    }

    await prisma.license.delete({
      where: {
        id: licenseId
      }
    })

    return res.status(200).json({
      success: true,
      message: 'License deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting license:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}
