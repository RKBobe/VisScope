// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RoomInspectionDrawer } from '../RoomInspectionDrawer';
import { INITIAL_ROOMS } from '../../../services/storage/projectStore';
import { PRAIRIE_VILLAGE_COST_INDEX } from '../../../services/math/valuation';

describe('RoomInspectionDrawer Component', () => {
  afterEach(() => {
    cleanup();
  });

  const room = INITIAL_ROOMS[0]; // Living Room

  it('does not render when room is null', () => {
    render(
      <RoomInspectionDrawer
        room={null}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={() => {}}
        onDeleteRoom={() => {}}
      />
    );
    expect(screen.queryByDisplayValue('Living Room')).toBeNull();
  });

  it('renders room properties, dimensions, and deficiencies when room is provided', () => {
    render(
      <RoomInspectionDrawer
        room={room}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={() => {}}
        onDeleteRoom={() => {}}
      />
    );

    expect(screen.getByDisplayValue('Living Room')).toBeDefined();
    expect(screen.getByText(/Dimensions & Wall Areas/i)).toBeDefined();
    expect(screen.getByDisplayValue('20')).toBeDefined(); // length
    expect(screen.getByDisplayValue('16')).toBeDefined(); // width
    expect(screen.getByDisplayValue('9')).toBeDefined();  // height
    expect(screen.getByText(/Replace 40 LF of baseboard/i)).toBeDefined();
  });

  it('updates room name when typing in header input', () => {
    const handleUpdateRoom = vi.fn();
    render(
      <RoomInspectionDrawer
        room={room}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={handleUpdateRoom}
        onDeleteRoom={() => {}}
      />
    );

    const nameInput = screen.getByDisplayValue('Living Room');
    fireEvent.change(nameInput, { target: { value: 'Great Room' } });

    expect(handleUpdateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Great Room' })
    );
  });

  it('allows adding a manual defect item', () => {
    const handleUpdateRoom = vi.fn();
    render(
      <RoomInspectionDrawer
        room={room}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={handleUpdateRoom}
        onDeleteRoom={() => {}}
      />
    );

    // Click Manual Item button
    const addDefectBtn = screen.getByText(/^Manual Item$/i);
    fireEvent.click(addDefectBtn);

    const descInput = screen.getByPlaceholderText(/e\.g\. Baseboard trim replacement/i);
    fireEvent.change(descInput, { target: { value: 'Custom trim repair' } });

    const submitBtn = screen.getByText(/^Save Line Item$/i);
    fireEvent.click(submitBtn);

    expect(handleUpdateRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        deficiencies: expect.arrayContaining([
          expect.objectContaining({ description: expect.stringContaining('Custom trim repair') }),
        ]),
      })
    );
  });

  it('allows adding a wall opening (door / window)', () => {
    const handleUpdateRoom = vi.fn();
    render(
      <RoomInspectionDrawer
        room={room}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={handleUpdateRoom}
        onDeleteRoom={() => {}}
      />
    );

    const addOpeningBtn = screen.getByText(/^Add Opening$/i);
    fireEvent.click(addOpeningBtn);

    const attachOpeningBtn = screen.getByText(/^Attach Opening$/i);
    fireEvent.click(attachOpeningBtn);

    expect(handleUpdateRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        openings: expect.arrayContaining([
          expect.objectContaining({ type: 'door' }),
        ]),
      })
    );
  });

  it('calls onDeleteRoom when clicking Delete Room button', () => {
    const handleDeleteRoom = vi.fn();
    render(
      <RoomInspectionDrawer
        room={room}
        costIndex={PRAIRIE_VILLAGE_COST_INDEX}
        onClose={() => {}}
        onUpdateRoom={() => {}}
        onDeleteRoom={handleDeleteRoom}
      />
    );

    const deleteRoomBtn = screen.getByText(/Delete Room/i);
    fireEvent.click(deleteRoomBtn);

    expect(handleDeleteRoom).toHaveBeenCalledWith(room.id);
  });
});
