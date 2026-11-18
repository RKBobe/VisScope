// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from '../SubscriptionContext';

const TestConsumer: React.FC = () => {
  const { tier, setTier, hasAccess, openUpgradeModal, isUpgradeModalOpen } = useSubscription();

  return (
    <div>
      <span data-testid="tier">{tier}</span>
      <span data-testid="can-export-zip">
        {hasAccess('export_meshengine_zip') ? 'true' : 'false'}
      </span>
      <span data-testid="can-export-unwatermarked-pdf">
        {hasAccess('export_pdf_unwatermarked') ? 'true' : 'false'}
      </span>
      <span data-testid="can-download-procurement">
        {hasAccess('download_procurement_csv') ? 'true' : 'false'}
      </span>
      <span data-testid="is-modal-open">{isUpgradeModalOpen ? 'open' : 'closed'}</span>
      <button onClick={() => setTier('pro')} data-testid="switch-pro">
        Switch Pro
      </button>
      <button onClick={() => setTier('team')} data-testid="switch-team">
        Switch Team
      </button>
      <button onClick={() => openUpgradeModal('export_meshengine_zip')} data-testid="open-modal">
        Open Modal
      </button>
    </div>
  );
};

describe('SubscriptionContext - Multi-Tier Entitlements', () => {
  afterEach(() => {
    cleanup();
  });

  it('defaults to Starter tier with appropriately gated feature access', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <TestConsumer />
      </SubscriptionProvider>
    );

    expect(screen.getByTestId('tier').textContent).toBe('starter');
    expect(screen.getByTestId('can-export-zip').textContent).toBe('false');
    expect(screen.getByTestId('can-export-unwatermarked-pdf').textContent).toBe('false');
    expect(screen.getByTestId('can-download-procurement').textContent).toBe('false');
    expect(screen.getByTestId('is-modal-open').textContent).toBe('closed');
  });

  it('unlocks Pro features when upgraded to Pro tier', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <TestConsumer />
      </SubscriptionProvider>
    );

    act(() => {
      screen.getByTestId('switch-pro').click();
    });

    expect(screen.getByTestId('tier').textContent).toBe('pro');
    expect(screen.getByTestId('can-export-zip').textContent).toBe('true');
    expect(screen.getByTestId('can-export-unwatermarked-pdf').textContent).toBe('true');
    expect(screen.getByTestId('can-download-procurement').textContent).toBe('true');
  });

  it('tracks modal open status and upgrade context', () => {
    render(
      <SubscriptionProvider initialTier="starter">
        <TestConsumer />
      </SubscriptionProvider>
    );

    act(() => {
      screen.getByTestId('open-modal').click();
    });

    expect(screen.getByTestId('is-modal-open').textContent).toBe('open');
  });
});
