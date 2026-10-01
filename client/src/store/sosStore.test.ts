import { beforeEach, describe, expect, it } from 'vitest';
import { useSosStore } from './sosStore';

describe('useSosStore', () => {
  beforeEach(() => {
    useSosStore.setState({ isOpen: false, autoOpened: false });
  });

  it('auto-opens on the first crisis only', () => {
    useSosStore.getState().openForCrisis();
    expect(useSosStore.getState().isOpen).toBe(true);

    useSosStore.getState().close();
    useSosStore.getState().openForCrisis();
    expect(useSosStore.getState().isOpen).toBe(false);
  });

  it('can always be opened by hand', () => {
    useSosStore.getState().openForCrisis();
    useSosStore.getState().close();

    useSosStore.getState().open();
    expect(useSosStore.getState().isOpen).toBe(true);
  });
});
