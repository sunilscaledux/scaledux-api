import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";

export interface CreateContactParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  reason?: string;
  subject?: string;
  message?: string;
  ipAddress?: string | null;
}

const REASONS = ["question", "sales", "support", "other"] as const;
const nameRegex = /^\p{L}+$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d+$/;

export class ContactService {
  /** Persist a public contact-form submission after validating the fields. */
  static async create(params: CreateContactParams) {
    const firstName = (params.firstName || "").trim();
    const lastName = (params.lastName || "").trim();
    const email = (params.email || "").trim();
    const phone = (params.phoneNumber || "").trim();
    const reason = (params.reason || "").trim();
    const subject = (params.subject || "").trim();
    const message = (params.message || "").trim();

    if (!firstName || firstName.length > 20 || !nameRegex.test(firstName)) {
      return { success: false, message: "Please enter a valid first name." };
    }
    if (!lastName || lastName.length > 20 || !nameRegex.test(lastName)) {
      return { success: false, message: "Please enter a valid last name." };
    }
    if (!email || email.length > 255 || !emailRegex.test(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }
    if (!phone || phone.length < 10 || phone.length > 15 || !phoneRegex.test(phone)) {
      return { success: false, message: "Please enter a valid phone number." };
    }
    if (!REASONS.includes(reason as (typeof REASONS)[number])) {
      return { success: false, message: "Please select a valid reason." };
    }
    if (!subject || subject.length > 50) {
      return { success: false, message: "Please enter a subject (max 50 characters)." };
    }
    if (message.length < 50 || message.length > 1000) {
      return { success: false, message: "Message must be between 50 and 1000 characters." };
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        reason,
        subject,
        message,
        ip_address: params.ipAddress?.slice(0, 45) || null,
        status: "NEW",
      },
    });

    Log.info(`[Contact] New submission #${submission.id} from ${email}`, { reason });

    return {
      success: true,
      message: "Thanks for reaching out! Our team will get back to you within 1-2 business days.",
      data: { id: submission.id, uniqueId: submission.unique_id },
    };
  }
}
