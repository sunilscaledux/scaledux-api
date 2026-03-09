import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";
import { savePaymentMethodSchema, saveTaxInformationSchema } from "./BillingValidation";

const router = Router();

// Cron job: process payment withdrawals (no auth; use x-cron-secret header). Call from cron e.g. every hour.
router.get(
  "/cron/process-payment-withdrawals",
  BillingController.processPaymentWithdrawalsCron
);
router.post(
  "/cron/process-payment-withdrawals",
  BillingController.processPaymentWithdrawalsCron
);

router.use(authenticateToken)

// Payment breakdown (fee, gst, total) – optional query ?amount=<milestoneAmount>
router.get(
  "/payment-breakdown",
  BillingController.getPaymentBreakdown
);

// Razorpay Order Creation (for testing)
router.post(
  "/initiate-verification-order",
  BillingController.createVerificationOrder
);


router.post(
  "/verify-payment",
  BillingController.verifyPaymentSignature
);

// Payment Method Routes
router.get(
  "/payment-methods",
  BillingController.getPaymentMethods
);

router.put(
  "/payment-method/:paymentMethodId/set-default",
  BillingController.setDefaultPaymentMethod
);

router.delete(
  "/payment-method/:paymentMethodId",
  BillingController.deletePaymentMethod
);

// Tax Information Routes
router.post(
  "/tax-information",
  BillingController.saveTaxInformation
);

router.get(
  "/tax-information",
  BillingController.getTaxInformation
);

// Billing History Routes
router.get(
  "/billing-history",
  BillingController.getBillingHistory
);

router.get(
  "/transaction/:uniqueId",
  BillingController.getTransactionDetail
);

router.post(
  "/transaction/:uniqueId/release",
  BillingController.releasePayment
);
router.post(
  "/transaction/:uniqueId/request-withdraw",
  BillingController.requestWithdrawForPayment
);
router.post(
  "/transaction/:uniqueId/receiver-released",
  BillingController.webhookReceiverReleased
);

// Balance Route
router.get(
  "/balance",
  BillingController.getUserBalance
);

// Withdrawal methods and withdraw (freelancer only)
router.get(
  "/withdrawal-methods",
  BillingController.getWithdrawalMethods
);
router.post(
  "/withdrawal-methods",
  BillingController.createWithdrawalMethod
);
router.put(
  "/withdrawal-method/:withdrawalMethodId/set-default",
  BillingController.setDefaultWithdrawalMethod
);
router.delete(
  "/withdrawal-method/:withdrawalMethodId",
  BillingController.deleteWithdrawalMethod
);
router.post(
  "/withdraw",
  BillingController.requestWithdrawal
);

// Invoice data for client-side PDF (JSON)
router.get(
  "/invoice/:uniqueId",
  BillingController.getInvoiceData
);

export default router;
