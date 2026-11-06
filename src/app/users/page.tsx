import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserPage } from "@/lib/auth/server-action";

export default async function Page() {
  await requireUserPage(["admin"]);
  return <ModulePlaceholder title="Users and role administration" />;
}
