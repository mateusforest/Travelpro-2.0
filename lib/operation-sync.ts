"use client"

export type OperationSyncEvent = {
  source: "chat" | "portal" | "app"
  timestamp: number
}

const OPERATION_SYNC_EVENT = "travelpro:operation-sync"
const OPERATION_SYNC_CHANNEL = "travelpro-operation-sync"

let operationSyncChannel: BroadcastChannel | null = null

function getOperationSyncChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null
  }

  if (!operationSyncChannel) {
    operationSyncChannel = new window.BroadcastChannel(OPERATION_SYNC_CHANNEL)
  }

  return operationSyncChannel
}

export function publishOperationSync(input: Omit<OperationSyncEvent, "timestamp">) {
  if (typeof window === "undefined") {
    return
  }

  const event: OperationSyncEvent = {
    ...input,
    timestamp: Date.now(),
  }

  window.dispatchEvent(new CustomEvent<OperationSyncEvent>(OPERATION_SYNC_EVENT, { detail: event }))
  getOperationSyncChannel()?.postMessage(event)
}

export function subscribeOperationSync(listener: (event: OperationSyncEvent) => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleWindowEvent = (event: Event) => {
    const syncEvent = (event as CustomEvent<OperationSyncEvent>).detail

    if (syncEvent) {
      listener(syncEvent)
    }
  }

  const channel = getOperationSyncChannel()
  const handleChannelEvent = (event: MessageEvent<OperationSyncEvent>) => {
    if (event.data) {
      listener(event.data)
    }
  }

  window.addEventListener(OPERATION_SYNC_EVENT, handleWindowEvent as EventListener)
  channel?.addEventListener("message", handleChannelEvent as EventListener)

  return () => {
    window.removeEventListener(OPERATION_SYNC_EVENT, handleWindowEvent as EventListener)
    channel?.removeEventListener("message", handleChannelEvent as EventListener)
  }
}
