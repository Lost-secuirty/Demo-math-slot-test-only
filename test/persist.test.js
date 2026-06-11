import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSettings, saveSettings } from '../src/persist.js';
import { STORAGE_KEY } from '../src/config.js';

// Minimal in-memory localStorage stand-in (vitest runs in node, no DOM).
function mockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

describe('persist (player settings)', () => {
  beforeEach(() => {
    globalThis.localStorage = mockStorage();
  });
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('returns the provided defaults when nothing is stored', () => {
    expect(loadSettings({ volume: 0.5, muted: false, theme: 'classic' })).toEqual({
      volume: 0.5,
      muted: false,
      theme: 'classic',
    });
  });

  it('round-trips saved settings across a load', () => {
    saveSettings({ volume: 0.8, muted: true, theme: 'spokey' });
    expect(loadSettings({ volume: 0.5 })).toMatchObject({
      volume: 0.8,
      muted: true,
      theme: 'spokey',
    });
  });

  it('merges a patch over previously stored values', () => {
    saveSettings({ volume: 0.3, theme: 'classic' });
    saveSettings({ theme: 'spokey' });
    const got = loadSettings();
    expect(got.volume).toBe(0.3); // untouched by the second patch
    expect(got.theme).toBe('spokey'); // overwritten
  });

  it('falls back to defaults on corrupt JSON instead of throwing', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(() => loadSettings({ volume: 0.5 })).not.toThrow();
    expect(loadSettings({ volume: 0.5 })).toEqual({ volume: 0.5 });
  });

  it('degrades gracefully when localStorage is unavailable', () => {
    delete globalThis.localStorage;
    expect(loadSettings({ volume: 0.42 })).toEqual({ volume: 0.42 });
    expect(() => saveSettings({ volume: 0.9 })).not.toThrow();
    expect(saveSettings({ volume: 0.9 })).toMatchObject({ volume: 0.9 });
  });
});
