// =====================================================================
// persist.js — the ONLY module that touches localStorage. Keeps player
// settings (volume / mute / theme) across reloads. Pixi-free and pure so
// it stays unit-testable and the render/pure firewall holds (AGENTS.md).
//
// Every access is wrapped: localStorage throws in private mode / sandboxed
// iframes, and a corrupt value must never crash boot — we degrade to the
// caller's defaults instead.
// =====================================================================

import { STORAGE_KEY } from './config.js';

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // access itself can throw (private mode / blocked cookies)
  }
}

// Load persisted settings, shallow-merged over `defaults`. Unknown/extra keys
// in storage are ignored; a missing or corrupt blob yields `defaults`.
export function loadSettings(defaults = {}) {
  const s = storage();
  if (!s) return { ...defaults };
  let raw;
  try {
    raw = s.getItem(STORAGE_KEY);
  } catch {
    return { ...defaults };
  }
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...defaults };
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults }; // corrupt JSON — fall back, don't throw
  }
}

// Merge `patch` into the stored blob and write it back. Returns the merged
// object (or the patch alone if storage is unavailable) so callers can use it
// even when persistence silently no-ops.
export function saveSettings(patch = {}) {
  const s = storage();
  const current = loadSettings();
  const merged = { ...current, ...patch };
  if (!s) return merged;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // quota / private mode — accept the in-memory value, skip persistence
  }
  return merged;
}
