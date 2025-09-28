// Put these helpers inside your component (above the return)

const EPS = 0.01;

export const seekAsync = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((resolve) => {
    const onSeeked = () => {
      v.removeEventListener("seeked", onSeeked);
      resolve();
    };
    v.addEventListener("seeked", onSeeked);
    v.currentTime = t;
  });

export const playSafe = async (v: HTMLVideoElement) => {
  try {
    await v.play();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.name === "NotAllowedError" || err?.name === "AbortError") {
      const wasMuted = v.muted;
      v.muted = true;
      try {
        await v.play();
      } finally {
        // restore mute state after a tick (let playback start)
        setTimeout(() => {
          v.muted = wasMuted;
        }, 0);
      }
    } else {
      throw err;
    }
  }
};

export const waitUntilTime = (v: HTMLVideoElement, endTime: number) =>
  new Promise<void>((resolve) => {
    const onUpdate = () => {
      if (v.currentTime >= endTime - EPS) {
        v.pause();
        v.removeEventListener("timeupdate", onUpdate);
        resolve();
      }
    };
    v.addEventListener("timeupdate", onUpdate);
  });
