export const grabPoster = (file: File): Promise<string | null> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');
    const finish = (poster: string | null) => {
      URL.revokeObjectURL(objectUrl);
      resolve(poster);
    };

    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    probe.src = objectUrl;
    probe.onloadeddata = () => {
      probe.currentTime = Math.min(1, (probe.duration || 2) / 2);
    };
    probe.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = probe.videoWidth;
      canvas.height = probe.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width) return finish(null);
      ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
      try {
        finish(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        finish(null);
      }
    };
    probe.onerror = () => finish(null);
  });
