import { Request, Response } from 'express'
import { prisma } from '@config/prisma'
import { ApiResponse } from '@utils/ApiResponse'
import { getRelativePath, getFileUrl } from '@utils/General'
import fs from 'fs'
import path from 'path'

/**
 * Helper function to parse JSON fields in service package
 */
const parseServicePackageJson = (pkg: any) => {
  return {
    ...pkg,
    features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features,
    industry: typeof pkg.industry === 'string' ? JSON.parse(pkg.industry) : (pkg.industry || []),
    keywords: typeof pkg.keywords === 'string' ? JSON.parse(pkg.keywords) : (pkg.keywords || []),
    scope: typeof pkg.scope === 'string' ? JSON.parse(pkg.scope) : pkg.scope,
    extraAddOns: typeof pkg.extra_add_ons === 'string' ? JSON.parse(pkg.extra_add_ons) : (pkg.extra_add_ons || null),
    packageDescription: pkg.package_description || pkg.packageDescription || '',
    deliverables: typeof pkg.deliverables === 'string' ? JSON.parse(pkg.deliverables) : pkg.deliverables,
    faqs: typeof pkg.faqs === 'string' ? JSON.parse(pkg.faqs) : pkg.faqs,
    links: typeof pkg.links === 'string' ? JSON.parse(pkg.links) : pkg.links,
    requirements: typeof pkg.requirements === 'string' ? JSON.parse(pkg.requirements) : pkg.requirements,
    // Parse new media fields - provide defaults until DB migration
    thumbnail: typeof pkg.thumbnail === 'string' ? JSON.parse(pkg.thumbnail) : (pkg.thumbnail || []),
    images: typeof pkg.images === 'string' ? JSON.parse(pkg.images) : (pkg.images || []),
    video: typeof pkg.video === 'string' ? JSON.parse(pkg.video) : (pkg.video || []),
    documents: typeof pkg.documents === 'string' ? JSON.parse(pkg.documents) : (pkg.documents || []),
  }
}

/**
 * Get all service packages for authenticated user
 */
export async function getUserServicePackages(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const servicePackages = await prisma.servicePackage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    // Parse JSON fields
    const parsedPackages = servicePackages.map(pkg => parseServicePackageJson(pkg))

    return ApiResponse.success(res, parsedPackages, "Service packages retrieved successfully")

  } catch (error: any) {
    console.error("Get Service Packages Error:", error)
    return ApiResponse.error(res, "Failed to get service packages")
  }
}

/**
 * Get service package by ID
 */
export async function getServicePackageById(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const servicePackage = await prisma.servicePackage.findFirst({
      where: { 
        id: parseInt(id),
        user_id: userId 
      }
    })

    if (!servicePackage) {
      return ApiResponse.error(res, "Service package not found", 404)
    }

    // Parse JSON fields
    const parsedPkg = parseServicePackageJson(servicePackage)

    return ApiResponse.success(res, parsedPkg, "Service package retrieved successfully")

  } catch (error: any) {
    console.error("Get Service Package Error:", error)
    return ApiResponse.error(res, "Failed to get service package")
  }
}

/**
 * Create new service package
 */
export async function createServicePackage(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const {
      title,
      categoryId,
      subCategoryId,
      features,
      industry,
      keywords,
      scope,
      extraAddOns,
      hasBasic,
      hasStandard,
      hasPremium,
      packageDescription,
      deliverables,
      faqs,
      links,
      requirements,
      status = 'DRAFT',
      // New media fields
      thumbnail,
      images,
      video,
      documents
    } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Validate required fields
    if (!title || !categoryId) {
      return ApiResponse.error(res, "Title and category are required", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Create service package with JSON data
    const servicePackage = await prisma.servicePackage.create({
      data: {
        user_id: userId,
        title,
        category_id: parseInt(categoryId),
        sub_category_id: subCategoryId ? parseInt(subCategoryId) : null,
        features: JSON.stringify(features || []),
        // industry: JSON.stringify(industry || []), // Temporarily commented until DB migration
        // keywords: JSON.stringify(keywords || []), // Temporarily commented until DB migration
        scope: JSON.stringify(scope || {}),
        extra_add_ons: JSON.stringify(extraAddOns || []),
        has_basic: hasBasic || false,
        has_standard: hasStandard || false,
        has_premium: hasPremium || false,
        package_description: packageDescription || null,
        deliverables: JSON.stringify(deliverables || []),
        faqs: JSON.stringify(faqs || []),
        links: JSON.stringify(links || []),
        requirements: JSON.stringify(requirements || []),
        // New media fields - temporarily commented until DB migration
        // thumbnail: JSON.stringify(thumbnail || []),
        // images: JSON.stringify(images || []),
        // video: JSON.stringify(video || []),
        // documents: JSON.stringify(documents || []),
        status
      }
    })

    // Parse JSON fields before returning
    const parsedPackage = parseServicePackageJson(servicePackage)
    return ApiResponse.success(res, parsedPackage, "Service package created successfully")

  } catch (error: any) {
    console.error("Create Service Package Error:", error)
    return ApiResponse.error(res, "Failed to create service package")
  }
}

/**
 * Update service package
 */
export async function updateServicePackage(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params
    const {
      title,
      categoryId,
      subCategoryId,
      features,
      industry,
      keywords,
      scope,
      extraAddOns,
      hasBasic,
      hasStandard,
      hasPremium,
      packageDescription,
      deliverables,
      faqs,
      links,
      requirements,
      status,
      // New media fields
      thumbnail,
      images,
      video,
      documents
    } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Check if service package exists and belongs to user
    const existingPackage = await prisma.servicePackage.findFirst({
      where: { 
        id: parseInt(id),
        user_id: userId 
      }
    })

    if (!existingPackage) {
      return ApiResponse.error(res, "Service package not found", 404)
    }

    // Update service package with JSON data
    const updateData: any = {
      updated_at: new Date()
    }
    
    // Only update fields that are provided
    if (title !== undefined) updateData.title = title
    if (categoryId !== undefined) updateData.category_id = parseInt(categoryId)
    if (subCategoryId !== undefined) updateData.sub_category_id = subCategoryId ? parseInt(subCategoryId) : null
    if (features !== undefined) updateData.features = JSON.stringify(features)
    // if (industry !== undefined) updateData.industry = JSON.stringify(industry) // Temporarily commented until DB migration
    // if (keywords !== undefined) updateData.keywords = JSON.stringify(keywords) // Temporarily commented until DB migration
    if (scope !== undefined) updateData.scope = JSON.stringify(scope)
    if (extraAddOns !== undefined) updateData.extra_add_ons = JSON.stringify(extraAddOns)
    if (hasBasic !== undefined) updateData.has_basic = hasBasic
    if (hasStandard !== undefined) updateData.has_standard = hasStandard
    if (hasPremium !== undefined) updateData.has_premium = hasPremium
    if (packageDescription !== undefined) updateData.package_description = packageDescription
    if (deliverables !== undefined) updateData.deliverables = JSON.stringify(deliverables)
    if (faqs !== undefined) updateData.faqs = JSON.stringify(faqs)
    if (links !== undefined) updateData.links = JSON.stringify(links)
    if (requirements !== undefined) updateData.requirements = JSON.stringify(requirements)
    if (status !== undefined) updateData.status = status
    // Update new media fields - temporarily commented until DB migration
    // if (thumbnail !== undefined) updateData.thumbnail = JSON.stringify(thumbnail)
    // if (images !== undefined) updateData.images = JSON.stringify(images)
    // if (video !== undefined) updateData.video = JSON.stringify(video)
    // if (documents !== undefined) updateData.documents = JSON.stringify(documents)

    const servicePackage = await prisma.servicePackage.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    // Parse JSON fields before returning
    const parsedPackage = parseServicePackageJson(servicePackage)
    return ApiResponse.success(res, parsedPackage, "Service package updated successfully")

  } catch (error: any) {
    console.error("Update Service Package Error:", error)
    return ApiResponse.error(res, "Failed to update service package")
  }
}

/**
 * Delete service package
 */
export async function deleteServicePackage(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Check if service package exists and belongs to user
    const existingPackage = await prisma.servicePackage.findFirst({
      where: { 
        id: parseInt(id),
        user_id: userId 
      }
    })

    if (!existingPackage) {
      return ApiResponse.error(res, "Service package not found", 404)
    }

    // Delete service package
    await prisma.servicePackage.delete({
      where: { id: parseInt(id) }
    })

    return ApiResponse.success(res, null, "Service package deleted successfully")

  } catch (error: any) {
    console.error("Delete Service Package Error:", error)
    return ApiResponse.error(res, "Failed to delete service package")
  }
}

/**
 * Upload service package media - TEMPORARILY DISABLED until new media system
 */
/* export async function uploadServicePackageMedia(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const files = req.files as Express.Multer.File[]

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!files || files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    const uploadedFiles = files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      filePath: getRelativePath(file.path),
      fileSize: file.size,
      mimeType: file.mimetype,
      url: getFileUrl(getRelativePath(file.path))
    }))

    return ApiResponse.success(res, uploadedFiles, "Media uploaded successfully")

  } catch (error: any) {
    console.error("Upload Service Package Media Error:", error)
    return ApiResponse.error(res, "Failed to upload media")
  }
} */

/**
 * Delete service package media file - TEMPORARILY DISABLED until new media system
 */
/* export async function deleteServicePackageMedia(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { fileName } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!fileName) {
      return ApiResponse.error(res, "File name is required", 400)
    }

    // Find the media record
    const media = await prisma.servicePackageMedia.findFirst({
      where: {
        file_name: fileName,
        servicePackage: {
          user_id: userId
        }
      }
    })

    if (!media) {
      return ApiResponse.error(res, "Media file not found", 404)
    }

    // Delete the physical file
    const filePath = path.join(process.cwd(), 'uploads', media.file_path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete the media record
    await prisma.servicePackageMedia.delete({
      where: { id: media.id }
    })

    return ApiResponse.success(res, null, "Media file deleted successfully")

  } catch (error: any) {
    console.error("Delete Service Package Media Error:", error)
    return ApiResponse.error(res, "Failed to delete media file")
  }
} */
