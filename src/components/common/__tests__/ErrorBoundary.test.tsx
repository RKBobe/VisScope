// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const GoodChild: React.FC = () => <div>All systems operational</div>;

const BrokenChild: React.FC = () => {
  throw new Error('Canvas render projection failure');
};

describe('ErrorBoundary Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders children cleanly when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('All systems operational')).toBeDefined();
  });

  it('catches render errors and displays Vis-Scope recovery screen', () => {
    // Suppress console.error during expected boundary catch
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Vis-Scope Crash Guard')).toBeDefined();
    expect(screen.getByText('An unexpected display error occurred')).toBeDefined();
    expect(screen.getByText('Reload Application')).toBeDefined();
    expect(screen.getByText('Download Emergency Backup')).toBeDefined();
    expect(screen.getByText('Diagnostic Error Details')).toBeDefined();

    spy.mockRestore();
  });
});
