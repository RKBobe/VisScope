// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeSha256Hex,
  hydrateProjectFromOutboundOrder,
  pullOrderFromMeshEngine,
  pushProjectToMeshEngine,
} from '../meshEngineClient';
import { createInitialProject } from '../../storage/projectStore';
import {
  OutboundOrderContractV1,
  PresignBatchRequest,
  SubmissionCommitRequest,
  VisScopeManifestV1,
} from '../../../types/meshEngineContract';

describe('MeshEngine Exploded-Object Bucket Sync Client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes exploded artifacts with SHA-256 verification, strips supplier api_key, and commits', async () => {
    const project = createInitialProject();
    project.supply_retailer = {
      retailer_id: 'lowes',
      retailer_name: "Lowe's Pro Supply",
      price_tier: 'contractor_pro',
      store_search_url_template: 'https://www.lowes.com/search?searchTerm={query}',
      api_key: 'SUPER_SECRET_LOWES_KEY',
    };

    const uploadedObjects = new Map<string, Uint8Array>();
    let capturedPresignReq: PresignBatchRequest | null = null;
    let capturedCommitReq: SubmissionCommitRequest | null = null;
    let capturedAuthHeader: string | null = null;

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method || 'GET').toUpperCase();
      const headers = (init?.headers || {}) as Record<string, string>;

      if (url.endsWith('/api/v1/vis-scope/uploads/presign') && method === 'POST') {
        capturedAuthHeader = headers['Authorization'] || null;
        capturedPresignReq = JSON.parse(String(init?.body)) as PresignBatchRequest;
        const submissionId = 'sub-test-001';
        const prefix = `inbound/vis-scope/${capturedPresignReq.loan_id}/${submissionId}`;

        return new Response(
          JSON.stringify({
            loan_id: capturedPresignReq.loan_id,
            submission_id: submissionId,
            prefix,
            expires_in_seconds: 900,
            files: capturedPresignReq.files.map((f) => ({
              path: f.path,
              bucket_key: `${prefix}/${f.path}`,
              upload_url: `https://bucket.example.com/put/${prefix}/${f.path}?sig=ok`,
              headers: { 'Content-Type': f.content_type || 'application/octet-stream' },
            })),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.startsWith('https://bucket.example.com/put/') && method === 'PUT') {
        const key = url.replace('https://bucket.example.com/put/', '').split('?')[0];
        const body = init?.body as Uint8Array;
        uploadedObjects.set(key, body);
        return new Response(JSON.stringify({ status: 'uploaded' }), { status: 200 });
      }

      if (url.endsWith('/api/v1/vis-scope/submissions/commit') && method === 'POST') {
        capturedCommitReq = JSON.parse(String(init?.body)) as SubmissionCommitRequest;
        return new Response(
          JSON.stringify({
            status: 'COMMITTED',
            loan_id: capturedCommitReq.loan_id,
            submission_id: capturedCommitReq.submission_id,
            verified_artifacts: [
              'manifest.json',
              'floorplan.svg',
              'uad_inspection_payload.xml',
              'lowes_materials_buy_sheet.csv',
              'photos/room-1_North.svg',
            ],
            tamper_detected: false,
            air_fields_scrubbed: [],
            gla_variance_pct: 1.5,
            warnings: [],
            errors: [],
            audit_event_id: 'DM-EVT-000001',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    const commitResult = await pushProjectToMeshEngine(project, 'LN-9988', {
      baseUrl: 'http://localhost:8000',
      authToken: 'pilot-token-xyz',
    });

    expect(commitResult.status).toBe('COMMITTED');
    expect(commitResult.tamper_detected).toBe(false);
    expect(commitResult.audit_event_id).toBe('DM-EVT-000001');
    expect(capturedAuthHeader).toBe('Bearer pilot-token-xyz');

    // Verify presign requested all exploded artifacts including photo
    expect(capturedPresignReq).not.toBeNull();
    const requestedPaths = capturedPresignReq!.files.map((f) => f.path);
    expect(requestedPaths).toContain('manifest.json');
    expect(requestedPaths).toContain('floorplan.svg');
    expect(requestedPaths).toContain('uad_inspection_payload.xml');
    expect(requestedPaths).toContain('lowes_materials_buy_sheet.csv');
    expect(requestedPaths).toContain('photos/room-1_North.svg');

    // Verify manifest uploaded matches commit SHA-256 and stripped api_key
    expect(capturedCommitReq).not.toBeNull();
    const manifestBytes = uploadedObjects.get(capturedCommitReq!.manifest_key);
    expect(manifestBytes).toBeDefined();
    expect(await computeSha256Hex(manifestBytes!)).toBe(capturedCommitReq!.manifest_sha256);

    const manifestText = new TextDecoder().decode(manifestBytes!);
    expect(manifestText).not.toContain('SUPER_SECRET_LOWES_KEY');

    const manifestJson = JSON.parse(manifestText) as VisScopeManifestV1;
    expect(manifestJson.loan_id).toBe('LN-9988');
    expect(manifestJson.submission_id).toBe('sub-test-001');

    // Verify every artifact SHA-256 in manifest matches the exact PUT bytes
    for (const art of manifestJson.artifacts) {
      const artBytes = uploadedObjects.get(art.bucket_key!);
      expect(artBytes).toBeDefined();
      expect(await computeSha256Hex(artBytes!)).toBe(art.sha256);
    }

    expect(fetchMock).toHaveBeenCalled();
  });

  it('pulls outbound order and hydrates initial_prefill and reinspection_dispatch projects', async () => {
    const initialOrder: OutboundOrderContractV1 = {
      schema_version: '1.0',
      loan_id: 'LN-PREFILL-101',
      revision_id: 'rev-001',
      order_type: 'initial_prefill',
      created_at: '2026-11-25T15:10:00Z',
      property_prefill: {
        address: '5509 MAPLE STREET',
        city: 'Prairie Village',
        state: 'KS',
        zip: '66208',
        county: 'Johnson County',
        apn: '239200',
        owner_name: 'Stephen M Foster',
        year_built: 1958,
        tax_gla_sqft: 1620,
      },
      discrepancies: [],
      attachments: [
        {
          name: 'prc_card.pdf',
          bucket_key: 'outbound/meshengine/LN-PREFILL-101/rev-001/attachments/prc_card.pdf',
          content_type: 'application/pdf',
          sha256: 'abc123',
          download_url: 'http://localhost:8000/api/v1/storage/local/prc_card.pdf?sig=ok',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(initialOrder), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const pulled = await pullOrderFromMeshEngine('LN-PREFILL-101', {
      baseUrl: 'http://localhost:8000',
    });
    expect(pulled.order_type).toBe('initial_prefill');
    expect(pulled.property_prefill?.apn).toBe('239200');

    // Hydrate brand new project from initial_prefill
    const hydratedNew = hydrateProjectFromOutboundOrder(pulled);
    expect(hydratedNew.address.street).toBe('5509 MAPLE STREET');
    expect(hydratedNew.address.city).toBe('Prairie Village');
    expect(hydratedNew.address.zip).toBe('66208');
    expect(hydratedNew.property_metadata?.parcel_id).toBe('239200');
    expect(hydratedNew.property_metadata?.owner_name).toBe('Stephen M Foster');
    expect(hydratedNew.property_metadata?.year_built).toBe(1958);
    expect(hydratedNew.property_metadata?.total_living_area_reported_sqft).toBe(1620);
    expect(hydratedNew.meshengine_sync?.loan_id).toBe('LN-PREFILL-101');
    expect(hydratedNew.meshengine_sync?.order_type).toBe('initial_prefill');

    // Hydrate existing project from reinspection_dispatch — must preserve existing field rooms!
    const existingFieldProject = createInitialProject();
    const originalRoomCount = existingFieldProject.rooms.length;
    const originalRoomIds = existingFieldProject.rooms.map((r) => r.id);

    const reinspectionOrder: OutboundOrderContractV1 = {
      ...initialOrder,
      revision_id: 'rev-002',
      order_type: 'reinspection_dispatch',
      discrepancies: [
        {
          code: 'GLA_VARIANCE',
          severity: 'HIGH',
          message: 'Field GLA exceeds tax record by 18%',
          field: 'gla_sqft',
          expected_value: 1620,
          reported_value: 1912,
          room_id: 'room-1',
          underwriter_note: 'Re-measure Living Room north wall.',
          allowed_cost: 2500,
        },
      ],
    };

    const hydratedReinspection = hydrateProjectFromOutboundOrder(
      reinspectionOrder,
      existingFieldProject
    );
    expect(hydratedReinspection.rooms.length).toBe(originalRoomCount);
    expect(hydratedReinspection.rooms.map((r) => r.id)).toEqual(originalRoomIds);
    expect(hydratedReinspection.meshengine_sync?.order_type).toBe('reinspection_dispatch');
    expect(hydratedReinspection.meshengine_sync?.revision_id).toBe('rev-002');
    expect(hydratedReinspection.meshengine_sync?.discrepancies?.length).toBe(1);
    expect(hydratedReinspection.meshengine_sync?.discrepancies?.[0].code).toBe('GLA_VARIANCE');
  });
});
