import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractDocumentWithGeminiVision,
  fetchAvailableGeminiModels,
  GeminiConnectionConfig,
  parseVoiceScopeWithGemini,
  redactSecrets,
  transcribeAndParseAudioWithGemini,
} from '../geminiClient';

describe('Gemini Multimodal AI Client (Option C Hybrid)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and filters live generateContent models from Google v1beta/models', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'models/embedding-001',
            supportedGenerationMethods: ['embedContent'],
          },
          {
            name: 'models/gemini-2.5-flash-preview-tts',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-2.5-flash-image',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-2.5-flash',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-3-flash-preview',
            supportedGenerationMethods: ['generateContent', 'countTokens'],
          },
          {
            name: 'models/gemini-3.1-pro-preview',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
    } as Response);

    const config: GeminiConnectionConfig = {
      apiKey: 'test-key-123',
      model: 'gemini-3-flash-preview',
      enabled: true,
    };

    const res = await fetchAvailableGeminiModels(config);
    expect(res.ok).toBe(true);
    expect(res.models).toEqual([
      'gemini-3-flash-preview',
      'gemini-3.1-pro-preview',
      'gemini-2.5-flash',
    ]);
    expect(res.models).not.toContain('embedding-001');
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models'
    );
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('key=');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'x-goog-api-key': 'test-key-123',
    });
  });

  it('parses natural-language voice notes with room context via direct Gemini REST API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    action: 'Replace',
                    trade_category: 'Painting',
                    quantity: 540,
                    unit: 'SF',
                    description: 'Repaint water stained living room walls',
                    confidence: 0.95,
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const parsed = await parseVoiceScopeWithGemini(
      'Walls have heavy scuffing, repaint the entire room',
      { name: 'Living Room', floor_area_sqft: 320, net_wall_area_sqft: 540 },
      { apiKey: 'test-key-123', model: 'gemini-3-flash-preview', enabled: true }
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe('Replace');
    expect(parsed?.trade_category).toBe('Painting');
    expect(parsed?.quantity).toBe(540);
    expect(parsed?.unit).toBe('SF');
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'
    );
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('key=');
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'x-goog-api-key': 'test-key-123',
    });
  });

  it('extracts floorplan rooms and metadata via Gemini Vision multimodal prompt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    project_name: '7550 Windsor Sketch',
                    address: {
                      street: '7550 Windsor St',
                      city: 'Prairie Village',
                      state: 'KS',
                      zip: '66208',
                    },
                    baseline_quality: 'Class 4',
                    baseline_condition: 'Class 3',
                    metadata: {
                      parcel_id: '046-112-18-0-30-04-012.00-0',
                      year_built: 1958,
                      total_living_area_reported_sqft: 572,
                    },
                    rooms: [
                      {
                        name: 'Living Room',
                        level: 'First Floor',
                        length_ft: 20,
                        width_ft: 16,
                        height_ft: 9,
                        exclude_from_gla: false,
                      },
                      {
                        name: 'Kitchen',
                        level: 'First Floor',
                        length_ft: 18,
                        width_ft: 14,
                        height_ft: 9,
                        exclude_from_gla: false,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    const result = await extractDocumentWithGeminiVision(
      {
        fileName: 'sketch_scan.png',
        pageImages: [dataUri],
      },
      { apiKey: 'test-key-123', model: 'gemini-3-flash-preview', enabled: true }
    );

    expect(result.has_clear_interior_rooms).toBe(true);
    expect(result.recommended_mode).toBe('clear_interior_rooms');
    expect(result.interior_rooms.length).toBe(2);
    expect(result.interior_rooms[0].name).toBe('Living Room');
    expect(result.interior_rooms[1].floor_area_sqft).toBe(252);
    expect(result.metadata.blueprint_underlay_data_uri).toBe(dataUri);
  });

  it('routes requests through custom proxyUrl when configured instead of direct Google URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        text: JSON.stringify({
          action: 'Add',
          trade_category: 'Plumbing Fixtures',
          quantity: 1,
          unit: 'EA',
          description: 'Install garbage disposal',
          confidence: 0.91,
        }),
      }),
    } as Response);

    const parsed = await parseVoiceScopeWithGemini(
      'Need to hook up a new disposal under kitchen sink',
      undefined,
      {
        apiKey: 'client-session-token',
        model: 'gemini-3.1-pro-preview',
        proxyUrl: 'https://proxy.example.com/api/gemini',
        enabled: true,
      }
    );

    expect(parsed?.action).toBe('Add');
    expect(parsed?.trade_category).toBe('Plumbing Fixtures');
    expect(fetchSpy.mock.calls[0][0]).toBe('https://proxy.example.com/api/gemini');
    const reqInit = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((reqInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer client-session-token'
    );
  });

  it('ignores thinking parts and strips prose around JSON in candidate parts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  thought: true,
                  text: 'Thinking: use Net Wall Area 608 SF because the user said repaint all walls.',
                },
                {
                  text: '```json\n{"action":"Replace","trade_category":"Painting","quantity":608,"unit":"SF","description":"Repaint all room walls","confidence":0.94}\n```',
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const parsed = await parseVoiceScopeWithGemini(
      'Water damage near the window, repaint all the walls in this room',
      { name: 'Living Room', floor_area_sqft: 320, net_wall_area_sqft: 608 },
      { apiKey: 'test-key-123', model: 'gemini-2.5-flash', enabled: true },
      true
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.trade_category).toBe('Painting');
    expect(parsed?.quantity).toBe(608);
    expect(parsed?.unit).toBe('SF');
  });

  it('automatically resolves an available model and retries when generateContent returns HTTP 404', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Model not found',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-2.5-flash',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      action: 'Replace',
                      trade_category: 'Painting',
                      quantity: 608,
                      unit: 'SF',
                      description: 'Repaint all walls in Living Room',
                      confidence: 0.96,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

    const parsed = await parseVoiceScopeWithGemini(
      'Water damage near the window, repaint all the walls in this room',
      { name: 'Living Room', floor_area_sqft: 320, net_wall_area_sqft: 608 },
      { apiKey: 'test-key-123', model: 'nonexistent-preview-model', enabled: true },
      true
    );

    expect(parsed?.quantity).toBe(608);
    expect(parsed?.trade_category).toBe('Painting');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[2][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
    expect((fetchSpy.mock.calls[2][1] as RequestInit).headers).toMatchObject({
      'x-goog-api-key': 'test-key-123',
    });
  });

  it('normalizes codec-qualified MediaRecorder audio data URIs for Gemini audio transcription', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    transcript: 'Water damage near the window, repaint all the walls in this room',
                    action: 'Replace',
                    trade_category: 'Painting',
                    quantity: 608,
                    unit: 'SF',
                    description: 'Repaint all walls in Living Room',
                    confidence: 0.94,
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const res = await transcribeAndParseAudioWithGemini(
      'data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKIbWF0cm9za2FCh4EEQoWBAhhTgGc=',
      { name: 'Living Room', floor_area_sqft: 320, net_wall_area_sqft: 608 },
      { apiKey: 'test-key-123', model: 'gemini-2.5-flash', enabled: true }
    );

    expect(res.transcript).toContain('repaint all the walls');
    expect(res.defect?.trade_category).toBe('Painting');
    expect(res.defect?.quantity).toBe(608);

    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    const audioPart = sentBody.contents[0].parts.find((p: any) => p.inlineData);
    expect(audioPart.inlineData.mimeType).toBe('audio/webm');
  });

  it('retries with compatibility payload without responseMimeType or top-level systemInstruction on HTTP 400', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Request contains an invalid argument',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      action: 'Replace',
                      trade_category: 'Painting',
                      quantity: 608,
                      unit: 'SF',
                      description: 'Repaint walls in Living Room',
                      confidence: 0.93,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

    const parsed = await parseVoiceScopeWithGemini(
      'Repaint all walls in this room',
      { name: 'Living Room', floor_area_sqft: 320, net_wall_area_sqft: 608 },
      { apiKey: 'test-key-123', model: 'gemini-3-flash-preview', enabled: true },
      true
    );

    expect(parsed?.quantity).toBe(608);
    expect(parsed?.trade_category).toBe('Painting');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(retryBody.systemInstruction).toBeUndefined();
    expect(retryBody.generationConfig.responseMimeType).toBeUndefined();
    expect(fetchSpy.mock.calls[1][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
    expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toMatchObject({
      'x-goog-api-key': 'test-key-123',
    });
  });

  it('redacts API keys, query parameters, and Bearer tokens from error messages', () => {
    const sampleError =
      'Failed calling https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyTestSecretKey1234567890 with header Authorization: Bearer mySecretToken_99 and key AIzaSyAnotherFakeKeyValue12345';
    const clean = redactSecrets(sampleError);

    expect(clean).not.toContain('AIzaSyTestSecretKey1234567890');
    expect(clean).not.toContain('AIzaSyAnotherFakeKeyValue12345');
    expect(clean).not.toContain('mySecretToken_99');
    expect(clean).toContain('[REDACTED_KEY]');
    expect(clean).toContain('Bearer [REDACTED_TOKEN]');
  });
});
