export const mediaPreviewKey = (text: string | null | undefined) =>
  text === 'Photo' ? ('chat.previewPhoto' as const) : text === 'Video' ? ('chat.previewVideo' as const) : null;
