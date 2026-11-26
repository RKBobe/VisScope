/**
 * Provider-Agnostic, Exploded-Object Bidirectional Bucket Sync Client for MeshEngine.
 *
 * Uses zero external dependencies: native `fetch` + Web Crypto `crypto.subtle.digest('SHA-256', ...)`.
 * Implements the Claim-Check upload flow:
 *   1. Sanitize project & generate exploded artifacts (SVG, UAD XML, Lowe's CSV, decoded photos)
 *   2. Compute SHA-256 hex digest for every artifact + manifest.json
 *   3. POST /api/v1/vis-scope/uploads/presign
 *   4. Parallel PUT of all exploded objects directly to their presigned bucket URLs
 *   5. POST /api/v1/vis-scope/submissions/commit
 */

import { SprocketProject } from '../../types/sprocket';
import {
  ArtifactDescriptor,
  OutboundOrderContractV1,
  PresignBatchRequest,
  PresignBatchResponse,
  SubmissionCommitRequest,
  SubmissionCommitResponse,
  VisScopeManifestV1,
} from '../../types/meshEngineContract';
import { generateFloorplanSVG, generateUadXmlPayload } from '../exporters/bundleSerializer';
import { lowesClient } from '../lowes/lowesClient';
import { exportLowesPickSheetCSV } from '../lowes/pickSheetExporter';
import { createProjectFromTemplate } from '../storage/projectStore';
import { resolveRegionalCostIndex } from '../math/valuation';

export interface MeshEngineClientConfig {
  baseUrl: string;
  authToken?: string;
}

interface PreparedArtifact {
  path: string;
  contentType: string;
  bytes: Uint8Array;
  sha256: string;
}

const textEncoder = new TextEncoder();

/**
 * Computes lowercase hex SHA-256 digest using Web Crypto API.
 */
export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', copy.buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

function sanitizeProjectForSync(project: SprocketProject): SprocketProject {
  if (!project.supply_retailer) return project;
  return {
    ...project,
    supply_retailer: {
      ...project.supply_retailer,
      api_key: undefined,
    },
  };
}

function buildAuthHeaders(authToken?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (authToken?.trim()) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }
  return headers;
}

/**
 * Generates exploded binary/text artifacts for a project (excluding manifest.json).
 */
async function buildExplodedArtifacts(project: SprocketProject): Promise<PreparedArtifact[]> {
  const prepared: PreparedArtifact[] = [];

  // 1. floorplan.svg
  const svgBytes = textEncoder.encode(generateFloorplanSVG(project));
  prepared.push({
    path: 'floorplan.svg',
    contentType: 'image/svg+xml',
    bytes: svgBytes,
    sha256: await computeSha256Hex(svgBytes),
  });

  // 2. uad_inspection_payload.xml
  const xmlBytes = textEncoder.encode(generateUadXmlPayload(project));
  prepared.push({
    path: 'uad_inspection_payload.xml',
    contentType: 'application/xml',
    bytes: xmlBytes,
    sha256: await computeSha256Hex(xmlBytes),
  });

  // 3. lowes_materials_buy_sheet.csv
  const procurementOrder = lowesClient.generateProcurementOrder(
    project.rooms,
    project.cost_index?.zip_code || project.address.zip,
    project.supply_retailer
  );
  const csvBytes = textEncoder.encode(exportLowesPickSheetCSV(procurementOrder));
  prepared.push({
    path: 'lowes_materials_buy_sheet.csv',
    contentType: 'text/csv',
    bytes: csvBytes,
    sha256: await computeSha256Hex(csvBytes),
  });

  // 4. photos/{room_id}_{direction}.{ext}
  for (const room of project.rooms) {
    if (!room.photos || room.photos.length === 0) continue;
    const safeRoomId = room.id.replace(/[^a-zA-Z0-9_-]/g, '_');

    for (const photo of room.photos) {
      if (!photo.file_uri) continue;

      if (photo.file_uri.startsWith('data:image/svg+xml')) {
        const commaIdx = photo.file_uri.indexOf(',');
        if (commaIdx === -1) continue;
        const header = photo.file_uri.slice(0, commaIdx);
        const body = photo.file_uri.slice(commaIdx + 1);
        let photoBytes: Uint8Array;
        if (header.includes(';base64')) {
          photoBytes = decodeBase64ToBytes(body);
        } else {
          let decoded = body;
          try {
            decoded = decodeURIComponent(body);
          } catch {
            // keep raw
          }
          photoBytes = textEncoder.encode(decoded);
        }
        prepared.push({
          path: `photos/${safeRoomId}_${photo.direction}.svg`,
          contentType: 'image/svg+xml',
          bytes: photoBytes,
          sha256: await computeSha256Hex(photoBytes),
        });
      } else {
        const match = photo.file_uri.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          const rawSubtype = match[1].toLowerCase();
          const ext = rawSubtype === 'jpeg' ? 'jpg' : rawSubtype;
          const photoBytes = decodeBase64ToBytes(match[2]);
          prepared.push({
            path: `photos/${safeRoomId}_${photo.direction}.${ext}`,
            contentType: `image/${rawSubtype}`,
            bytes: photoBytes,
            sha256: await computeSha256Hex(photoBytes),
          });
        }
      }
    }
  }

  return prepared;
}

/**
 * Pushes an exploded Vis-Scope project to MeshEngine via presigned bucket URLs and commits it.
 */
export async function pushProjectToMeshEngine(
  project: SprocketProject,
  loanId: string,
  config: MeshEngineClientConfig
): Promise<SubmissionCommitResponse> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const sanitizedProject = sanitizeProjectForSync(project);

  // 1. Build exploded artifacts & compute SHA-256 digests
  const explodedArtifacts = await buildExplodedArtifacts(sanitizedProject);

  // 2. Request presigned PUT URLs (including manifest.json)
  const presignReq: PresignBatchRequest = {
    loan_id: loanId,
    files: [
      { path: 'manifest.json', content_type: 'application/json' },
      ...explodedArtifacts.map((a) => ({
        path: a.path,
        content_type: a.contentType,
        size_bytes: a.bytes.byteLength,
      })),
    ],
  };

  const presignResp = await fetch(`${baseUrl}/api/v1/vis-scope/uploads/presign`, {
    method: 'POST',
    headers: buildAuthHeaders(config.authToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(presignReq),
  });

  if (!presignResp.ok) {
    const errText = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`MeshEngine presign failed (${presignResp.status}): ${errText}`);
  }

  const presignData = (await presignResp.json()) as PresignBatchResponse;
  const slotByPath = new Map(presignData.files.map((slot) => [slot.path, slot]));

  const manifestSlot = slotByPath.get('manifest.json');
  if (!manifestSlot) {
    throw new Error('MeshEngine presign response missing manifest.json upload slot.');
  }

  // 3. Assemble VisScopeManifestV1 & compute manifest SHA-256
  const artifactDescriptors: ArtifactDescriptor[] = explodedArtifacts.map((art) => {
    const slot = slotByPath.get(art.path);
    return {
      path: art.path,
      bucket_key: slot?.bucket_key,
      sha256: art.sha256,
      content_type: art.contentType,
      size_bytes: art.bytes.byteLength,
    };
  });

  const manifest: VisScopeManifestV1 = {
    schema_version: '1.0',
    loan_id: loanId,
    submission_id: presignData.submission_id,
    project_id: sanitizedProject.project_id,
    exported_at: new Date().toISOString(),
    generator: 'Vis-Scope Core v1.0',
    project: sanitizedProject,
    artifacts: artifactDescriptors,
  };

  const manifestBytes = textEncoder.encode(JSON.stringify(manifest, null, 2));
  const manifestSha256 = await computeSha256Hex(manifestBytes);

  // 4. Upload manifest.json + all exploded artifacts in parallel via PUT
  const uploadTasks: Array<{ path: string; bytes: Uint8Array; contentType: string }> = [
    { path: 'manifest.json', bytes: manifestBytes, contentType: 'application/json' },
    ...explodedArtifacts.map((a) => ({
      path: a.path,
      bytes: a.bytes,
      contentType: a.contentType,
    })),
  ];

  await Promise.all(
    uploadTasks.map(async (task) => {
      const slot = slotByPath.get(task.path);
      if (!slot) {
        throw new Error(`Missing presigned upload slot for '${task.path}'.`);
      }
      const uploadUrl = slot.upload_url.startsWith('http')
        ? slot.upload_url
        : `${baseUrl}${slot.upload_url.startsWith('/') ? '' : '/'}${slot.upload_url}`;

      const bodyCopy = new Uint8Array(task.bytes.byteLength);
      bodyCopy.set(task.bytes);

      const putResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': task.contentType,
          ...(slot.headers || {}),
        },
        body: bodyCopy,
      });

      if (!putResp.ok) {
        const errText = await putResp.text().catch(() => putResp.statusText);
        throw new Error(`Bucket PUT failed for '${task.path}' (${putResp.status}): ${errText}`);
      }
    })
  );

  // 5. Commit submission on MeshEngine control plane
  const commitReq: SubmissionCommitRequest = {
    loan_id: loanId,
    submission_id: presignData.submission_id,
    manifest_key: manifestSlot.bucket_key,
    manifest_sha256: manifestSha256,
  };

  const commitResp = await fetch(`${baseUrl}/api/v1/vis-scope/submissions/commit`, {
    method: 'POST',
    headers: buildAuthHeaders(config.authToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(commitReq),
  });

  if (!commitResp.ok) {
    const errText = await commitResp.text().catch(() => commitResp.statusText);
    throw new Error(`MeshEngine commit failed (${commitResp.status}): ${errText}`);
  }

  return (await commitResp.json()) as SubmissionCommitResponse;
}

/**
 * Fetches the latest outbound order (initial_prefill or reinspection_dispatch) from MeshEngine.
 */
export async function pullOrderFromMeshEngine(
  loanId: string,
  config: MeshEngineClientConfig
): Promise<OutboundOrderContractV1> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const resp = await fetch(
    `${baseUrl}/api/v1/vis-scope/orders/${encodeURIComponent(loanId)}`,
    {
      method: 'GET',
      headers: buildAuthHeaders(config.authToken),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`MeshEngine order pull failed (${resp.status}): ${errText}`);
  }

  return (await resp.json()) as OutboundOrderContractV1;
}

/**
 * Hydrates a Vis-Scope project from a MeshEngine outbound order.
 * - Maps `property_prefill` into `address`, regional `cost_index`, and `property_metadata`.
 * - Attaches `meshengine_sync` discrepancy & attachment metadata for re-inspection workflows.
 * - Preserves existing field rooms if `existingProject` is provided.
 */
export function hydrateProjectFromOutboundOrder(
  order: OutboundOrderContractV1,
  existingProject?: SprocketProject
): SprocketProject {
  const prefill = order.property_prefill;
  const street = prefill?.street || prefill?.address || existingProject?.address.street || '100 Main St';
  const city = prefill?.city || existingProject?.address.city || 'Prairie Village';
  const state = prefill?.state || existingProject?.address.state || 'KS';
  const zip = prefill?.zip || existingProject?.address.zip || '66208';

  const baseProject: SprocketProject = existingProject
    ? { ...existingProject }
    : createProjectFromTemplate({
        templateId: 'clean_appraisal',
        name: `${street} (${order.loan_id})`,
        street,
        city,
        state,
        zip,
      });

  const updatedCostIndex = resolveRegionalCostIndex(zip, city, state);

  return {
    ...baseProject,
    address: {
      street,
      city,
      state,
      zip,
    },
    cost_index: updatedCostIndex,
    property_metadata: {
      ...(baseProject.property_metadata || {}),
      source_document_type: 'meshengine_bundle',
      parcel_id: prefill?.apn ?? baseProject.property_metadata?.parcel_id,
      owner_name: prefill?.owner_name ?? baseProject.property_metadata?.owner_name,
      year_built: prefill?.year_built ?? baseProject.property_metadata?.year_built,
      total_living_area_reported_sqft:
        prefill?.tax_gla_sqft ?? baseProject.property_metadata?.total_living_area_reported_sqft,
    },
    meshengine_sync: {
      loan_id: order.loan_id,
      revision_id: order.revision_id,
      order_type: order.order_type,
      discrepancies: order.discrepancies || [],
      attachments: order.attachments || [],
      last_synced_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}
