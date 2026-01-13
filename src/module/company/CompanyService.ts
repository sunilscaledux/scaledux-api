import { prisma } from '@services/prismaService';
import { CreateCompanyDetailDto, UpdateCompanyDetailDto, CompanyDetailResponse } from './CompanyType';

export class CompanyService {
  /**
   * Create company detail for a user
   */
  async createCompanyDetail(userId: number, data: CreateCompanyDetailDto): Promise<CompanyDetailResponse> {
    // Check if company detail already exists
    const existingCompany = await prisma.companyDetail.findUnique({
      where: { user_id: userId }
    });

    if (existingCompany) {
      throw new Error('Company detail already exists for this user');
    }

    const companyDetail = await prisma.companyDetail.create({
      data: {
        user_id: userId,
        ...data
      },
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return companyDetail;
  }

  /**
   * Get company detail by user ID
   */
  async getCompanyDetailByUserId(userId: number): Promise<CompanyDetailResponse | null> {
    const companyDetail = await prisma.companyDetail.findUnique({
      where: { user_id: userId },
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return companyDetail;
  }

  /**
   * Get company detail by ID
   */
  async getCompanyDetailById(id: number): Promise<CompanyDetailResponse | null> {
    const companyDetail = await prisma.companyDetail.findUnique({
      where: { id },
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return companyDetail;
  }

  /**
   * Update company detail
   */
  async updateCompanyDetail(userId: number, data: UpdateCompanyDetailDto): Promise<CompanyDetailResponse> {
    // Check if company detail exists
    const existingCompany = await prisma.companyDetail.findUnique({
      where: { user_id: userId }
    });

    if (!existingCompany) {
      throw new Error('Company detail not found');
    }

    const updatedCompany = await prisma.companyDetail.update({
      where: { user_id: userId },
      data,
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return updatedCompany;
  }

  /**
   * Delete company detail
   */
  async deleteCompanyDetail(userId: number): Promise<void> {
    const existingCompany = await prisma.companyDetail.findUnique({
      where: { user_id: userId }
    });

    if (!existingCompany) {
      throw new Error('Company detail not found');
    }

    await prisma.companyDetail.delete({
      where: { user_id: userId }
    });
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(userId: number, logoUrl: string): Promise<CompanyDetailResponse> {
    const companyDetail = await prisma.companyDetail.findUnique({
      where: { user_id: userId }
    });

    if (!companyDetail) {
      throw new Error('Company detail not found. Please create company profile first.');
    }

    const updated = await prisma.companyDetail.update({
      where: { user_id: userId },
      data: { company_logo: logoUrl },
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return updated;
  }

  /**
   * Upload company cover image
   */
  async uploadCompanyCoverImage(userId: number, coverImageUrl: string): Promise<CompanyDetailResponse> {
    const companyDetail = await prisma.companyDetail.findUnique({
      where: { user_id: userId }
    });

    if (!companyDetail) {
      throw new Error('Company detail not found. Please create company profile first.');
    }

    const updated = await prisma.companyDetail.update({
      where: { user_id: userId },
      data: { company_cover_image: coverImageUrl },
      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
            symbol: true
          }
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flag: true
          }
        },
        state: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return updated;
  }

  /**
   * Get all companies (for admin or listing purposes)
   */
  async getAllCompanies(page: number = 1, limit: number = 10): Promise<{
    companies: CompanyDetailResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      prisma.companyDetail.findMany({
        skip,
        take: limit,
        include: {
          currency: {
            select: {
              id: true,
              name: true,
              code: true,
              symbol: true
            }
          },
          country: {
            select: {
              id: true,
              name: true,
              code: true,
              flag: true
            }
          },
          state: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.companyDetail.count()
    ]);

    return {
      companies,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
