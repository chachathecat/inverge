import { SetDetailAdmin } from "@/components/admin/set-detail-admin";

type PageProps = {
  params: Promise<{ setId: string }>;
};

export default async function AdminSetDetailPage({ params }: PageProps) {
  const { setId } = await params;
  return <SetDetailAdmin setId={setId} />;
}
