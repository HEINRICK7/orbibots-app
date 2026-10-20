export interface TenantMembershipResponse { tenantId: string; tenantName: string; segment: string; role: string; email: string }
export interface AccountResponse { subject: string; platformAdmin: boolean; memberships: TenantMembershipResponse[] }
export interface CompanySummary { id: string; name: string; segment: string; status: string; ownerEmail: string | null; invitationStatus: string | null; createdAt: string }
export interface CompanyPage { items: CompanySummary[]; page: number; size: number; total: number }
export interface CompanyCreatedResponse { id: string; name: string; segment: string; status: string }
export interface OwnerInvitationResponse { tenantId: string; email: string; status: string; alreadySent: boolean }
export interface SpecialistResponse { id: string; tenantId: string; name: string; status: string }
export interface PersonalTechWorkspaceResponse {
  specialist: SpecialistResponse;
  version: number;
  revisionId: string;
  publishedAt: string;
  sectionCount: number;
  documentKey: string;
  conversation: StartConversationResponse | null;
}
export interface SourceConnectionResponse { sourceId: string; specialistId: string; kind: string; status: string }
export interface SyncRunResponse { sourceId: string; specialistId: string; revisionId: string; status: string; productCount: number }
export interface IngestDocumentResponse { sourceId: string; specialistId: string; revisionId: string; documentKey: string; status: string; sectionCount: number }
export interface PublishRevisionResponse { specialistId: string; revisionId: string; version: number; publishedAt: string }
export interface StartConversationResponse { conversationId: string; specialistId: string; knowledgeRevisionId: string; status: string; startedAt: string }
export interface EvidenceItemResponse { evidenceId: string; sourceId: string; sourceRecordId: string; observedAt: string }
export interface MessageAnswerResponse { messageId: string; conversationId: string; type: string; text: string; evidence: EvidenceItemResponse[]; actions: unknown[]; knowledgeRevisionId: string }
export interface ApiProblem { type?: string; title?: string; status?: number; detail?: string; code?: string; correlationId?: string }
