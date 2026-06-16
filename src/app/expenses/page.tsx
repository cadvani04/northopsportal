import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Card } from "@/components/ui";
import { ExpensesPanel } from "@/components/modules/expenses-panel";
import { requireAuth } from "@/lib/auth/session";
import { getExpenses, getProjects } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export default async function ExpensesPage() {
  const user = await requireAuth();
  const [expenses, projects] = await Promise.all([getExpenses(), getProjects()]);
  const pending = expenses.filter((e) => e.status === "PENDING");
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);
  const isAdmin = user.role === "ADMIN" || user.role === "TEAM";

  return (
    <AppShell>
      <PageHeader title="Expenses" description="Submit and approve team expenses." />
      {isAdmin && (
        <Card className="mb-8">
          <p className="text-sm text-slate-400">Pending approval</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{formatCurrency(pendingTotal)}</p>
        </Card>
      )}
      <ExpensesPanel expenses={expenses} projects={projects} isAdmin={user.role !== "CLIENT"} />
    </AppShell>
  );
}
