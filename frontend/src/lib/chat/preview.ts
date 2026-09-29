/**
 * MessageService stores these English words as the thread preview of a photo or a video message (a thread list has no
 * picture to show). Map them to a key so every reader sees them in their own language; any other text is the message's
 * own words and is shown as sent.
 */
export const mediaPreviewKey = (text: string | null | undefined) =>
  text === 'Photo' ? ('chat.previewPhoto' as const) : text === 'Video' ? ('chat.previewVideo' as const) : null;
