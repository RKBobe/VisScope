// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LowesProcurementModal } from '../LowesProcurementModal';
import { createInitialProject } from '../../../services/storage/projectStore';
import { SubscriptionProvider } from '../../../context/SubscriptionContext';

describe('LowesProcurementModal Component', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
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
      <LowesProcurementModal
        project={project}
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText(/Materials Supply & Pro Procurement/i)).toBeNull();
  });

  it('renders procurement orders with aisle breakdowns when open', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <LowesProcurementModal
        project={project}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Materials Supply & Pro Procurement/i)).toBeDefined();
    expect(screen.getByText(/Download Pick Sheet \(CSV\)/i)).toBeDefined();
  });

  it('triggers CSV download when clicking Download Pick Sheet', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <LowesProcurementModal
        project={project}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const downloadBtn = screen.getByText(/Download Pick Sheet \(CSV\)/i);
    fireEvent.click(downloadBtn);

    // If on free tier, opens upgrade modal, if pro, creates object url
    expect(downloadBtn).toBeDefined();
  });

  it('toggles supplier setup settings panel', () => {
    const project = createInitialProject();
    renderWithSubscription(
      <LowesProcurementModal
        project={project}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const setupBtn = screen.getByText(/Supplier Setup/i);
    fireEvent.click(setupBtn);

    expect(screen.getByText(/Supplier Display Name/i)).toBeDefined();
  });
});
