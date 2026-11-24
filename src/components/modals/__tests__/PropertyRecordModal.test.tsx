// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PropertyRecordModal } from '../PropertyRecordModal';
import { createInitialProject } from '../../../services/storage/projectStore';

describe('PropertyRecordModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when closed', () => {
    const project = createInitialProject();
    render(
      <PropertyRecordModal
        project={project}
        isOpen={false}
        onClose={() => {}}
        onUpdateProjectMetadata={() => {}}
      />
    );
    expect(screen.queryByText(/Property Record Card & Appraisal Data Fields/i)).toBeNull();
  });

  it('renders property address and appraisal records when open', () => {
    const project = createInitialProject();
    render(
      <PropertyRecordModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onUpdateProjectMetadata={() => {}}
      />
    );

    expect(screen.getByText(/Property Record Card & Appraisal Data Fields/i)).toBeDefined();
    expect(screen.getByDisplayValue('7550 Windsor St')).toBeDefined();
    expect(screen.getByDisplayValue('Prairie Village')).toBeDefined();
    expect(screen.getByDisplayValue('66208')).toBeDefined();
  });

  it('allows switching project scope type', () => {
    const project = createInitialProject();
    const handleUpdateMetadata = vi.fn();

    render(
      <PropertyRecordModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onUpdateProjectMetadata={handleUpdateMetadata}
      />
    );

    const cleanAppraisalBtn = screen.getByText(/Clean Appraisal/i);
    fireEvent.click(cleanAppraisalBtn);

    expect(handleUpdateMetadata).toHaveBeenCalledWith(
      project.address,
      expect.anything(),
      project.baseline_quality,
      project.baseline_condition,
      'clean_appraisal'
    );
  });

  it('allows adding a new building permit record', () => {
    const project = createInitialProject();
    const handleUpdateMetadata = vi.fn();

    render(
      <PropertyRecordModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onUpdateProjectMetadata={handleUpdateMetadata}
      />
    );

    // Open add permit form
    const addPermitBtn = screen.getByText(/Add Permit/i);
    fireEvent.click(addPermitBtn);

    const permitNumInput = screen.getByPlaceholderText(/Permit #/i);
    fireEvent.change(permitNumInput, { target: { value: 'BP-TEST-999' } });

    const submitPermitBtn = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(submitPermitBtn);

    expect(handleUpdateMetadata).toHaveBeenCalled();
  });
});
