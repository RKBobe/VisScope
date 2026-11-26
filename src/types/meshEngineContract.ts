/**
 * TypeScript Contracts mirroring MeshEngine's Pydantic v2 Exploded-Object Bucket Sync Layer.
 * (inbound/vis-scope/{loan_id}/{submission_id}/ & outbound/meshengine/{loan_id}/{revision_id}/)
 */

import { SprocketProject } from './sprocket';

export interface ArtifactDescriptor {
  path: string;
  bucket_key?: string;
  sha256: string;
  content_type?: string;
  size_bytes?: number;
}

export interface VisScopeManifestV1 {
  schema_version: '1.0';
  loan_id: string;
  submission_id: string;
  project_id?: string;
  exported_at?: string;
  generator?: string;
  project: SprocketProject;
  artifacts: ArtifactDescriptor[];
}

export interface PresignFileItem {
  path: string;
  content_type?: string;
  size_bytes?: number;
}

export interface PresignBatchRequest {
  loan_id: string;
  submission_id?: string;
  files: PresignFileItem[];
}

export interface PresignedFileSlot {
  path: string;
  bucket_key: string;
  upload_url: string;
  headers: Record<string, string>;
}

export interface PresignBatchResponse {
  loan_id: string;
  submission_id: string;
  prefix: string;
  expires_in_seconds: number;
  files: PresignedFileSlot[];
}

export interface SubmissionCommitRequest {
  loan_id: string;
  submission_id: string;
  manifest_key: string;
  manifest_sha256: string;
}

export interface SubmissionCommitResponse {
  status: string;
  loan_id: string;
  submission_id: string;
  verified_artifacts: string[];
  tamper_detected: boolean;
  air_fields_scrubbed: string[];
  gla_variance_pct?: number | null;
  warnings: string[];
  errors: string[];
  audit_event_id?: string | null;
}

export interface PropertyPrefillData {
  address?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  county?: string | null;
  apn?: string | null;
  owner_name?: string | null;
  year_built?: number | null;
  tax_gla_sqft?: number | null;
  parcel_gis?: Record<string, unknown> | null;
}

export interface DiscrepancyAlert {
  code: string;
  severity: string;
  message: string;
  field?: string | null;
  expected_value?: unknown;
  reported_value?: unknown;
  room_id?: string | null;
  underwriter_note?: string | null;
  allowed_cost?: number | null;
}

export interface OutboundAttachment {
  name: string;
  bucket_key: string;
  content_type?: string;
  sha256?: string | null;
  download_url?: string | null;
}

export interface OutboundOrderContractV1 {
  schema_version: '1.0';
  loan_id: string;
  revision_id: string;
  order_type: 'initial_prefill' | 'reinspection_dispatch';
  created_at?: string | null;
  property_prefill?: PropertyPrefillData | null;
  discrepancies: DiscrepancyAlert[];
  attachments: OutboundAttachment[];
}

export interface MeshEngineSyncMetadata {
  loan_id: string;
  revision_id?: string;
  order_type?: 'initial_prefill' | 'reinspection_dispatch';
  discrepancies?: DiscrepancyAlert[];
  attachments?: OutboundAttachment[];
  last_synced_at?: string;
}
