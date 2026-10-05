import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNDO_MS, useJournalDelete } from './journalDeleteStore';

describe('useJournalDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useJournalDelete.setState({ hidden: [] });
  });
  afterEach(() => vi.useRealTimers());

  it('hides the entry at once and deletes it when the undo window ends', async () => {
    const commit = vi.fn(async () => {});
    useJournalDelete.getState().schedule('a', commit, vi.fn());

    expect(useJournalDelete.getState().hidden).toEqual(['a']);
    expect(commit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(UNDO_MS);
    expect(commit).toHaveBeenCalledOnce();
    expect(useJournalDelete.getState().hidden).toEqual([]);
  });

  it('never deletes once undone', async () => {
    const commit = vi.fn(async () => {});
    useJournalDelete.getState().schedule('a', commit, vi.fn());

    useJournalDelete.getState().undo('a');
    await vi.advanceTimersByTimeAsync(UNDO_MS * 2);

    expect(commit).not.toHaveBeenCalled();
    expect(useJournalDelete.getState().hidden).toEqual([]);
  });

  it('shows the entry again and says so if the delete fails', async () => {
    const onFailed = vi.fn();
    useJournalDelete.getState().schedule('a', async () => {
      throw new Error('offline');
    }, onFailed);

    await vi.advanceTimersByTimeAsync(UNDO_MS);
    expect(onFailed).toHaveBeenCalledOnce();
    expect(useJournalDelete.getState().hidden).toEqual([]);
  });
});
