import { describe, expect, it } from 'vitest';
import { mediaPreviewKey } from './preview';

describe('mediaPreviewKey', () => {
  /** The server writes "Photo"/"Video" in English for every reader; the list shows them translated. */
  it('maps the photo and video previews to their keys', () => {
    expect(mediaPreviewKey('Photo')).toBe('chat.previewPhoto');
    expect(mediaPreviewKey('Video')).toBe('chat.previewVideo');
  });

  it('leaves ordinary text and an empty preview alone', () => {
    expect(mediaPreviewKey('Photo of the greens?')).toBeNull();
    expect(mediaPreviewKey(null)).toBeNull();
    expect(mediaPreviewKey(undefined)).toBeNull();
  });
});
