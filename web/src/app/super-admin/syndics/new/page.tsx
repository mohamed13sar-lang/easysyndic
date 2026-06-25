import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { SyndicForm } from "@/components/forms";

export default function NewSyndicPage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Créer un syndic" subtitle="Formulaire branché sur POST /users." />
      <SyndicForm />
    </DashboardLayout>
  );
}
