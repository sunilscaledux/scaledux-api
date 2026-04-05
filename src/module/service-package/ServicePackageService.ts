import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from '@services/loggerService';
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from '@services/attachmentService';
import { createRedirectLink } from '@services/redirectLinkService';

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
    thumbnailNorm ? resolveAttachmentUrl(thumbnailNorm, 'service_package_thumbnail') : Promise.resolve(null),
    resolveAttachmentUrls(imagesArr, 'service_package_media'),
    resolveAttachmentUrls(videoArr, 'service_package_media'),
    resolveAttachmentUrls(documentsArr, 'service_package_documents'),
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
    links: await (async () => {
      const raw = typeof pkgRow.links === "string" ? JSON.parse(pkgRow.links) : pkgRow.links;
      if (!Array.isArray(raw) || raw.length === 0) return raw || [];
      // Generate redirect URLs for links that don't have one
      return Promise.all(raw.map(async (link: any) => {
        if (link?.url && !link.redirect_url) {
          const redirectUrl = await createRedirectLink(link.url, {
            entityType: 'service_package',
            entityId: pkgRow.id,
            createdBy: pkgRow.user_id
          });
          return { url: link.url, redirect_url: redirectUrl };
        }
        return link;
      }));
    })(),
    requirements: typeof pkgRow.requirements === "string" ? JSON.parse(pkgRow.requirements) : pkgRow.requirements,
    thumbnail,
    images,
    video,
    documents,
  };
}

export class ServicePackageService {
  /**
   * Get all service packages for authenticated user (card-level data only)
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
        select: {
          id: true,
          unique_id: true,
          title: true,
          thumbnail: true,
          images: true,
          scope: true,
          skill_ids: true,
          has_basic: true,
          has_standard: true,
          has_premium: true,
          status: true,
          created_at: true,
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          user: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              personalInfo: { select: { profileImage: true } }
            }
          }
        },
      });

      const transformedPackages = await Promise.all(packages.map(async (pkg: any) => {
        const thumbnailId = Array.isArray(pkg.thumbnail) ? pkg.thumbnail[0] : pkg.thumbnail;
        const imagesArr = typeof pkg.images === "string" ? JSON.parse(pkg.images) : (pkg.images || []);
        const [thumbnail, images] = await Promise.all([
          thumbnailId ? resolveAttachmentUrl(thumbnailId, 'service_package_thumbnail') : Promise.resolve(null),
          resolveAttachmentUrls(imagesArr.slice(0, 1), 'service_package_media'),
        ]);

        return {
          id: pkg.id,
          unique_id: pkg.unique_id,
          title: pkg.title,
          thumbnail,
          images,
          scope: typeof pkg.scope === "string" ? JSON.parse(pkg.scope) : pkg.scope,
          keywords: Array.isArray(pkg.skill_ids) ? pkg.skill_ids : (typeof pkg.skill_ids === "string" ? JSON.parse(pkg.skill_ids || "[]") : []),
          has_basic: pkg.has_basic,
          has_standard: pkg.has_standard,
          has_premium: pkg.has_premium,
          status: pkg.status,
          created_at: pkg.created_at,
          category: pkg.category ?? null,
          subCategory: pkg.subcategory ?? null,
          user: {
            id: pkg.user.id,
            uniqueId: pkg.user.unique_id,
            firstName: pkg.user.first_name,
            lastName: pkg.user.last_name,
            profileImage: pkg.user.personalInfo?.profileImage || null
          }
        };
      }));

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
   * Get all PUBLISHED service packages for a user (public, no auth).
   */
  static async getPublicUserServicePackages(userUniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { unique_id: userUniqueId },
        select: { id: true }
      });
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const result = await ServicePackageService.getUserServicePackages(user.id, 'PUBLISHED');
      return result;
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to retrieve service packages" };
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
   * Get published service package by ID (public - no auth required)
   */
  static async getPublicServicePackage(uniqueId: string): Promise<ServiceResponse> {
    try {
      const servicePackage = await prisma.servicePackage.findFirst({
        where: {
          unique_id: uniqueId,
          status: "PUBLISHED",
        },
        include: {
          ...packageRelationInclude,
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              personalInfo: { select: { profileImage: true } }
            }
          },
        },
      });

      if (!servicePackage) {
        return {
          success: false,
          message: "Service package not found"
        };
      }

      const { user, ...rest } = servicePackage as any;
      const transformedPackage = await parseServicePackageJsonAsync(rest);

      return {
        success: true,
        message: "Service package retrieved successfully",
        data: {
          ...transformedPackage,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            profileImage: user.personalInfo?.profileImage || null
          }
        }
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
   * Process links — create redirect URLs for each link
   */
  private static async processLinks(
    links: any[],
    entityId?: number,
    createdBy?: number
  ): Promise<any[]> {
    if (!Array.isArray(links) || links.length === 0) return [];
    return Promise.all(
      links.map(async (link: any) => {
        if (link?.url && !link.url.includes('/r/')) {
          const redirectUrl = await createRedirectLink(link.url, {
            entityType: 'service_package',
            entityId,
            createdBy
          });
          return { url: link.url, redirect_url: redirectUrl };
        }
        return link;
      })
    );
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
      const processedLinks = await this.processLinks(packageData.links || [], undefined, userId)

      const newPackage = await prisma.servicePackage.create({
        data: {
          user_id: userId,
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          category_id: packageData.categoryId,
          sub_category_id: packageData.subCategoryId,
          industries: packageData.industry || [],
          skill_ids: packageData.keywords || packageData.skill_ids || [],
          scope: packageData.scope || {},
          deliverables: packageData.deliverables || [],
          requirements: packageData.requirements || [],
          faqs: packageData.faqs || [],
          links: processedLinks,
          features: packageData.features || [],
          extra_add_ons: packageData.extraAddOns ?? [],
          thumbnail: normalizedThumbnail,
          images: normalizedImages,
          video: normalizedVideo,
          documents: normalizedDocuments,
          has_basic: packageData.hasBasic || false,
          has_standard: packageData.hasStandard || false,
          has_premium: packageData.hasPremium || false,
          basic_label: packageData.basicLabel || "Basic",
          standard_label: packageData.standardLabel || "Standard",
          premium_label: packageData.premiumLabel || "Premium",
          status: packageData.status || "DRAFT",
        },
        include: packageRelationInclude,
      });

      const allFileIds = [normalizedThumbnail, ...normalizedImages, ...normalizedVideo, ...normalizedDocuments].filter(Boolean) as string[];
      if (allFileIds.length > 0) await markAttachmentsAttached(allFileIds, [userId]);

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
      const processedLinks = await this.processLinks(packageData.links || [], existingPackage.id, userId)

      const updatedPackage = await prisma.servicePackage.update({
        where: { id: existingPackage.id },
        data: {
          title: packageData.title,
          package_description: packageData.packageDescription || "",
          category_id: packageData.categoryId,
          sub_category_id: packageData.subCategoryId,
          industries: packageData.industry || [],
          skill_ids: packageData.keywords || packageData.skill_ids || [],
          scope: packageData.scope || {},
          deliverables: packageData.deliverables || [],
          requirements: packageData.requirements || [],
          faqs: packageData.faqs || [],
          links: processedLinks,
          features: packageData.features || [],
          extra_add_ons: packageData.extraAddOns ?? [],
          thumbnail: normalizedThumbnail,
          images: normalizedImages,
          video: normalizedVideo,
          documents: normalizedDocuments,
          has_basic: packageData.hasBasic ?? existingPackage.has_basic,
          has_standard: packageData.hasStandard ?? existingPackage.has_standard,
          has_premium: packageData.hasPremium ?? existingPackage.has_premium,
          basic_label: packageData.basicLabel || existingPackage.basic_label || "Basic",
          standard_label: packageData.standardLabel || existingPackage.standard_label || "Standard",
          premium_label: packageData.premiumLabel || existingPackage.premium_label || "Premium",
          status: packageData.status || existingPackage.status,
        },
        include: packageRelationInclude,
      });

      const allFileIds = [normalizedThumbnail, ...normalizedImages, ...normalizedVideo, ...normalizedDocuments].filter(Boolean) as string[];
      if (allFileIds.length > 0) await markAttachmentsAttached(allFileIds, [userId]);

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
  /**
   * Duplicate service package
   */
  static async duplicateServicePackage(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const existing = await prisma.servicePackage.findFirst({
        where: { unique_id: uniqueId, user_id: userId },
      });

      if (!existing) {
        return { success: false, message: "Service package not found" };
      }

      const { id, unique_id, created_at, updated_at, ...data } = existing as any;

      const duplicate = await prisma.servicePackage.create({
        data: {
          ...data,
          title: `${data.title} (Copy)`,
          status: "DRAFT",
        },
        include: packageRelationInclude,
      });

      const transformedPackage = await parseServicePackageJsonAsync(duplicate);

      return {
        success: true,
        message: "Service package duplicated successfully",
        data: transformedPackage
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to duplicate service package" };
    }
  }

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
