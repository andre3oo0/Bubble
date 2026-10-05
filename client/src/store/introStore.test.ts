import { beforeEach, describe, expect, it, vi } from 'vitest';

// The tests run in Node, so give the store somewhere to persist
const saved = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => saved.set(key, value),
  removeItem: (key: string) => saved.delete(key),
});

const { useIntroStore } = await import('./introStore');

describe('useIntroStore', () => {
  beforeEach(() => {
    useIntroStore.setState({ seen: false, isOpen: false });
  });

  it('is marked seen once finished, skipped or closed', () => {
    useIntroStore.getState().open();
    expect(useIntroStore.getState().isOpen).toBe(true);

    useIntroStore.getState().finish();
    expect(useIntroStore.getState()).toMatchObject({ isOpen: false, seen: true });
  });

  it('remembers only that it was seen, not that it was open', () => {
    useIntroStore.getState().open();
    useIntroStore.getState().finish();
    useIntroStore.getState().open();

    expect(JSON.parse(saved.get('bubble-intro')!).state).toEqual({ seen: true });
  });
});
