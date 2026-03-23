import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from '@services/loggerService';
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds } from '@services/attachmentService';

/**
 * Helper to parse JSON fields and resolve file URLs (async).
 */
const packageRelationInclude = {
  category: { select: { id: true, name: true } as const },
  subcategory: { select: { id: true, name: true } as const },
} as const;

async function parseServicePackageJsonAsync(pkg: any) {
  const { category, subcategory, ...pkgRow } = pkg;
  const thumbnailNorm = urlsOrPathsToAttachmentIds([pkgRow.thumbnail])[0] ?? '';
  const imagesArr = typeof pkgRow.images === "string" ? JSON.parse(pkgRow.images) : (pkgRow.images || []);
  const videoArr = typeof pkgRow.video === "string" ? JSON.parse(pkgRow.video) : (pkgRow.video || []);
  const documentsArr = typeof pkgRow.documents === "string" ? JSON.parse(pkgRow.documents) : (pkgRow.documents || []);
  const [thumbnail, images, video, documents] = await Promise.all([
    thumbnailNorm ? resolveAttachmentUrl(thumbnailNorm, 'thumbnail') : Promise.resolve(null),
    resolveAttachmentUrls(imagesArr, 'documents'),
    resolveAttachmentUrls(videoArr, 'documents'),
    resolveAttachmentUrls(documentsArr, 'documents'),
  ]);
  return {
    ...pkgRow,
    subCategory: subcategory ?? null,
    category: category ?? null,
    features: typeof pkgRow.features === "string" ? JSON.parse(pkgRow.features) : pkgRow.features,
    industry: typeof pkgRow.industries === "string" ? JSON.parse(pkgRow.industries) : pkgRow.industries || [],
    keywords: Array.isArray(pkgRow.skill_ids) ? pkgRow.skill_ids : (typeof pkgRow.skill_ids === "string" ? JSON.parse(pkgRow.skill_ids || "[]") : []),
    skill_ids: typeof pkgRow.skill_ids === "string" ? JSON.parse(pkgRow.skill_ids) : pkgRow.skill_ids || [],
    scope: typeof pkgRow.scope === "string" ? JSON.parse(pkgRow.scope) : pkgRow.scope,
    extraAddOns: typeof pkgRow.extra_add_ons === "string" ? JSON.parse(pkgRow.extra_add_ons) : pkgRow.extra_add_ons || null,
    packageDescription: pkgRow.package_description || pkgRow.packageDescription || "",
    deliverables: typeof pkgRow.deliverables === "string" ? JSON.parse(pkgRow.deliverables) : pkgRow.deliverables,
    faqs: typeof pkgRow.faqs === "string" ? JSON.parse(pkgRow.faqs) : pkgRow.faqs,
    links: typeof pkgRow.links === "string" ? JSON.parse(pkgRow.links) : pkgRow.links,
    requirements: typeof pkgRow.requirements === "string" ? JSON.parse(pkgRow.requirements) : pkgRow.requirements,
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
        include: packageRelationInclude,
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
        include: packageRelationInclude,
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
        include: packageRelationInclude,
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
        include: packageRelationInclude,
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
