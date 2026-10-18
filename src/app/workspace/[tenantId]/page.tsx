import WorkspaceEntry from "./WorkspaceEntry";
type Props = { params: Promise<{ tenantId: string }> };
export default async function WorkspacePage({ params }: Props) {
  const { tenantId } = await params;
  return <WorkspaceEntry tenantId={tenantId} />;
}
