// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InspectionReportModal } from '../InspectionReportModal';
import { createInitialProject } from '../../../services/storage/projectStore';
import { SubscriptionProvider } from '../../../context/SubscriptionContext';

describe('InspectionReportModal Component', () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithSubscription = (ui: React.ReactElement) => {
    return render(<SubscriptionProvider>{ui}</SubscriptionProvider>);
  };

  it('does not render when closed', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <InspectionReportModal
        project={project}
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText(/Print \/ Save as PDF/i)).toBeNull();
  });

  it('renders report and calls window.print on print button click', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <InspectionReportModal
        project={project}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Print \/ Save as PDF/i)).toBeDefined();
    expect(screen.getByText(/Printable Property Inspection & Scope Report/i)).toBeDefined();

    const printBtn = screen.getByText(/Print \/ Save as PDF/i);
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it('toggles report sections using toolbar checkboxes', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <InspectionReportModal
        project={project}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const valuationToggle = screen.getByText('Valuation');
    fireEvent.click(valuationToggle);

    // Section 2 should be toggled off
    expect(screen.queryByText(/2\. Craftsman 3-Way Valuation/i)).toBeNull();
  });
});
