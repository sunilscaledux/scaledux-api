import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";
import { savePaymentMethodSchema, saveTaxInformationSchema } from "./BillingValidation";

const router = Router();

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
router.delete(
  "/withdrawal-method/:withdrawalMethodId",
  BillingController.deleteWithdrawalMethod
);
/** Retry verification without editing: sets status to pending and clears failure reason (e.g. after temporary Razorpay failure). */
router.post(
  "/withdrawal-methods/resubmit-verification",
  BillingController.resubmitForVerification
);
router.patch(
  "/withdrawal-method/:withdrawalMethodId",
  BillingController.updateWithdrawalMethod
);

// Invoice data for client-side PDF (JSON)
router.get(
  "/invoice/:uniqueId",
  BillingController.getInvoiceData
);

export default router;
