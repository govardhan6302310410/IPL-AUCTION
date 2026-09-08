/**
 * Server-authoritative timer manager for auction rooms.
 */
class TimerManager {
  constructor() {
    this.timers = new Map(); // roomId -> { timerId, remaining, duration, onTick, onExpire }
  }

  startTimer(roomId, durationSec, onTick, onExpire) {
    this.clearTimer(roomId);

    let remaining = durationSec;
    const endTime = Date.now() + durationSec * 1000;

    const intervalId = setInterval(() => {
      remaining -= 1;
      if (onTick) onTick(remaining, endTime);

      if (remaining <= 0) {
        this.clearTimer(roomId);
        if (onExpire) onExpire();
      }
    }, 1000);

    this.timers.set(roomId, {
      intervalId,
      remaining,
      endTime,
      duration: durationSec,
      onTick,
      onExpire
    });

    if (onTick) onTick(remaining, endTime);
  }

  resetTimer(roomId, durationSec) {
    const existing = this.timers.get(roomId);
    if (existing) {
      // Smart Anti-Snipe: If timer already has more than 7s left, keep it running smoothly
      // If it has fewer than 7s left, extend it back to 10s to give franchises time to respond!
      if (existing.remaining < 7) {
        this.startTimer(roomId, 10, existing.onTick, existing.onExpire);
      } else {
        // Just broadcast current status without interrupting the countdown
        if (existing.onTick) existing.onTick(existing.remaining, existing.endTime);
      }
    }
  }

  clearTimer(roomId) {
    const existing = this.timers.get(roomId);
    if (existing && existing.intervalId) {
      clearInterval(existing.intervalId);
    }
    this.timers.delete(roomId);
  }

  getRemaining(roomId) {
    const existing = this.timers.get(roomId);
    return existing ? existing.remaining : 0;
  }
}

export default new TimerManager();
