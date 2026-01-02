import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";
import { savePaymentMethodSchema, saveTaxInformationSchema } from "./BillingValidation";

const router = Router();

// Razorpay Verification Routes
router.post(
  "/create-verification-order",
  authenticateToken,
  BillingController.createVerificationOrder
);

router.post(
  "/verify-payment",
  authenticateToken,
  BillingController.verifyAndSavePaymentMethod
);

// Payment Method Routes
router.get(
  "/payment-methods",
  authenticateToken,
  BillingController.getPaymentMethods
);

router.put(
  "/payment-method/:paymentMethodId/set-default",
  authenticateToken,
  BillingController.setDefaultPaymentMethod
);

router.delete(
  "/payment-method/:paymentMethodId",
  authenticateToken,
  BillingController.deletePaymentMethod
);

// Tax Information Routes
router.post(
  "/tax-information",
  authenticateToken,
  BillingController.saveTaxInformation
);

router.get(
  "/tax-information",
  authenticateToken,
  BillingController.getTaxInformation
);

// Billing History Routes
router.get(
  "/billing-history",
  authenticateToken,
  BillingController.getBillingHistory
);

// Balance Route
router.get(
  "/balance",
  authenticateToken,
  BillingController.getUserBalance
);

export default router;
