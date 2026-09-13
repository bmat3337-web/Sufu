import { BadgeCheck, Mail, Phone, ShieldCheck, type LucideIcon } from "lucide-react";
import type { VerificationId } from "../data";

const meta: Record<VerificationId, { icon: LucideIcon; label: string; chip: string }> = {
  phone: { icon: Phone, label: "Phone verified", chip: "bg-secondary-soft text-secondary" },
  email: { icon: Mail, label: "Email verified", chip: "bg-primary-soft text-primary" },
  identity: { icon: ShieldCheck, label: "Identity verified", chip: "bg-primary-soft text-primary" },
  business: { icon: BadgeCheck, label: "Business verified", chip: "bg-gold-soft text-gold-deep" },
};

/**
 * A single trust badge. Every badge maps to a real verification state —
 * these render live only once accounts/verification ship in the backend.
 */
export function TrustBadge({ id, compact = false }: { id: VerificationId; compact?: boolean }) {
  const { icon: Icon, label, chip } = meta[id];
  return (
    <span
      title={label}
      className={`inline-flex cursor-default items-center gap-1.5 rounded-full font-semibold ${chip} ${
        compact ? "px-1.5 py-1" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </span>
  );
}

export function TrustBadges({ ids, compact = false }: { ids: VerificationId[]; compact?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <TrustBadge key={id} id={id} compact={compact} />
      ))}
    </span>
  );
}
