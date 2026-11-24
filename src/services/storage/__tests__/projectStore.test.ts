// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInitialProject,
  createProjectFromTemplate,
  createBlankProject,
  saveProject,
  loadSavedProject,
  listSavedProjects,
  deleteProjectFromStore,
  INITIAL_ROOMS,
} from '../projectStore';
import { SprocketProject } from '../../../types/sprocket';

// Mock idb-keyval in memory
const memoryStore: Record<string, any> = {};

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore[key])),
  set: vi.fn((key: string, val: any) => {
    memoryStore[key] = val;
    return Promise.resolve();
  }),
}));

describe('Project Store Service', () => {
  beforeEach(() => {
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('creates a deterministic initial project with Kansas City baseline', () => {
    const project = createInitialProject();
    expect(project.project_id).toBe('PRJ-66208-001');
    expect(project.address.city).toBe('Prairie Village');
    expect(project.address.zip).toBe('66208');
    expect(project.cost_index.zip_code).toBe('66208');
    expect(project.rooms.length).toBe(INITIAL_ROOMS.length);
    expect(project.gla_sqft).toBeGreaterThan(0);
    expect(project.summary.post_renovation_value).toBeGreaterThan(0);
    expect(project.summary.remodel_total_budget).toBeGreaterThan(0);
  });

  it('creates project from template with starter rooms and regional index', () => {
    const project = createProjectFromTemplate({
      templateId: 'clean_appraisal',
      name: 'Test Clean Appraisal',
      city: 'Overland Park',
      state: 'KS',
      zip: '66212',
    });

    expect(project.name).toBe('Test Clean Appraisal');
    expect(project.template_id).toBe('clean_appraisal');
    expect(project.project_type).toBe('clean_appraisal');
    expect(project.cost_index.zip_code).toBe('66212');
    expect(project.cost_index.city).toBe('Overland Park');
    expect(project.rooms.length).toBeGreaterThanOrEqual(1);
  });

  it('creates blank project using default template fallback', () => {
    const blank = createBlankProject('Blank Inspection');
    expect(blank.name).toBe('Blank Inspection');
    expect(blank.rooms.length).toBeGreaterThan(0);
  });

  it('saves and loads project to and from storage', async () => {
    const initial = createInitialProject();
    await saveProject(initial);

    const loaded = await loadSavedProject();
    expect(loaded.project_id).toBe(initial.project_id);
    expect(loaded.name).toBe(initial.name);
    expect(loaded.rooms.length).toBe(initial.rooms.length);
  });

  it('isolates retailer supplier API key to sessionStorage and strips from persisted project', async () => {
    const project = createInitialProject();
    project.supply_retailer = {
      retailer_id: 'lowes',
      retailer_name: "Lowe's Home Improvement",
      price_tier: 'contractor_pro',
      store_search_url_template: 'https://www.lowes.com/search?searchTerm={query}',
      api_key: 'SECRET_LOWES_KEY_123',
    };

    await saveProject(project);

    // Verify stored object in idb does not contain api_key
    const stored = memoryStore['datamesh_sprocket_active_project'] as SprocketProject;
    expect(stored.supply_retailer?.api_key).toBeUndefined();

    // Verify sessionStorage holds the key
    const sessionKey = window.sessionStorage.getItem(
      `datamesh_sprocket_supplier_session_key_${project.project_id}`
    );
    expect(sessionKey).toBe('SECRET_LOWES_KEY_123');

    // Verify loadSavedProject hydrates the key back from sessionStorage
    const hydrated = await loadSavedProject();
    expect(hydrated.supply_retailer?.api_key).toBe('SECRET_LOWES_KEY_123');
  });

  it('lists saved projects sorted by updated_at descending', async () => {
    const p1 = createInitialProject();
    p1.project_id = 'PRJ-1';
    p1.updated_at = new Date(Date.now() - 10000).toISOString();

    const p2 = createInitialProject();
    p2.project_id = 'PRJ-2';
    p2.updated_at = new Date(Date.now()).toISOString();

    await saveProject(p1);
    await saveProject(p2);

    const list = await listSavedProjects();
    expect(list.length).toBe(2);
    expect(list[0].project_id).toBe('PRJ-2');
    expect(list[1].project_id).toBe('PRJ-1');
  });

  it('deletes project from store and returns remaining list or new fallback project', async () => {
    const p1 = createInitialProject();
    p1.project_id = 'PRJ-DEL-1';
    const p2 = createInitialProject();
    p2.project_id = 'PRJ-DEL-2';

    await saveProject(p1);
    await saveProject(p2);

    let remaining = await deleteProjectFromStore('PRJ-DEL-1');
    expect(remaining.length).toBe(1);
    expect(remaining[0].project_id).toBe('PRJ-DEL-2');

    // Deleting the last project creates a fresh initial project fallback
    remaining = await deleteProjectFromStore('PRJ-DEL-2');
    expect(remaining.length).toBe(1);
    expect(remaining[0].project_id).toBe('PRJ-66208-001');
  });
});
