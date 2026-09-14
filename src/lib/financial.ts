export type EscrowStatus = "pending" | "funded" | "released" | "refunded" | "disputed" | "cancelled";
export type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";
export type RefundStatus = "requested" | "processing" | "succeeded" | "failed" | "cancelled";

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface EscrowHold extends Money {
  id: string;
  engagementId: string;
  payerId: string;
  payeeId: string;
  status: EscrowStatus;
  fundedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
}

export interface PayoutRequest extends Money {
  id: string;
  payeeId: string;
  destinationType: string;
  status: PayoutStatus;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PaymentRefund extends Money {
  id: string;
  paymentIntentId: string;
  reason: string;
  status: RefundStatus;
  provider: string | null;
  providerRefundId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatMoney(money: Money, locale = "en-ZW"): string {
  if (!Number.isSafeInteger(money.amountMinor) || money.amountMinor < 0) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}

export function isTerminalPaymentState(status: string): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled" || status === "refunded";
}
