// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Header } from '../Header';
import { createInitialProject } from '../../../services/storage/projectStore';
import * as bundleSerializer from '../../../services/exporters/bundleSerializer';

describe('Header Component - Interactive Toolbar Actions & Dropdown Navigation', () => {
  const dummyProject = createInitialProject();

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders pinned buttons: Save, Ingest File, and Gemini AI directly on the bar', () => {
    render(
      <Header
        project={dummyProject}
        geminiConfigured={true}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onOpenReport={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    // Save button with aria-label
    expect(screen.getByLabelText('Save Project to IndexedDB')).toBeDefined();

    // Pinned actions
    expect(screen.getByText('Ingest File')).toBeDefined();
    expect(screen.getByText('Gemini AI')).toBeDefined();

    // Tools and Export trigger buttons
    expect(screen.getByText('Tools')).toBeDefined();
    expect(screen.getByText('Export')).toBeDefined();
  });

  it('toggles Tools dropdown and executes callbacks on menuitem click', () => {
    const onOpenPropertyRecord = vi.fn();
    const onOpenValuation = vi.fn();
    const onOpenProcurement = vi.fn();

    render(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={onOpenValuation}
        onOpenProcurement={onOpenProcurement}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={onOpenPropertyRecord}
        onOpenReport={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    const toolsButton = screen.getByText('Tools').closest('button')!;
    expect(toolsButton.getAttribute('aria-expanded')).toBe('false');

    // Open tools dropdown
    fireEvent.click(toolsButton);
    expect(toolsButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Property Fields')).toBeDefined();
    expect(screen.getByText('Craftsman Valuation')).toBeDefined();
    expect(screen.getByText('Materials Order')).toBeDefined();

    // Click Property Fields item
    fireEvent.click(screen.getByText('Property Fields'));
    expect(onOpenPropertyRecord).toHaveBeenCalledTimes(1);
    expect(toolsButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles Export dropdown and executes callbacks on menuitem click', () => {
    const onOpenReport = vi.fn();

    render(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onOpenReport={onOpenReport}
        onSaveManual={vi.fn()}
      />
    );

    const exportButton = screen.getByText('Export').closest('button')!;
    expect(exportButton.getAttribute('aria-expanded')).toBe('false');

    // Open export dropdown
    fireEvent.click(exportButton);
    expect(exportButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('PDF Inspection Report')).toBeDefined();
    expect(screen.getByText('MeshEngine Drop (.ZIP)')).toBeDefined();

    // Click PDF Inspection Report
    fireEvent.click(screen.getByText('PDF Inspection Report'));
    expect(onOpenReport).toHaveBeenCalledTimes(1);
    expect(exportButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('enforces mutual exclusion between menus', () => {
    render(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onOpenReport={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    const toolsButton = screen.getByText('Tools').closest('button')!;
    const exportButton = screen.getByText('Export').closest('button')!;

    // Open tools
    fireEvent.click(toolsButton);
    expect(toolsButton.getAttribute('aria-expanded')).toBe('true');
    expect(exportButton.getAttribute('aria-expanded')).toBe('false');

    // Open export -> tools closes
    fireEvent.click(exportButton);
    expect(toolsButton.getAttribute('aria-expanded')).toBe('false');
    expect(exportButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes open menu on Escape key press', () => {
    render(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onOpenReport={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    const toolsButton = screen.getByText('Tools').closest('button')!;
    fireEvent.click(toolsButton);
    expect(toolsButton.getAttribute('aria-expanded')).toBe('true');

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toolsButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes open menu on clicking outside', () => {
    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <Header
          project={dummyProject}
          geminiConfigured={false}
          onOpenGeminiSettings={vi.fn()}
          onOpenValuation={vi.fn()}
          onOpenProcurement={vi.fn()}
          onOpenIngestion={vi.fn()}
          onOpenPropertyRecord={vi.fn()}
          onOpenReport={vi.fn()}
          onSaveManual={vi.fn()}
        />
      </div>
    );

    const exportButton = screen.getByText('Export').closest('button')!;
    fireEvent.click(exportButton);
    expect(exportButton.getAttribute('aria-expanded')).toBe('true');

    // Click outside
    fireEvent.pointerDown(screen.getByTestId('outside-element'));
    expect(exportButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('revokes object URL upon MeshEngine ZIP bundle export', async () => {
    const fakeBlob = new Blob(['fake-zip-data'], { type: 'application/zip' });
    vi.spyOn(bundleSerializer, 'createMeshEngineBundle').mockResolvedValue(fakeBlob);

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/fake-zip');
    const revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    render(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onOpenReport={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    const exportButton = screen.getByText('Export').closest('button')!;
    fireEvent.click(exportButton);

    const zipItem = screen.getByText('MeshEngine Drop (.ZIP)');
    fireEvent.click(zipItem);

    // Wait microtask tick for async handleExportMeshEngineBundle
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createObjectURLSpy).toHaveBeenCalledWith(fakeBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-zip');
  });
});
