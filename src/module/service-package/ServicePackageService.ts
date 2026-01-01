import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, extractRelativePath, normalizeUploadedPaths } from '@utils/General';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';

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
    thumbnail: (() => {
      const normalized = pkg.thumbnail ? normalizeUploadedPaths([pkg.thumbnail])[0] : ''
      return normalized ? getFileUrl(normalized) : null
    })(),
    images: (typeof pkg.images === "string" ? JSON.parse(pkg.images) : (pkg.images || [])).map((path: string) => getFileUrl(path)),
    video: (typeof pkg.video === "string" ? JSON.parse(pkg.video) : (pkg.video || [])).map((path: string) => getFileUrl(path)),
    documents: (typeof pkg.documents === "string" ? JSON.parse(pkg.documents) : (pkg.documents || [])).map((path: string) => getFileUrl(path)),
  };
};

export class ServicePackageService {
  /**
   * Get all service packages for authenticated user
   */
  static async getUserServicePackages(userId: number, status?: string): Promise<ServiceResponse> {
    try {
      const whereClause: any = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const packages = await prisma.servicePackage.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
      });

      const transformedPackages = packages.map(parseServicePackageJson);

      return {
        success: true,
        message: "Service packages retrieved successfully",
        data: transformedPackages
      };
    } catch (error: any) {
      console.error("Get User Service Packages Error:", error);
      return {
        success: false,
        message: "Failed to retrieve service packages"
      };
    }
  }

  /**
   * Get service package by ID
   */
  static async getServicePackageById(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const servicePackage = await prisma.servicePackage.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
        },
      });

      if (!servicePackage) {
        return {
          success: false,
          message: "Service package not found"
        };
      }

      const transformedPackage = parseServicePackageJson(servicePackage);

      return {
        success: true,
        message: "Service package retrieved successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      console.error("Get Service Package By ID Error:", error);
      return {
        success: false,
        message: "Failed to retrieve service package"
      };
    }
  }

  /**
   * Create new service package
   */
  static async createServicePackage(userId: number, packageData: any): Promise<ServiceResponse> {
    try {
      const normalizedThumbnail = packageData.thumbnail
        ? normalizeUploadedPaths([packageData.thumbnail])[0]
        : null;
      const normalizedImages = packageData.images
        ? normalizeUploadedPaths(packageData.images)
        : [];
      const normalizedVideo = packageData.video
        ? normalizeUploadedPaths(packageData.video)
        : [];
      const normalizedDocuments = packageData.documents
        ? normalizeUploadedPaths(packageData.documents)
        : [];

      const newPackage = await prisma.servicePackage.create({
        data: {
          unique_id: ulid(),
          user_id: userId,
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          category_id: packageData.categoryId,
          sub_category_id: packageData.subCategoryId,
          keywords: JSON.stringify(packageData.keywords || []),
          industries: JSON.stringify(packageData.industry || []),
          scope: JSON.stringify(packageData.scope || {}),
          deliverables: JSON.stringify(packageData.deliverables || []),
          requirements: JSON.stringify(packageData.requirements || []),
          faqs: JSON.stringify(packageData.faqs || []),
          links: JSON.stringify(packageData.links || []),
          features: JSON.stringify(packageData.features || []),
          extra_add_ons: (packageData.extraAddOns ? JSON.stringify(packageData.extraAddOns) : null) as any,
          thumbnail: normalizedThumbnail,
          images: JSON.stringify(normalizedImages),
          video: JSON.stringify(normalizedVideo),
          documents: JSON.stringify(normalizedDocuments),
          status: packageData.status || "DRAFT",
          
        },
      });

      const transformedPackage = parseServicePackageJson(newPackage);

      return {
        success: true,
        message: "Service package created successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      console.error("Create Service Package Error:", error);
      return {
        success: false,
        message: "Failed to create service package"
      };
    }
  }

  /**
   * Update service package
   */
  static async updateServicePackage(userId: number, uniqueId: string, packageData: any): Promise<ServiceResponse> {
    try {
      // Check if package exists and belongs to user
      const existingPackage = await prisma.servicePackage.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
        },
      });

      if (!existingPackage) {
        return {
          success: false,
          message: "Service package not found"
        };
      }

      const normalizedThumbnail = packageData.thumbnail
        ? normalizeUploadedPaths([packageData.thumbnail])[0]
        : null;
      const normalizedImages = packageData.images
        ? normalizeUploadedPaths(packageData.images)
        : [];
      const normalizedVideo = packageData.video
        ? normalizeUploadedPaths(packageData.video)
        : [];
      const normalizedDocuments = packageData.documents
        ? normalizeUploadedPaths(packageData.documents)
        : [];

      const updatedPackage = await prisma.servicePackage.update({
        where: { id: existingPackage.id },
        data: {
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          category_id: packageData.categoryId,
          sub_category_id: packageData.subCategoryId,
          keywords: JSON.stringify(packageData.keywords || []),
          industries: JSON.stringify(packageData.industry || []),
          scope: JSON.stringify(packageData.scope || {}),
          deliverables: JSON.stringify(packageData.deliverables || []),
          requirements: JSON.stringify(packageData.requirements || []),
          faqs: JSON.stringify(packageData.faqs || []),
          links: JSON.stringify(packageData.links || []),
          features: JSON.stringify(packageData.features || []),
          extra_add_ons: (packageData.extraAddOns ? JSON.stringify(packageData.extraAddOns) : null) as any,
          thumbnail: normalizedThumbnail,
          images: JSON.stringify(normalizedImages),
          video: JSON.stringify(normalizedVideo),
          documents: JSON.stringify(normalizedDocuments),
          status: packageData.status || existingPackage.status,
        },
      });

      const transformedPackage = parseServicePackageJson(updatedPackage);

      return {
        success: true,
        message: "Service package updated successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      console.error("Update Service Package Error:", error);
      return {
        success: false,
        message: "Failed to update service package"
      };
    }
  }

  /**
   * Delete service package
   */
  static async deleteServicePackage(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      console.log("🗑️ DELETE SERVICE PACKAGE REQUEST");
      console.log("- User ID:", userId);
      console.log("- Package ID:", uniqueId);

      // Check if package exists and belongs to user
      const existingPackage = await prisma.servicePackage.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
        },
      });

      if (!existingPackage) {
        return {
          success: false,
          message: "Service package not found"
        };
      }

      await prisma.servicePackage.delete({
        where: { id: existingPackage.id },
      });

      return {
        success: true,
        message: "Service package deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete Service Package Error:", error);
      return {
        success: false,
        message: "Failed to delete service package"
      };
    }
  }

  /**
   * Delete service package file
   */
  static async deleteServicePackageFile(userId: number, filePath: string): Promise<ServiceResponse> {
    try {
      console.log("📁 DELETE FILE REQUEST");
      console.log("- User ID:", userId);
      console.log("- File path:", filePath);

      if (!filePath) {
        return {
          success: false,
          message: "File path is required"
        };
      }

      // Extract relative path and construct full path
      const relativePath = extractRelativePath(filePath);
      const cleanedRelativePath = relativePath.startsWith('uploads/')
        ? relativePath.slice('uploads/'.length)
        : relativePath;
      const fullPath = path.join(process.cwd(), "uploads", cleanedRelativePath);

      console.log("- Relative path:", relativePath);
      console.log("- Full path:", fullPath);

      // Check if file exists and delete it
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log("✅ File deleted successfully");
      } else {
        console.log("⚠️ File not found, but continuing...");
      }

      return {
        success: true,
        message: "File deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete Service Package File Error:", error);
      return {
        success: false,
        message: "Failed to delete file"
      };
    }
  }
}
