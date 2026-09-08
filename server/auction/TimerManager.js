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
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (onTick) onTick(remaining);

      if (remaining <= 0) {
        this.clearTimer(roomId);
        if (onExpire) onExpire();
      }
    }, 1000);

    this.timers.set(roomId, {
      intervalId,
      remaining,
      duration: durationSec,
      onTick,
      onExpire
    });

    if (onTick) onTick(remaining);
  }

  resetTimer(roomId, durationSec) {
    const existing = this.timers.get(roomId);
    if (existing) {
      this.startTimer(roomId, durationSec || existing.duration, existing.onTick, existing.onExpire);
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
