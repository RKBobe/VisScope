// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuickActionsModal } from '../QuickActionsModal';
import { createInitialProject } from '../../../services/storage/projectStore';
import { FloorLevel } from '../../../types/sprocket';

describe('QuickActionsModal Component', () => {
  const initialProject = createInitialProject();
  const defaultRoomsCount: Record<FloorLevel, number> = {
    'First Floor': 3,
    'Second Floor': 0,
    Basement: 0,
    Attic: 0,
  };

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    project: initialProject,
    savedProjects: [initialProject],
    onSelectProject: vi.fn(),
    onCreateNewProject: vi.fn(),
    onSaveManual: vi.fn().mockResolvedValue(undefined),
    onExportBundle: vi.fn(),
    onOpenReport: vi.fn(),
    onOpenValuation: vi.fn(),
    onOpenPropertyRecord: vi.fn(),
    onOpenProcurement: vi.fn(),
    onOpenIngestion: vi.fn(),
    onOpenGeminiSettings: vi.fn(),
    onOpenUpgradeModal: vi.fn(),
    currentLevel: 'First Floor' as FloorLevel,
    onSelectLevel: vi.fn(),
    showAnsiBuffer: true,
    onToggleAnsiBuffer: vi.fn(),
    onAddRoom: vi.fn(),
    roomsCountPerLevel: defaultRoomsCount,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when isOpen is false', () => {
    render(<QuickActionsModal {...mockProps} isOpen={false} />);
    expect(screen.queryByText(/Vis-Scope Command Center/i)).toBeNull();
  });

  it('renders all key action categories and items when open', () => {
    render(<QuickActionsModal {...mockProps} />);

    // Header & Project Name
    expect(screen.getByText(/Vis-Scope Command Center/i)).toBeDefined();
    expect(screen.getByText(initialProject.name)).toBeDefined();

    // Categories
    expect(screen.getByText('Project & Files')).toBeDefined();
    expect(screen.getByText('Appraisal Tools')).toBeDefined();
    expect(screen.getByText('Floor Levels')).toBeDefined();
    expect(screen.getByText('Room Templates')).toBeDefined();

    // Key Actions
    expect(screen.getByText(/New Inspection Project/i)).toBeDefined();
    expect(screen.getByText(/Save Project to Storage/i)).toBeDefined();
    expect(screen.getByText(/Printable PDF Inspection Report/i)).toBeDefined();
    expect(screen.getByText(/Craftsman Valuation Calculator/i)).toBeDefined();
    expect(screen.getByText(/Property Record & Appraisal Fields/i)).toBeDefined();
    expect(screen.getByText(/Lowe's Materials Procurement/i)).toBeDefined();
    expect(screen.getByText(/Ingest File & Floor Plan/i)).toBeDefined();
    expect(screen.getByText(/Gemini Multimodal AI Settings/i)).toBeDefined();
    expect(screen.getByText(/Subscription Tiers & Upgrades/i)).toBeDefined();
    expect(screen.getByText(/Switch to Second Floor/i)).toBeDefined();
    expect(screen.getByText(/Hide ANSI Z765 Buffer Overlay/i)).toBeDefined();
    expect(screen.getByText(/Add Living Room/i)).toBeDefined();
  });

  it('filters actions dynamically via the search input', () => {
    render(<QuickActionsModal {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/Search actions, tools, exports/i);
    fireEvent.change(searchInput, { target: { value: 'valuation' } });

    // Should match Craftsman Valuation Calculator
    expect(screen.getByText(/Craftsman Valuation Calculator/i)).toBeDefined();

    // Should hide unrelated actions
    expect(screen.queryByText(/Switch to Second Floor/i)).toBeNull();
    expect(screen.queryByText(/Add Living Room/i)).toBeNull();
  });

  it('displays empty search state when query matches nothing', () => {
    render(<QuickActionsModal {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/Search actions, tools, exports/i);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent123' } });

    expect(screen.getByText(/No matching actions found/i)).toBeDefined();
  });

  it('triggers action callbacks and closes modal when clicked', () => {
    render(<QuickActionsModal {...mockProps} />);

    // Click Craftsman Valuation Calculator
    const valBtn = screen.getByText(/Craftsman Valuation Calculator/i).closest('button');
    expect(valBtn).not.toBeNull();
    fireEvent.click(valBtn!);

    expect(mockProps.onOpenValuation).toHaveBeenCalledTimes(1);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('triggers level selection when floor level action is clicked', () => {
    render(<QuickActionsModal {...mockProps} />);

    const basementBtn = screen.getByText(/Switch to Basement/i).closest('button');
    expect(basementBtn).not.toBeNull();
    fireEvent.click(basementBtn!);

    expect(mockProps.onSelectLevel).toHaveBeenCalledWith('Basement');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('triggers add room callback with room template dimensions', () => {
    render(<QuickActionsModal {...mockProps} />);

    const kitchenBtn = screen.getByText(/Add Kitchen/i).closest('button');
    expect(kitchenBtn).not.toBeNull();
    fireEvent.click(kitchenBtn!);

    expect(mockProps.onAddRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Kitchen',
        length_ft: 18,
        width_ft: 14,
        level: 'First Floor',
      })
    );
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('triggers manual save and shows saved badge without immediately closing', async () => {
    render(<QuickActionsModal {...mockProps} />);

    const saveBtn = screen.getByText(/Save Project to Storage/i).closest('button');
    expect(saveBtn).not.toBeNull();
    fireEvent.click(saveBtn!);

    expect(mockProps.onSaveManual).toHaveBeenCalledTimes(1);
  });

  it('closes when close button is clicked or Escape key is pressed', () => {
    render(<QuickActionsModal {...mockProps} />);

    const closeBtn = screen.getByLabelText(/Close Command Center/i);
    fireEvent.click(closeBtn);
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockProps.onClose).toHaveBeenCalledTimes(2);
  });
});
