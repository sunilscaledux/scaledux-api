import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";
import { savePaymentMethodSchema, saveTaxInformationSchema } from "./BillingValidation";

const router = Router();

router.use(authenticateToken)

// Razorpay Order Creation (for testing)
router.post(
  "/initiate-verification-order",
  BillingController.createVerificationOrder
);


router.post(
  "/verify-payment",
  BillingController.verifyAndSavePaymentMethod
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

// Balance Route
router.get(
  "/balance",
  BillingController.getUserBalance
);

// Invoice Download Route
router.get(
  "/invoice/:uniqueId",
  BillingController.downloadInvoice
);

export default router;
