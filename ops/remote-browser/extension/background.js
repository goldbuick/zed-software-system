chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'streamid') {
    return
  }
  const consumertabid = sender.tab && sender.tab.id
  chrome.tabCapture
    .getMediaStreamId({
      targetTabId: msg.targetTabId,
      consumerTabId: consumertabid,
    })
    .then((id) => sendResponse({ id }))
    .catch((err) => sendResponse({ error: String(err) }))
  return true
})
