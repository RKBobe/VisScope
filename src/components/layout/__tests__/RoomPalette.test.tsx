// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RoomPalette } from '../RoomPalette';

describe('RoomPalette Component', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultCounts = {
    'First Floor': 3,
    'Second Floor': 1,
    Basement: 0,
    Attic: 0,
  };

  it('renders room templates and level tabs with room counts', () => {
    const handleSelectLevel = vi.fn();
    const handleAddRoom = vi.fn();

    render(
      <RoomPalette
        currentLevel="First Floor"
        onSelectLevel={handleSelectLevel}
        onAddRoom={handleAddRoom}
        roomsCountPerLevel={defaultCounts}
      />
    );

    expect(screen.getByText('Rooms Menu')).toBeDefined();
    expect(screen.getByText('Living Room')).toBeDefined();
    expect(screen.getByText('Kitchen')).toBeDefined();
    expect(screen.getByText('Bedroom')).toBeDefined();
    expect(screen.getByText('Bathroom')).toBeDefined();
    expect(screen.getByText('Basement Rec')).toBeDefined();
    expect(screen.getByText('Custom Room')).toBeDefined();

    // Verify level buttons
    expect(screen.getByText('First Floor')).toBeDefined();
    expect(screen.getByText('Second Floor')).toBeDefined();
    expect(screen.getByText('Basement')).toBeDefined();
    expect(screen.getByText('Attic')).toBeDefined();
  });

  it('calls onAddRoom with correct template dimensions when a room button is clicked', () => {
    const handleAddRoom = vi.fn();

    render(
      <RoomPalette
        currentLevel="First Floor"
        onSelectLevel={() => {}}
        onAddRoom={handleAddRoom}
        roomsCountPerLevel={defaultCounts}
      />
    );

    const kitchenBtn = screen.getByText('Kitchen');
    fireEvent.click(kitchenBtn);

    expect(handleAddRoom).toHaveBeenCalledWith({
      name: 'Kitchen',
      length_ft: 18,
      width_ft: 14,
      height_ft: 9,
      level: 'First Floor',
    });
  });

  it('switches floor level when clicking level tabs', () => {
    const handleSelectLevel = vi.fn();

    render(
      <RoomPalette
        currentLevel="First Floor"
        onSelectLevel={handleSelectLevel}
        onAddRoom={() => {}}
        roomsCountPerLevel={defaultCounts}
      />
    );

    const secondFloorBtn = screen.getByText('Second Floor');
    fireEvent.click(secondFloorBtn);

    expect(handleSelectLevel).toHaveBeenCalledWith('Second Floor');
  });

  it('collapses and expands room palette on chevron toggle', () => {
    render(
      <RoomPalette
        currentLevel="First Floor"
        onSelectLevel={() => {}}
        onAddRoom={() => {}}
        roomsCountPerLevel={defaultCounts}
      />
    );

    const collapseBtn = screen.getByTitle('Collapse Rooms Menu');
    fireEvent.click(collapseBtn);

    expect(screen.queryByText('Rooms Menu')).toBeNull();
    const expandBtn = screen.getByTitle('Expand Rooms Menu');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Rooms Menu')).toBeDefined();
  });
});
