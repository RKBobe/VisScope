// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { GeminiSettingsModal } from '../GeminiSettingsModal';
import { GeminiConnectionConfig } from '../../../services/ai/geminiClient';
import * as geminiClient from '../../../services/ai/geminiClient';

describe('GeminiSettingsModal Component', () => {
  beforeEach(() => {
    vi.spyOn(geminiClient, 'checkServerGeminiEnvStatus').mockResolvedValue({
      configured: false,
      proxyAvailable: false,
      model: 'gemini-3.0-flash',
    });
    vi.spyOn(geminiClient, 'clearStoredGeminiKey').mockResolvedValue({
      apiKey: '',
      model: 'gemini-3.0-flash',
      enabled: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const sampleConfig: GeminiConnectionConfig = {
    apiKey: 'test-api-key',
    model: 'gemini-3.0-pro',
    enabled: true,
    proxyUrl: '/api/gemini',
  };

  it('does not render when closed', () => {
    render(
      <GeminiSettingsModal
        isOpen={false}
        onClose={() => {}}
        config={sampleConfig}
        onSaveConfig={() => {}}
      />
    );
    expect(screen.queryByText(/Gemini Multimodal AI Adapter/i)).toBeNull();
  });

  it('renders settings fields and allows saving changes', () => {
    const handleSaveConfig = vi.fn();
    const handleClose = vi.fn();

    render(
      <GeminiSettingsModal
        isOpen={true}
        onClose={handleClose}
        config={sampleConfig}
        onSaveConfig={handleSaveConfig}
      />
    );

    expect(screen.getByText(/Gemini Multimodal AI Adapter/i)).toBeDefined();
    const apiKeyInput = screen.getByDisplayValue('test-api-key');
    expect(apiKeyInput).toBeDefined();

    const saveBtn = screen.getByText(/^Save Gemini Settings$/i);
    fireEvent.click(saveBtn);

    expect(handleSaveConfig).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows clearing API key', async () => {
    const handleSaveConfig = vi.fn();

    render(
      <GeminiSettingsModal
        isOpen={true}
        onClose={() => {}}
        config={sampleConfig}
        onSaveConfig={handleSaveConfig}
      />
    );

    const clearKeyBtn = screen.getByText(/Clear Key/i);
    fireEvent.click(clearKeyBtn);

    await waitFor(() => {
      expect(handleSaveConfig).toHaveBeenCalled();
    });
  });
});
