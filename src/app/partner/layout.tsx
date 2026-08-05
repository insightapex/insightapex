import { requirePartner } from "@/lib/guards";
import { PartnerShell } from "@/components/partner/PartnerShell";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, partner } = await requirePartner();
  const userName = user.name ?? user.email ?? "Partner Admin";

  return (
    <PartnerShell partnerName={partner.name} userName={userName}>
      {children}
    </PartnerShell>
  );
}
