import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";

export interface SubscribeParams {
  email?: string;
  role?: string;
  source?: string;
  ipAddress?: string | null;
}

export const NEWSLETTER_ROLES = ["founder", "freelancer", "mentor", "investor"] as const;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class NewsletterService {
  /** Subscribe an email to the community newsletter; re-subscribes a lapsed address. */
  static async subscribe(params: SubscribeParams) {
    const email = (params.email || "").trim().toLowerCase();
    const role = (params.role || "").trim().toLowerCase();

    if (!email || email.length > 255 || !emailRegex.test(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }
    if (!NEWSLETTER_ROLES.includes(role as (typeof NEWSLETTER_ROLES)[number])) {
      return { success: false, message: "Please select a valid role." };
    }

    const ip = params.ipAddress?.slice(0, 45) || null;
    const source = (params.source || "landing").slice(0, 30);

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.status === "SUBSCRIBED" && existing.role === role) {
        return {
          success: true,
          message: "You're already on the list. We'll keep the updates coming.",
          data: { id: existing.id, uniqueId: existing.unique_id },
        };
      }

      const updated = await prisma.newsletterSubscriber.update({
        where: { email },
        data: { role, status: "SUBSCRIBED", unsubscribed_at: null, ip_address: ip },
      });

      Log.info(`[Newsletter] Re-subscribed #${updated.id} (${email})`, { role });
      return {
        success: true,
        message: "You're on the list! Tailored updates are on the way.",
        data: { id: updated.id, uniqueId: updated.unique_id },
      };
    }

    const created = await prisma.newsletterSubscriber.create({
      data: { email, role, source, ip_address: ip, status: "SUBSCRIBED" },
    });

    Log.info(`[Newsletter] New subscriber #${created.id} (${email})`, { role, source });

    return {
      success: true,
      message: "You're on the list! Tailored updates are on the way.",
      data: { id: created.id, uniqueId: created.unique_id },
    };
  }
}
