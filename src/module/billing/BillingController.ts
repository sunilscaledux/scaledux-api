import { Request, Response } from "express";
import { BillingService } from "./BillingService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";

export class BillingController {
  // Create Razorpay order for card verification
  static async createVerificationOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const { amount } = req.body;
      const result = await BillingService.createVerificationOrder(userId.toString(), amount || 1);
      
      if (!result.success) {
        return ApiResponse.error(res, result.message);
      }

      return ApiResponse.success(res, result.data, "Verification order created successfully");
    } catch (error: any) {
      console.error("Error creating verification order:", error);
      return ApiResponse.error(res, error.message || "Failed to create verification order");
    }
  }

  // Verify Razorpay payment and save payment method
  static async verifyAndSavePaymentMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      // Verify Razorpay signature
      const isValid = BillingService.verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      if (!isValid) {
        return ApiResponse.error(res, "Invalid payment signature", 400);
      }

      // Fetch real card details from Razorpay
      const cardDetails = await BillingService.fetchPaymentDetails(razorpayPaymentId);
      
      if (!cardDetails) {
        return ApiResponse.error(res, "Failed to fetch card details from Razorpay", 500);
      }

      // Create Razorpay customer if not exists (for future charges)
      let customerId = cardDetails.customerId;
      if (!customerId && cardDetails.email && cardDetails.contact) {
        customerId = await BillingService.createOrGetCustomer(
          userId.toString(),
          cardDetails.email,
          cardDetails.contact,
          cardDetails.cardHolderName
        );
      }

      // Prepare payment method data with real card details and token
      const paymentMethodData = {
        paymentType: 'card' as const,
        razorpayCustomerId: customerId || '',
        razorpayPaymentId: razorpayPaymentId,
        cardToken: cardDetails.cardToken, // Token for future charges
        cardBrand: cardDetails.cardBrand,
        lastFourDigits: cardDetails.lastFourDigits,
        cardHolderName: cardDetails.cardHolderName,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        verificationAmount: 1,
        isDefault: false
      };

      // Save payment method after successful verification
      const result = await BillingService.savePaymentMethod(userId.toString(), paymentMethodData);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error verifying and saving payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to verify and save payment method");
    }
  }

  // Get user's payment methods
  static async getPaymentMethods(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getPaymentMethods(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching payment methods:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch payment methods");
    }
  }

  // Set payment method as default
  static async setDefaultPaymentMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const paymentMethodId = getStringParam(req.params.paymentMethodId);

      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.setDefaultPaymentMethod(userId.toString(), paymentMethodId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.message);
      }

      return ApiResponse.success(res, null, result.message);
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to set default payment method");
    }
  }

  // Delete payment method
  static async deletePaymentMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const paymentMethodId = getStringParam(req.params.paymentMethodId);

      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.deletePaymentMethod(userId.toString(), paymentMethodId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.message, (result as any).requiresDefaultReassignment ? 400 : 404);
      }

      return ApiResponse.success(res, null, result.message);
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to delete payment method");
    }
  }

  // Save tax information
  static async saveTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.saveTaxInformation(userId.toString(), req.body);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error saving tax information:", error);
      return ApiResponse.error(res, error.message || "Failed to save tax information");
    }
  }

  // Get user's tax information
  static async getTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getTaxInformation(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching tax information:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch tax information");
    }
  }

  // Get billing history/transactions
  static async getBillingHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await BillingService.getBillingHistory(
        userId.toString(), 
        page, 
        limit,
        fromDate,
        toDate,
        search
      );
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching billing history:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch billing history");
    }
  }

  // Get user's balance
  static async getUserBalance(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getUserBalance(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching user balance:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch user balance");
    }
  }

  // Download invoice PDF
  static async downloadInvoice(req: Request, res: Response) {
    try {
      const { uniqueId } = req.params;

      if (!uniqueId || Array.isArray(uniqueId)) {
        return ApiResponse.error(res, "Transaction ID is required", 400);
      }

      const result = await BillingService.getInvoicePath(uniqueId as string);

      if (!result.success) {
        return ApiResponse.error(res, result.message, 404);
      }

      // Send PDF file
      res.download(result.path!, `invoice-${uniqueId}.pdf`, (err) => {
        if (err) {
          console.error("Error downloading invoice:", err);
          return ApiResponse.error(res, "Failed to download invoice");
        }
      });
    } catch (error: any) {
      console.error("Error downloading invoice:", error);
      return ApiResponse.error(res, error.message || "Failed to download invoice");
    }
  }
}
