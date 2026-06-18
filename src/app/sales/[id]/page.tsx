import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SalesAccountPanel } from "@/components/modules/sales-account-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getSalesAccount, getSalesTeam } from "@/lib/queries/sales";

export default async function SalesAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [account, salesTeam] = await Promise.all([getSalesAccount(id), getSalesTeam()]);

  if (!account) notFound();

  return (
    <AppShell>
      <SalesAccountPanel account={account} salesTeam={salesTeam} />
    </AppShell>
  );
}
