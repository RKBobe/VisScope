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
  ensureIndexedDBInitialized,
  createAndPersistProject,
  isIndexedDBSupported,
  resetVisScopeStore,
  VIS_SCOPE_DB_NAME,
  VIS_SCOPE_STORE_NAME,
  STORAGE_KEY,
  STORAGE_LIST_KEY,
  DEVICE_INIT_STORAGE_KEY,
  INITIAL_ROOMS,
} from '../projectStore';
import { SprocketProject } from '../../../types/sprocket';

// Mock idb-keyval in memory with support for default and custom stores
const memoryStores: Record<string, Record<string, any>> = {};

function getStoreKey(customStore?: any): string {
  if (customStore && customStore.__storeKey) {
    return customStore.__storeKey;
  }
  return 'default';
}

vi.mock('idb-keyval', () => ({
  createStore: vi.fn((dbName: string, storeName: string) => {
    return { __storeKey: `${dbName}:${storeName}` };
  }),
  get: vi.fn((key: string, customStore?: any) => {
    const sKey = getStoreKey(customStore);
    return Promise.resolve(memoryStores[sKey]?.[key]);
  }),
  set: vi.fn((key: string, val: any, customStore?: any) => {
    const sKey = getStoreKey(customStore);
    if (!memoryStores[sKey]) memoryStores[sKey] = {};
    memoryStores[sKey][key] = val;
    return Promise.resolve();
  }),
}));

describe('Project Store Service', () => {
  const visScopeStoreKey = `${VIS_SCOPE_DB_NAME}:${VIS_SCOPE_STORE_NAME}`;

  beforeEach(() => {
    resetVisScopeStore();
    for (const s in memoryStores) {
      delete memoryStores[s];
    }
    if (typeof window !== 'undefined') {
      (window as any).indexedDB = (window as any).indexedDB || {};
      if (!window.localStorage) {
        const localStore: Record<string, string> = {};
        (window as any).localStorage = {
          getItem: (key: string) => localStore[key] ?? null,
          setItem: (key: string, value: string) => { localStore[key] = String(value); },
          removeItem: (key: string) => { delete localStore[key]; },
          clear: () => { for (const k in localStore) delete localStore[k]; },
        };
      }
    }
    window.sessionStorage?.clear?.();
    window.localStorage?.clear?.();
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
    const stored = memoryStores[visScopeStoreKey][STORAGE_KEY] as SprocketProject;
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

  it('initializes IndexedDB on first device use and creates initial database entry', async () => {
    expect(isIndexedDBSupported()).toBe(true);

    // Initial state: empty vis_scope_db and uninitialized device
    expect(memoryStores[visScopeStoreKey]).toBeUndefined();
    expect(window.localStorage.getItem(DEVICE_INIT_STORAGE_KEY)).toBeNull();

    const status = await ensureIndexedDBInitialized();
    expect(status.supported).toBe(true);
    expect(status.isFirstDeviceInit).toBe(true);
    expect(status.migrated).toBe(false);
    expect(status.projectCount).toBeGreaterThanOrEqual(1);

    // Check that vis_scope_db store has the initial project saved
    expect(memoryStores[visScopeStoreKey][STORAGE_KEY]).toBeDefined();
    expect(memoryStores[visScopeStoreKey][STORAGE_KEY].project_id).toBe('PRJ-66208-001');
    expect(window.localStorage.getItem(DEVICE_INIT_STORAGE_KEY)).toBeTruthy();
  });

  it('migrates legacy keyval-store data to vis_scope_db when upgrading existing installation', async () => {
    // Simulate legacy user who has data in default store
    const legacyProject = createInitialProject();
    legacyProject.name = 'Legacy Prairie Home';
    legacyProject.project_id = 'PRJ-LEGACY-001';

    memoryStores['default'] = {
      [STORAGE_KEY]: legacyProject,
      [STORAGE_LIST_KEY]: { [legacyProject.project_id]: legacyProject },
    };

    const status = await ensureIndexedDBInitialized();
    expect(status.migrated).toBe(true);
    expect(status.projectCount).toBe(1);

    // Verify it migrated to vis_scope_db
    const active = await loadSavedProject();
    expect(active.project_id).toBe('PRJ-LEGACY-001');
    expect(active.name).toBe('Legacy Prairie Home');
  });

  it('createAndPersistProject atomically creates and persists project to vis_scope_db', async () => {
    const { project: created, savedProjects } = await createAndPersistProject({
      templateId: 'fire_damage',
      name: 'Fire Restoration Job 101',
      city: 'Olathe',
      state: 'KS',
      zip: '66061',
    });

    expect(created.name).toBe('Fire Restoration Job 101');
    expect(created.template_id).toBe('fire_damage');
    expect(savedProjects.some((p) => p.project_id === created.project_id)).toBe(true);

    // Verify directly in vis_scope_db storage
    const activeInDb = memoryStores[visScopeStoreKey][STORAGE_KEY] as SprocketProject;
    expect(activeInDb.project_id).toBe(created.project_id);
    expect(activeInDb.name).toBe('Fire Restoration Job 101');

    const listInDb = memoryStores[visScopeStoreKey][STORAGE_LIST_KEY] as Record<string, SprocketProject>;
    expect(listInDb[created.project_id]).toBeDefined();
  });
});
