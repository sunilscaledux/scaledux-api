import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

// Razorpay webhook: no auth, signature verified in handler
router.post("/webhook/razorpay", BillingController.razorpayWebhook);

router.use(authenticateToken)

router.get(
  "/payment-breakdown",
  BillingController.getPaymentBreakdown
);

router.post(
  "/initiate-verification-order",
  BillingController.createVerificationOrder
);

router.post(
  "/verify-payment",
  BillingController.verifyPaymentSignature
);

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
  "/transaction/:uniqueId/request-payout",
  BillingController.requestPayout
);
// Backward compat
router.post(
  "/transaction/:uniqueId/request-withdraw",
  BillingController.requestPayout
);
router.post(
  "/transaction/:uniqueId/receiver-released",
  BillingController.webhookReceiverReleased
);

router.get(
  "/balance",
  BillingController.getUserBalance
);

router.get(
  "/invoice/:uniqueId",
  BillingController.getInvoiceData
);

// New billing flow endpoints
router.post(
  "/milestone/:milestoneId/send-invoice",
  BillingController.sendFreelancerInvoice
);
router.post(
  "/milestone/acknowledge",
  BillingController.acknowledgeMilestone
);

export default router;
