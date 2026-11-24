// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ValuationModal } from '../ValuationModal';
import { createInitialProject } from '../../../services/storage/projectStore';
import { ALL_TRADE_CATEGORIES, STRUCTURAL_TRADE_CATEGORIES } from '../../../types/sprocket';
import { COMMON_REGIONAL_INDICES } from '../../../services/math/valuation';

describe('ValuationModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when closed', () => {
    const project = createInitialProject();
    render(
      <ValuationModal
        project={project}
        isOpen={false}
        onClose={() => {}}
        onSelectCostIndex={() => {}}
      />
    );
    expect(screen.queryByText(/Deterministic Craftsman Valuation/i)).toBeNull();
  });

  it('renders full valuation figures and distinct remodel budget when open', () => {
    const project = createInitialProject();
    render(
      <ValuationModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onSelectCostIndex={() => {}}
      />
    );

    expect(screen.getByText(/Deterministic Craftsman Valuation/i)).toBeDefined();
    expect(screen.getByText(/Full Valuation: As-Is Property Basis/i)).toBeDefined();
    expect(screen.getByText(/Distinct Remodel \/ Renovation Scope/i)).toBeDefined();
    expect(screen.getByText(/Full Valuation: Post-Renovation \(RCN\)/i)).toBeDefined();

    // Verify regional modifier city/state
    expect(screen.getAllByText(/Prairie Village, KS/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows switching regional cost index from selector dropdown', () => {
    const project = createInitialProject();
    const handleSelectCostIndex = vi.fn();

    render(
      <ValuationModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onSelectCostIndex={handleSelectCostIndex}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '66061' } });

    expect(handleSelectCostIndex).toHaveBeenCalledWith(COMMON_REGIONAL_INDICES['66061']);
  });

  it('toggles trade category in and out of scope when clicking status button', () => {
    const project = createInitialProject();
    const handleUpdateIncludedTrades = vi.fn();

    render(
      <ValuationModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onSelectCostIndex={() => {}}
        onUpdateIncludedTrades={handleUpdateIncludedTrades}
      />
    );

    // Click on a trade button (e.g. Painting or Cabinets)
    const inScopeButtons = screen.getAllByRole('button', { name: /In Scope/i });
    expect(inScopeButtons.length).toBeGreaterThan(0);
    fireEvent.click(inScopeButtons[0]);

    expect(handleUpdateIncludedTrades).toHaveBeenCalled();
  });

  it('executes quick preset filters: Exclude Structural and Include All Trades', () => {
    const project = createInitialProject();
    const handleUpdateIncludedTrades = vi.fn();

    render(
      <ValuationModal
        project={project}
        isOpen={true}
        onClose={() => {}}
        onSelectCostIndex={() => {}}
        onUpdateIncludedTrades={handleUpdateIncludedTrades}
      />
    );

    const excludeStructuralBtn = screen.getByText(/Remodel Only \(Exclude Structural\)/i);
    fireEvent.click(excludeStructuralBtn);

    const expectedNonStructural = ALL_TRADE_CATEGORIES.filter(
      (t) => !STRUCTURAL_TRADE_CATEGORIES.includes(t)
    );
    expect(handleUpdateIncludedTrades).toHaveBeenCalledWith(expectedNonStructural);

    const includeAllBtn = screen.getByText(/Include All Trades/i);
    fireEvent.click(includeAllBtn);

    expect(handleUpdateIncludedTrades).toHaveBeenCalledWith(ALL_TRADE_CATEGORIES);
  });
});
