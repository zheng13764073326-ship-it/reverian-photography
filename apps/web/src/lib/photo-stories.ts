/** Keep archive statistics and the on-photo note mark in agreement. */
export function hasPhotoStory(caption?: string): boolean {
 const text = caption?.trim() || '';
 return Boolean(text) && !/^拍摄于[^。！？!?\r\n]+[。.]?$/.test(text);
}
