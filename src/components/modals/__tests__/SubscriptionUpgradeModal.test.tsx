// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from '../../../context/SubscriptionContext';
import { SubscriptionUpgradeModal } from '../SubscriptionUpgradeModal';

const ModalOpener: React.FC = () => {
  const { openUpgradeModal } = useSubscription();
  return (
    <div>
      <button onClick={() => openUpgradeModal('export_meshengine_zip')} data-testid="open-zip-gate">
        Open Zip Gated
      </button>
      <button onClick={() => openUpgradeModal()} data-testid="open-general">
        Open General
      </button>
      <SubscriptionUpgradeModal />
    </div>
  );
};

describe('SubscriptionUpgradeModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when closed', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <SubscriptionUpgradeModal />
      </SubscriptionProvider>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders all three tiers with pricing when opened', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <ModalOpener />
      </SubscriptionProvider>
    );

    fireEvent.click(screen.getByTestId('open-general'));

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Starter')).toBeDefined();
    expect(screen.getByText('Professional')).toBeDefined();
    expect(screen.getByText('Team / Firm')).toBeDefined();
    expect(screen.getByText('$39')).toBeDefined();
    expect(screen.getByText('$149')).toBeDefined();
  });

  it('displays contextual banner when opened from a locked feature trigger', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <ModalOpener />
      </SubscriptionProvider>
    );

    fireEvent.click(screen.getByTestId('open-zip-gate'));

    expect(screen.getByText('Unlock MeshEngine Drop (.ZIP) Exports')).toBeDefined();
  });

  it('toggles between monthly and annual billing cycles', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <ModalOpener />
      </SubscriptionProvider>
    );

    fireEvent.click(screen.getByTestId('open-general'));

    const annualButton = screen.getByText('Annual Billing');
    fireEvent.click(annualButton);

    // Annual price breakdown: $390 / 12 = $33/mo
    expect(screen.getByText('$33')).toBeDefined();
    // Annual team price breakdown: $1490 / 12 = $124/mo
    expect(screen.getByText('$124')).toBeDefined();
  });

  it('closes when clicking close button or pressing Escape', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <ModalOpener />
      </SubscriptionProvider>
    );

    fireEvent.click(screen.getByTestId('open-general'));
    expect(screen.getByRole('dialog')).toBeDefined();

    const closeButton = screen.getByLabelText('Close Upgrade Modal');
    fireEvent.click(closeButton);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('allows unlocking VIP partner access via license code form', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <ModalOpener />
      </SubscriptionProvider>
    );

    fireEvent.click(screen.getByTestId('open-general'));
    expect(screen.getByRole('dialog')).toBeDefined();

    // Click to open partner unlock form
    const partnerButton = screen.getByText('Have a Partner Key or Enterprise Access Code?');
    fireEvent.click(partnerButton);

    // Enter valid partner code
    const input = screen.getByPlaceholderText('e.g. VISPARTNER');
    fireEvent.change(input, { target: { value: 'VISPARTNER' } });

    // Submit form
    const submitButton = screen.getByText('Activate VIP Access');
    fireEvent.click(submitButton);

    // Expect success toast to appear
    expect(screen.getByText(/Switched active tier to/i)).toBeDefined();
  });
});
