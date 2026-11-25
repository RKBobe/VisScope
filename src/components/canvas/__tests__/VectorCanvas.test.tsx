// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VectorCanvas } from '../VectorCanvas';
import { INITIAL_ROOMS } from '../../../services/storage/projectStore';

describe('VectorCanvas Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders room elements, measurement banner, and toolbar', () => {
    const handleSelectRoom = vi.fn();
    const handleUpdateRoomPos = vi.fn();
    const handleUpdateRoomDim = vi.fn();
    const handleDeleteRoom = vi.fn();
    const handleToggleAnsi = vi.fn();

    render(
      <VectorCanvas
        rooms={INITIAL_ROOMS}
        activeRoomId={null}
        onSelectRoom={handleSelectRoom}
        onUpdateRoomPosition={handleUpdateRoomPos}
        onUpdateRoomDimensions={handleUpdateRoomDim}
        onDeleteRoom={handleDeleteRoom}
        showAnsiBuffer={true}
        onToggleAnsiBuffer={handleToggleAnsi}
      />
    );

    expect(screen.getByTitle('Zoom In')).toBeDefined();
    expect(screen.getByTitle('Zoom Out')).toBeDefined();
    expect(screen.getByTitle('Fit Floor Plan')).toBeDefined();
    expect(screen.getByTitle('Toggle 1-ft Snapping Grid')).toBeDefined();
    expect(screen.getByTitle('Toggle ANSI Z765 Exterior Shell Buffer')).toBeDefined();

    // Verify room labels are in the document
    expect(screen.getByText('Living Room')).toBeDefined();
    expect(screen.getByText('Kitchen / Dining')).toBeDefined();
    expect(screen.getByText('Primary Bedroom')).toBeDefined();

    // Verify ANSI measurement banner
    expect(screen.getByText(/ANSI GLA:/i)).toBeDefined();
  });

  it('selects a room when clicking on its SVG node', () => {
    const handleSelectRoom = vi.fn();

    render(
      <VectorCanvas
        rooms={INITIAL_ROOMS}
        activeRoomId={null}
        onSelectRoom={handleSelectRoom}
        onUpdateRoomPosition={() => {}}
        onUpdateRoomDimensions={() => {}}
        onDeleteRoom={() => {}}
        showAnsiBuffer={true}
        onToggleAnsiBuffer={() => {}}
      />
    );

    const livingRoomText = screen.getByText('Living Room');
    fireEvent.pointerDown(livingRoomText);

    expect(handleSelectRoom).toHaveBeenCalledWith('room-1');
  });

  it('toggles ANSI buffer via toolbar button', () => {
    const handleToggleAnsi = vi.fn();

    render(
      <VectorCanvas
        rooms={INITIAL_ROOMS}
        activeRoomId={null}
        onSelectRoom={() => {}}
        onUpdateRoomPosition={() => {}}
        onUpdateRoomDimensions={() => {}}
        onDeleteRoom={() => {}}
        showAnsiBuffer={true}
        onToggleAnsiBuffer={handleToggleAnsi}
      />
    );

    const ansiBtn = screen.getByTitle('Toggle ANSI Z765 Exterior Shell Buffer');
    fireEvent.click(ansiBtn);

    expect(handleToggleAnsi).toHaveBeenCalled();
  });

  it('deletes active room when clicking trash zone', () => {
    const handleDeleteRoom = vi.fn();

    render(
      <VectorCanvas
        rooms={INITIAL_ROOMS}
        activeRoomId="room-1"
        onSelectRoom={() => {}}
        onUpdateRoomPosition={() => {}}
        onUpdateRoomDimensions={() => {}}
        onDeleteRoom={handleDeleteRoom}
        showAnsiBuffer={true}
        onToggleAnsiBuffer={() => {}}
      />
    );

    const deleteTarget = screen.getByText('Delete Selected');
    fireEvent.click(deleteTarget);

    expect(handleDeleteRoom).toHaveBeenCalledWith('room-1');
  });

  it('toggles Wall-by-Wall Sketch Mode, draws walls via keyboard + Pop Point, and commits closed area', () => {
    const handleCompleteSketch = vi.fn();

    render(
      <VectorCanvas
        rooms={INITIAL_ROOMS}
        activeRoomId={null}
        onSelectRoom={() => {}}
        onUpdateRoomPosition={() => {}}
        onUpdateRoomDimensions={() => {}}
        onDeleteRoom={() => {}}
        showAnsiBuffer={true}
        onToggleAnsiBuffer={() => {}}
        onCompleteSketch={handleCompleteSketch}
      />
    );

    // Switch to Sketch Mode
    fireEvent.click(screen.getByText('Sketch Mode'));
    expect(screen.getByText('Start Here')).toBeDefined();

    // Set Area Name
    const nameInput = screen.getByLabelText('Sketch Area Name');
    fireEvent.change(nameInput, { target: { value: 'Main Floor GLA' } });

    // Drop start anchor
    fireEvent.click(screen.getByText('Start Here'));

    // Draw 20 ft Right using Length Input + ArrowRight
    const lenInput = screen.getByLabelText('Wall Length in Feet');
    fireEvent.change(lenInput, { target: { value: '20' } });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Draw 16 ft Down using Length Input + ArrowDown
    fireEvent.change(lenInput, { target: { value: '16' } });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Pop Point Left (empty length + ArrowLeft) -> aligns with start X
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    // Close Area via 'C' key
    fireEvent.keyDown(window, { key: 'c' });

    expect(handleCompleteSketch).toHaveBeenCalledTimes(1);
    const payload = handleCompleteSketch.mock.calls[0][0];
    expect(payload.name).toBe('Main Floor GLA');
    expect(payload.floor_area_sqft).toBe(320);
    expect(payload.polygon_points.length).toBe(4);
  });
});
