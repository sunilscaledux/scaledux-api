import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from '@services/loggerService';
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds } from '@services/attachmentService';

/**
 * Helper to parse JSON fields and resolve file URLs (async).
 */
async function parseServicePackageJsonAsync(pkg: any) {
  const thumbnailNorm = urlsOrPathsToAttachmentIds([pkg.thumbnail])[0] ?? '';
  const imagesArr = typeof pkg.images === "string" ? JSON.parse(pkg.images) : (pkg.images || []);
  const videoArr = typeof pkg.video === "string" ? JSON.parse(pkg.video) : (pkg.video || []);
  const documentsArr = typeof pkg.documents === "string" ? JSON.parse(pkg.documents) : (pkg.documents || []);
  const [thumbnail, images, video, documents] = await Promise.all([
    thumbnailNorm ? resolveAttachmentUrl(thumbnailNorm, { entityType: 'servicePackage', fieldName: 'thumbnail' }) : Promise.resolve(null),
    resolveAttachmentUrls(imagesArr, { entityType: 'servicePackage', fieldName: 'documents' }),
    resolveAttachmentUrls(videoArr, { entityType: 'servicePackage', fieldName: 'documents' }),
    resolveAttachmentUrls(documentsArr, { entityType: 'servicePackage', fieldName: 'documents' }),
  ]);
  return {
    ...pkg,
    features: typeof pkg.features === "string" ? JSON.parse(pkg.features) : pkg.features,
    industry: typeof pkg.industries === "string" ? JSON.parse(pkg.industries) : pkg.industries || [],
    keywords: Array.isArray(pkg.skill_ids) ? pkg.skill_ids : (typeof pkg.skill_ids === "string" ? JSON.parse(pkg.skill_ids || "[]") : []),
    skill_ids: typeof pkg.skill_ids === "string" ? JSON.parse(pkg.skill_ids) : pkg.skill_ids || [],
    scope: typeof pkg.scope === "string" ? JSON.parse(pkg.scope) : pkg.scope,
    extraAddOns: typeof pkg.extra_add_ons === "string" ? JSON.parse(pkg.extra_add_ons) : pkg.extra_add_ons || null,
    packageDescription: pkg.package_description || pkg.packageDescription || "",
    deliverables: typeof pkg.deliverables === "string" ? JSON.parse(pkg.deliverables) : pkg.deliverables,
    faqs: typeof pkg.faqs === "string" ? JSON.parse(pkg.faqs) : pkg.faqs,
    links: typeof pkg.links === "string" ? JSON.parse(pkg.links) : pkg.links,
    requirements: typeof pkg.requirements === "string" ? JSON.parse(pkg.requirements) : pkg.requirements,
    thumbnail,
    images,
    video,
    documents,
  };
}

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

      const transformedPackages = await Promise.all(packages.map(parseServicePackageJsonAsync));

      return {
        success: true,
        message: "Service packages retrieved successfully",
        data: transformedPackages
      };
    } catch (error: any) {
      Log.error("Error", { error });
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

      const transformedPackage = await parseServicePackageJsonAsync(servicePackage);

      return {
        success: true,
        message: "Service package retrieved successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      Log.error("Error", { error });
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
      const normalizedThumbnail = urlsOrPathsToAttachmentIds([packageData.thumbnail])[0] ?? null
      const normalizedImages = urlsOrPathsToAttachmentIds(packageData.images || [])
      const normalizedVideo = urlsOrPathsToAttachmentIds(packageData.video || [])
      const normalizedDocuments = urlsOrPathsToAttachmentIds(packageData.documents || [])

      const newPackage = await prisma.servicePackage.create({
        data: {
          user_id: userId,
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          expertise_category_id: packageData.categoryId,
          specialty_id: packageData.subCategoryId,
          industries: packageData.industry || [],
          skill_ids: packageData.keywords || packageData.skill_ids || [],
          scope: packageData.scope || {},
          deliverables: packageData.deliverables || [],
          requirements: packageData.requirements || [],
          faqs: packageData.faqs || [],
          links: packageData.links || [],
          features: packageData.features || [],
          extra_add_ons: packageData.extraAddOns ?? [],
          thumbnail: normalizedThumbnail,
          images: normalizedImages,
          video: normalizedVideo,
          documents: normalizedDocuments,
          status: packageData.status || "DRAFT",
        },
      });

      const transformedPackage = await parseServicePackageJsonAsync(newPackage);

      return {
        success: true,
        message: "Service package created successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      Log.error("Error", { error });
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

      const normalizedThumbnail = urlsOrPathsToAttachmentIds([packageData.thumbnail])[0] ?? null
      const normalizedImages = urlsOrPathsToAttachmentIds(packageData.images || [])
      const normalizedVideo = urlsOrPathsToAttachmentIds(packageData.video || [])
      const normalizedDocuments = urlsOrPathsToAttachmentIds(packageData.documents || [])

      const updatedPackage = await prisma.servicePackage.update({
        where: { id: existingPackage.id },
        data: {
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          expertise_category_id: packageData.categoryId,
          specialty_id: packageData.subCategoryId,
          industries: packageData.industry || [],
          skill_ids: packageData.keywords || packageData.skill_ids || [],
          scope: packageData.scope || {},
          deliverables: packageData.deliverables || [],
          requirements: packageData.requirements || [],
          faqs: packageData.faqs || [],
          links: packageData.links || [],
          features: packageData.features || [],
          extra_add_ons: packageData.extraAddOns ?? [],
          thumbnail: normalizedThumbnail,
          images: normalizedImages,
          video: normalizedVideo,
          documents: normalizedDocuments,
          status: packageData.status || existingPackage.status,
        },
      });

      const transformedPackage = await parseServicePackageJsonAsync(updatedPackage);

      return {
        success: true,
        message: "Service package updated successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      Log.error("Error", { error });
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
      Log.info("🗑️ DELETE SERVICE PACKAGE REQUEST");
      Log.info("- User ID:", userId);
      Log.info("- Package ID:", uniqueId);

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
      Log.error("Error", { error });
      return {
        success: false,
        message: "An error occurred while deleting the service package"
      };
    }
  }
}
