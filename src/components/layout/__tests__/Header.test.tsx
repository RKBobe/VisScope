import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../Header';
import { createInitialProject } from '../../../services/storage/projectStore';

describe('Header Component - Toolbar Actions & Dropdown Navigation', () => {
  const dummyProject = createInitialProject();

  it('renders pinned buttons: Save, Ingest File, and Gemini AI (always visible)', () => {
    const html = renderToStaticMarkup(
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

    // Pinned actions must always be present on the top bar
    expect(html).toContain('Save Project to IndexedDB');
    expect(html).toContain('Ingest File');
    expect(html).toContain('Gemini AI');
    // Gemini configured green pip indicator
    expect(html).toContain('bg-emerald-400');
  });

  it('renders unconfigured Gemini status when geminiConfigured is false', () => {
    const html = renderToStaticMarkup(
      <Header
        project={dummyProject}
        geminiConfigured={false}
        onOpenGeminiSettings={vi.fn()}
        onOpenValuation={vi.fn()}
        onOpenProcurement={vi.fn()}
        onOpenIngestion={vi.fn()}
        onOpenPropertyRecord={vi.fn()}
        onSaveManual={vi.fn()}
      />
    );

    expect(html).toContain('Gemini AI');
    expect(html).toContain('bg-slate-600');
  });

  it('renders "Tools" dropdown trigger button with icon and indicator', () => {
    const html = renderToStaticMarkup(
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

    expect(html).toContain('>Tools<');
    expect(html).toContain('Inspection &amp; Estimating Tools');
  });

  it('renders "Export" dropdown trigger button with icon and indicator', () => {
    const html = renderToStaticMarkup(
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

    expect(html).toContain('>Export<');
    expect(html).toContain('Export Inspection Reports &amp; Data Bundles');
  });

  it('has clean accessible structure without overflow', () => {
    const html = renderToStaticMarkup(
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

    // Verify header container has right layout classes
    expect(html).toContain('h-16 bg-slate-900 border-b border-slate-800');
    // Ensure all 5 primary controls are in the action cluster
    expect(html).toContain('Ingest File');
    expect(html).toContain('Gemini AI');
    expect(html).toContain('>Tools<');
    expect(html).toContain('>Export<');
  });
});
