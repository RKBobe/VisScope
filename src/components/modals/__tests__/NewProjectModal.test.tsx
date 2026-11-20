// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NewProjectModal } from '../NewProjectModal';

describe('NewProjectModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when closed', () => {
    render(
      <NewProjectModal
        isOpen={false}
        onClose={() => {}}
        onCreateProject={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders all template options when opened', () => {
    render(
      <NewProjectModal
        isOpen={true}
        onClose={() => {}}
        onCreateProject={() => {}}
        defaultProjectNumber={2}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Clean Appraisal/i)).toBeDefined();
    expect(screen.getAllByText(/Remodel & Renovation/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Fire Damage/i)).toBeDefined();
    expect(screen.getByText(/Flood & Water Damage/i)).toBeDefined();
    expect(screen.getByText(/Pre-Purchase/i)).toBeDefined();
    expect(screen.getByText(/Pre-Listing/i)).toBeDefined();
    expect(screen.getByText(/New Construction/i)).toBeDefined();
  });

  it('allows customizing cost categories and submitting new project', () => {
    const handleCreateProject = vi.fn();

    render(
      <NewProjectModal
        isOpen={true}
        onClose={() => {}}
        onCreateProject={handleCreateProject}
        defaultProjectNumber={5}
      />
    );

    // Switch to Clean Appraisal template
    const cleanAppraisalBtn = screen.getByText(/Clean Appraisal/i);
    fireEvent.click(cleanAppraisalBtn);

    // Toggle a trade category
    const foundationPill = screen.getByText('Foundation');
    fireEvent.click(foundationPill);

    // Click Start Project
    const submitBtn = screen.getByText('Start Project');
    fireEvent.click(submitBtn);

    expect(handleCreateProject).toHaveBeenCalledTimes(1);
    const submittedArgs = handleCreateProject.mock.calls[0][0];
    expect(submittedArgs.templateId).toBe('clean_appraisal');
    expect(Array.isArray(submittedArgs.includedTrades)).toBe(true);
  });
});
