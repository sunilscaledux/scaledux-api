import { Router } from "express";
import { BillingController } from "./BillingController";
import { authenticateToken } from "@middleware/auth";
import { savePaymentMethodSchema, saveTaxInformationSchema } from "./BillingValidation";

const router = Router();

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

router.post(
  "/tax-information",
  BillingController.saveTaxInformation
);

router.get(
  "/tax-information",
  BillingController.getTaxInformation
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
  "/transaction/:uniqueId/request-withdraw",
  BillingController.requestWithdrawForPayment
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
router.post(
  "/withdrawal-methods/resubmit-verification",
  BillingController.resubmitForVerification
);
router.patch(
  "/withdrawal-method/:withdrawalMethodId",
  BillingController.updateWithdrawalMethod
);

router.get(
  "/invoice/:uniqueId",
  BillingController.getInvoiceData
);

export default router;
