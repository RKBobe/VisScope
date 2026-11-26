// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '../App';
import { createInitialProject } from '../services/storage/projectStore';
import * as geminiClient from '../services/ai/geminiClient';

// Mock idb-keyval in memory for end-to-end tests
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

describe('App End-to-End Orchestrator', () => {
  const visScopeKey = 'vis_scope_db:projects';

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ inviteGateEnabled: false, authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    vi.spyOn(geminiClient, 'checkServerGeminiEnvStatus').mockResolvedValue({
      configured: false,
      proxyAvailable: false,
      model: 'gemini-3.0-flash',
    });

    for (const k in memoryStores) {
      delete memoryStores[k];
    }
    const initial = createInitialProject();
    memoryStores[visScopeKey] = {
      datamesh_sprocket_active_project: initial,
      datamesh_sprocket_projects_v1: { [initial.project_id]: initial },
    };

    try {
      window.sessionStorage?.clear?.();
      window.localStorage?.clear?.();
    } catch {
      // Ignore
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders application workspace with header, canvas, and room palette', async () => {
    render(<App />);

    // Header branding
    expect(screen.getByText(/Vis-/i)).toBeDefined();
    expect(screen.getByText('Scope')).toBeDefined();

    // Canvas rooms and palette entries
    expect(screen.getAllByText('Living Room').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kitchen/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Primary Bedroom/i).length).toBeGreaterThanOrEqual(1);

    // Room Palette
    expect(screen.getByText('Rooms Menu')).toBeDefined();
  });

  it('adds a room from palette, selects it, and displays in inspection drawer', async () => {
    render(<App />);

    // Click Kitchen template in Room Palette
    const addKitchenBtn = screen.getByTitle("Kitchen (18' × 14')");
    fireEvent.click(addKitchenBtn);

    // After clicking Kitchen, inspection drawer opens for the newly added room
    await waitFor(() => {
      expect(screen.getByText('Dimensions & Wall Areas')).toBeDefined();
    });
  });

  it('opens and closes Valuation modal from header Tools menu', async () => {
    render(<App />);

    // Header Tools button
    const toolsBtn = screen.getByText('Tools');
    fireEvent.click(toolsBtn);

    const valuationMenuItem = screen.getByText(/Craftsman Valuation/i);
    fireEvent.click(valuationMenuItem);

    expect(screen.getByText(/Deterministic Craftsman Valuation/i)).toBeDefined();
  });

  it('opens New Project modal when clicking New Inspection Project in project switcher', async () => {
    render(<App />);

    // Click project dropdown / selector in header
    const projectSwitcherBtn = screen.getByTitle('Switch or Create Saved Inspection Projects');
    fireEvent.click(projectSwitcherBtn);

    // Click "New Inspection Project" in dropdown
    const newProjectBtn = screen.getByText(/New Inspection Project/i);
    fireEvent.click(newProjectBtn);

    await waitFor(() => {
      expect(screen.getByText(/1\. Select Project Inspection Template/i)).toBeDefined();
    });
  });

  it('opens Quick Actions Command Center modal when clicking top-left logo symbol', async () => {
    render(<App />);

    const logoBtn = screen.getByLabelText('Open Vis-Scope Command Center and Quick Actions');
    fireEvent.click(logoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vis-Scope Command Center/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Search actions, tools, exports/i)).toBeDefined();
    });
  });
});
