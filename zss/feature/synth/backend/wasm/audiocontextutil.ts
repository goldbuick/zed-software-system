export function isofflineaudiocontext(
  ctx: BaseAudioContext,
): ctx is OfflineAudioContext {
  return 'length' in ctx
}
