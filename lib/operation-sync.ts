"use client"

type OperationSyncDetail = {
  source?: "chat" | "portal" | "support" | "master" | "app"
  timestamp: number
}

const EVENT_NAME = "travelpro:operation-sync"
const CHANNEL_NAME = "travelpro-operation-sync"

function buildDetail(source?: OperationSyncDetail["source"]): OperationSyncDetail {
  return {
    source,
    timestamp: Date.now(),
  }
}

export function publishOperationSync({
  source,
}: {
  source?: OperationSyncDetail["source"]
} = {}) {
  if (typeof window === "undefined") {
    return
  }

  const detail = buildDetail(source)
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }))

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(detail)
    channel.close()
  }
}

export function subscribeOperationSync(listener: (detail: OperationSyncDetail) => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleWindowEvent = (event: Event) => {
    const customEvent = event as CustomEvent<OperationSyncDetail>
    listener(customEvent.detail ?? buildDetail())
  }

  window.addEventListener(EVENT_NAME, handleWindowEvent)

  let channel: BroadcastChannel | null = null
  let handleMessage: ((event: MessageEvent<OperationSyncDetail>) => void) | null = null

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME)
    handleMessage = (event: MessageEvent<OperationSyncDetail>) => {
      listener(event.data ?? buildDetail())
    }
    channel.addEventListener("message", handleMessage)
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleWindowEvent)
    if (channel && handleMessage) {
      channel.removeEventListener("message", handleMessage)
      channel.close()
    }
  }
}
