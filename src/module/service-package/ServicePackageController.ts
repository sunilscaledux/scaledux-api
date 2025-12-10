import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { getRelativePath, getFileUrl, extractRelativePath } from '@utils/General'
import { ulid } from 'ulid'
import fs from 'fs'
import path from 'path'

/**
 * Helper function to parse JSON fields in service package
 */
const parseServicePackageJson = (pkg: any) => {
  return {
    ...pkg,
    features:
      typeof pkg.features === "string"
        ? JSON.parse(pkg.features)
        : pkg.features,
    industry:
      typeof pkg.industries === "string"
        ? JSON.parse(pkg.industries)
        : pkg.industries || [], // Map 'industries' from DB to 'industry' for frontend
    keywords:
      typeof pkg.keywords === "string"
        ? JSON.parse(pkg.keywords)
        : pkg.keywords || [],
    scope: typeof pkg.scope === "string" ? JSON.parse(pkg.scope) : pkg.scope,
    extraAddOns:
      typeof pkg.extra_add_ons === "string"
        ? JSON.parse(pkg.extra_add_ons)
        : pkg.extra_add_ons || null,
    packageDescription: pkg.package_description || pkg.packageDescription || "",
    deliverables:
      typeof pkg.deliverables === "string"
        ? JSON.parse(pkg.deliverables)
        : pkg.deliverables,
    faqs: typeof pkg.faqs === "string" ? JSON.parse(pkg.faqs) : pkg.faqs,
    links: typeof pkg.links === "string" ? JSON.parse(pkg.links) : pkg.links,
    requirements:
      typeof pkg.requirements === "string"
        ? JSON.parse(pkg.requirements)
        : pkg.requirements,
    // Parse media fields and convert relative paths to full URLs
    thumbnail: (typeof pkg.thumbnail === "string" ? JSON.parse(pkg.thumbnail) : (pkg.thumbnail || [])).map((path: string) => getFileUrl(path)),
    images: (typeof pkg.images === "string" ? JSON.parse(pkg.images) : (pkg.images || [])).map((path: string) => getFileUrl(path)),
    video: (typeof pkg.video === "string" ? JSON.parse(pkg.video) : (pkg.video || [])).map((path: string) => getFileUrl(path)),
    documents: (typeof pkg.documents === "string" ? JSON.parse(pkg.documents) : (pkg.documents || [])).map((path: string) => getFileUrl(path)),
  };
};

/**
 * Get all service packages for authenticated user
 */
export async function getUserServicePackages(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const servicePackages = await prisma.servicePackage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Parse JSON fields
    const parsedPackages = servicePackages.map((pkg) =>
      parseServicePackageJson(pkg)
    );

    return ApiResponse.success(
      res,
      parsedPackages,
      "Service packages retrieved successfully"
    );
  } catch (error: any) {
    console.error("Get Service Packages Error:", error);
    return ApiResponse.error(res, "Failed to get service packages");
  }
}

/**
 * Get service package by ID
 */
export async function getServicePackageById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params; // This is now unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const servicePackage = await prisma.servicePackage.findFirst({
      where: {
        unique_id: id,
        user_id: userId,
      },
    });

    if (!servicePackage) {
      return ApiResponse.error(
        res,
        "Service package not found or you don't have permission to access it",
        404
      );
    }

    // Parse JSON fields
    const parsedPkg = parseServicePackageJson(servicePackage);

    return ApiResponse.success(
      res,
      parsedPkg,
      "Service package retrieved successfully"
    );
  } catch (error: any) {
    console.error("Get Service Package Error:", error);
    return ApiResponse.error(res, "Failed to get service package");
  }
}

/**
 * Create new service package
 */
export async function createServicePackage(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
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
      status = "DRAFT",
      // New media fields
      thumbnail,
      images,
      video,
      documents,
    } = req.body;

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    // Validate required fields
    if (!title || !categoryId) {
      return ApiResponse.error(res, "Title and category are required", 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiResponse.error(res, "User not found", 404);
    }

    // Create service package with JSON data
    const servicePackage = await prisma.servicePackage.create({
      data: {
        unique_id: ulid(),
        user_id: userId,
        title,
        category_id: parseInt(categoryId),
        sub_category_id: subCategoryId ? parseInt(subCategoryId) : null,
        features: JSON.stringify(features || []),
        industries: JSON.stringify(industry || []),
        keywords: JSON.stringify(keywords || []), // Fixed: uncommented as schema has this field
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
        // Media fields - extract relative paths from frontend URLs for storage
        thumbnail: JSON.stringify((thumbnail || []).map(extractRelativePath)),
        images: JSON.stringify((images || []).map(extractRelativePath)),
        video: JSON.stringify((video || []).map(extractRelativePath)),
        documents: JSON.stringify((documents || []).map(extractRelativePath)),
        status,
      },
    });

    // Parse JSON fields before returning
    const parsedPackage = parseServicePackageJson(servicePackage);
    return ApiResponse.success(
      res,
      parsedPackage,
      "Service package created successfully"
    );
  } catch (error: any) {
    console.error("Create Service Package Error:", error);
    return ApiResponse.error(res, "Failed to create service package");
  }
}

/**
 * Update service package
 */
export async function updateServicePackage(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
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
      documents,
    } = req.body;

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    // Check if service package exists and belongs to user
    const existingPackage = await prisma.servicePackage.findFirst({
      where: {
        unique_id: id,
        user_id: userId,
      },
    });

    if (!existingPackage) {
      return ApiResponse.error(
        res,
        "Service package not found or you don't have permission to edit it",
        404
      );
    }

    // Update service package with JSON data
    const updateData: any = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (categoryId !== undefined) updateData.category_id = parseInt(categoryId);
    if (subCategoryId !== undefined)
      updateData.sub_category_id = subCategoryId
        ? parseInt(subCategoryId)
        : null;
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (industry !== undefined)
      updateData.industries = JSON.stringify(industry); // Fixed: use 'industries' to match schema
    if (keywords !== undefined) updateData.keywords = JSON.stringify(keywords); // Fixed: uncommented as schema has this field
    if (scope !== undefined) updateData.scope = JSON.stringify(scope);
    if (extraAddOns !== undefined)
      updateData.extra_add_ons = JSON.stringify(extraAddOns);
    if (hasBasic !== undefined) updateData.has_basic = hasBasic;
    if (hasStandard !== undefined) updateData.has_standard = hasStandard;
    if (hasPremium !== undefined) updateData.has_premium = hasPremium;
    if (packageDescription !== undefined)
      updateData.package_description = packageDescription;
    if (deliverables !== undefined)
      updateData.deliverables = JSON.stringify(deliverables);
    if (faqs !== undefined) updateData.faqs = JSON.stringify(faqs);
    if (links !== undefined) updateData.links = JSON.stringify(links);
    if (requirements !== undefined)
      updateData.requirements = JSON.stringify(requirements);
    if (status !== undefined) updateData.status = status;
    // Update media fields - extract relative paths from frontend URLs for storage
    if (thumbnail !== undefined)
      updateData.thumbnail = JSON.stringify((thumbnail || []).map(extractRelativePath));
    if (images !== undefined) 
      updateData.images = JSON.stringify((images || []).map(extractRelativePath));
    if (video !== undefined) 
      updateData.video = JSON.stringify((video || []).map(extractRelativePath));
    if (documents !== undefined)
      updateData.documents = JSON.stringify((documents || []).map(extractRelativePath));

    const servicePackage = await prisma.servicePackage.update({
      where: { unique_id: id },
      data: updateData,
    });

    // Parse JSON fields before returning
    const parsedPackage = parseServicePackageJson(servicePackage);
    return ApiResponse.success(
      res,
      parsedPackage,
      "Service package updated successfully"
    );
  } catch (error: any) {
    console.error("Update Service Package Error:", error);
    return ApiResponse.error(res, "Failed to update service package");
  }
}

/**
 * Delete service package
 */
export async function deleteServicePackage(req: Request, res: Response) {
  try {
    console.log("🗑️ DELETE SERVICE PACKAGE REQUEST");
    console.log("- Request params:", req.params);
    console.log("- Request URL:", req.url);
    
    const userId = req.user?.id;
    const { id } = req.params;

    console.log("- User ID:", userId);
    console.log("- Package ID from params:", id);

    if (!userId) {
      console.log("❌ No user ID - returning 401");
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    // Check if service package exists and belongs to user
    // Try unique_id first, then fallback to numeric id
    let existingPackage;
    
    try {
      existingPackage = await prisma.servicePackage.findFirst({
        where: {
          unique_id: id,
          user_id: userId,
        },
      });
    } catch (error) {
      // If unique_id column doesn't exist, try numeric id
      console.log("unique_id column not found, trying numeric id");
      existingPackage = null;
    }

    // Fallback to numeric id if unique_id lookup fails or column doesn't exist
    if (!existingPackage && !isNaN(Number(id))) {
      existingPackage = await prisma.servicePackage.findFirst({
        where: {
          id: parseInt(id),
          user_id: userId,
        },
      });
    }

    if (!existingPackage) {
      return ApiResponse.error(
        res,
        "Service package not found or you don't have permission to delete it",
        404
      );
    }

    // Delete service package using the correct field
    // Use numeric id as it's more reliable
    await prisma.servicePackage.delete({
      where: { id: existingPackage.id },
    });

    return ApiResponse.success(
      res,
      null,
      "Service package deleted successfully"
    );
  } catch (error: any) {
    console.error("Delete Service Package Error:", error);
    return ApiResponse.error(res, "Failed to delete service package");
  }
}

/**
 * Upload service package media
 */
export async function uploadServicePackageMedia(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    if (!req.files || !Array.isArray(req.files)) {
      return ApiResponse.error(res, "No files uploaded", 400);
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(
      (file: Express.Multer.File) => {
        const relativePath = getRelativePath(file.path);
        const fileUrl = getFileUrl(relativePath);

        // Determine file type based on mimetype
        let fileType = "document"; // default
        if (file.mimetype.startsWith("image/")) {
          fileType = "image";
        } else if (file.mimetype.startsWith("video/")) {
          fileType = "video";
        } else if (file.mimetype.startsWith("audio/")) {
          fileType = "audio";
        }

        return {
          originalName: file.originalname,
          fileName: file.filename,
          filePath: relativePath, // Store relative path for DB
          fileSize: file.size,
          mimeType: file.mimetype,
          fileType: fileType,
          url: fileUrl, // Return full URL for frontend
        };
      }
    );

    return ApiResponse.success(
      res,
      {
        files: uploadedFiles,
        count: uploadedFiles.length,
      },
      "Media uploaded successfully"
    );
  } catch (error: any) {
    console.error("Error uploading media:", error);
    return ApiResponse.error(res, "Failed to upload media", 500);
  }
}

/**
 * Upload service package thumbnail
 */
export async function uploadServicePackageThumbnail(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    if (!req.files || !Array.isArray(req.files)) {
      return ApiResponse.error(res, "No files uploaded", 400);
    }

    const uploadedThumbnails = (req.files as Express.Multer.File[]).map(
      (file: Express.Multer.File) => {
        const relativePath = getRelativePath(file.path);
        const fileUrl = getFileUrl(relativePath);

        return {
          originalName: file.originalname,
          fileName: file.filename,
          filePath: relativePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileType: "image", // thumbnails are always images
          url: fileUrl, // Return full URL for frontend
        };
      }
    );

    return ApiResponse.success(
      res,
      {
        files: uploadedThumbnails,
        count: uploadedThumbnails.length,
      },
      "Thumbnail uploaded successfully"
    );
  } catch (error: any) {
    console.error("Error uploading thumbnail:", error);
    return ApiResponse.error(res, "Failed to upload thumbnail", 500);
  }
}

/**
 * Delete service package file
 */
export async function deleteServicePackageFile(req: Request, res: Response) {
  try {
    console.log("📁 DELETE FILE REQUEST");
    console.log("- Request URL:", req.url);
    console.log("- Query params:", req.query);
    
    const userId = req.user?.id;
    // Try both query params and body for compatibility
    const filePath = (req.query.filePath as string) || req.body.filePath;

    console.log("- User ID:", userId);
    console.log("- File path:", filePath);

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    if (!filePath) {
      return ApiResponse.error(res, "File path is required", 400);
    }

    const absolutePath = path.join(process.cwd(), filePath);
    console.log("- Absolute path:", absolutePath);
    console.log("- File exists:", fs.existsSync(absolutePath));

    // Check if file exists and delete it
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log("✅ File deleted successfully");
      return ApiResponse.success(res, null, "File deleted successfully");
    } else {
      console.log("❌ File not found - returning 404");
      return ApiResponse.error(res, "File not found", 404);
    }
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return ApiResponse.error(res, "Failed to delete file", 500);
  }
}

