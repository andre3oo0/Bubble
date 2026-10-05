import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audioHandler', () => ({
  default: { play: vi.fn(), stop: vi.fn(), setVolume: vi.fn() },
}));

const { default: audioHandler } = await import('@/lib/audioHandler');
const { useSoundStore } = await import('./soundStore');

describe('useSoundStore', () => {
  beforeEach(() => {
    vi.mocked(audioHandler.play).mockReset();
    useSoundStore.setState({ playing: null, volume: 0.35 });
  });

  it('tracks what is playing', async () => {
    vi.mocked(audioHandler.play).mockResolvedValue(true);
    await useSoundStore.getState().play('ocean');
    expect(useSoundStore.getState().playing).toBe('ocean');

    useSoundStore.getState().stop();
    expect(useSoundStore.getState().playing).toBeNull();
    expect(audioHandler.stop).toHaveBeenCalled();
  });

  it('stays stopped if the browser has no audio support', async () => {
    vi.mocked(audioHandler.play).mockResolvedValue(false);
    await useSoundStore.getState().play('forest');
    expect(useSoundStore.getState().playing).toBeNull();
  });

  it('applies the saved volume before playing', async () => {
    vi.mocked(audioHandler.play).mockResolvedValue(true);
    useSoundStore.getState().setVolume(0.6);
    await useSoundStore.getState().play('sunset');
    expect(audioHandler.setVolume).toHaveBeenLastCalledWith(0.6);
  });
});
