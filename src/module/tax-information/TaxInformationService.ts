import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { TaxInformationInput } from "./TaxInformationType";

export class TaxInformationService {

  static async saveTaxInformation(userId: string, data: TaxInformationInput) {
    const userIdNum = parseInt(userId);
    const entityType = data.activeTab;

    if (entityType === 'AGENCY') {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { agency_verification_status: true }
      });
      if (user?.agency_verification_status !== 'APPROVED') {
        return { success: false, message: "You need to verify your agency before saving agency tax details." };
      }
    }

    const name = data.name?.trim() || null;
    const panNumber = data.panNumber?.trim().toUpperCase() || null;
    const hasGSTIN = !!data.hasGSTIN;
    const gstin = hasGSTIN ? data.gstin?.trim().toUpperCase() || null : null;

    if (!panNumber) {
      return { success: false, message: "PAN number is required." };
    }

    const taxInfo = await (prisma as any).taxInformation.upsert({
      where: {
        user_id_entity_type: { user_id: userIdNum, entity_type: entityType }
      },
      update: {
        tax_residence: data.taxResidence,
        name,
        pan_number: panNumber,
        has_gstin: hasGSTIN,
        gstin,
        updated_at: new Date()
      },
      create: {
        user_id: userIdNum,
        entity_type: entityType,
        tax_residence: data.taxResidence,
        name,
        pan_number: panNumber,
        has_gstin: hasGSTIN,
        gstin,
      }
    });

    return {
      success: true,
      message: "Tax information saved successfully.",
      data: TaxInformationService.mapRecord(taxInfo)
    };
  }

  static async getTaxInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const records = await (prisma as any).taxInformation.findMany({
      where: { user_id: userIdNum },
      orderBy: { created_at: 'desc' }
    });

    const individual = records.find((r: any) => r.entity_type === 'INDIVIDUAL') || null;
    const agency = records.find((r: any) => r.entity_type === 'AGENCY') || null;

    return {
      success: true,
      data: {
        individual: individual ? TaxInformationService.mapRecord(individual) : null,
        agency: agency ? TaxInformationService.mapRecord(agency) : null,
      }
    };
  }

  private static mapRecord(record: any) {
    return {
      id: record.id,
      entityType: record.entity_type,
      taxResidence: record.tax_residence,
      name: record.name || '',
      panNumber: record.pan_number || '',
      hasGSTIN: !!record.has_gstin,
      gstin: record.gstin || '',
      gstinStatus: record.gstin_status || 'PENDING',
      gstinFailureReason: record.gstin_failure_reason || null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
