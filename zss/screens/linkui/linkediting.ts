import { useSyncExternalStore } from 'react'

let editingkey = ''
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function readlinkeditingkey(): string {
  return editingkey
}

export function setlinkeditingkey(key: string): void {
  if (editingkey === key) {
    return
  }
  editingkey = key
  emit()
}

export function clearlinkeditingkey(key?: string): void {
  if (key !== undefined && editingkey !== key) {
    return
  }
  if (editingkey === '') {
    return
  }
  editingkey = ''
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLinkEditingKey(): string {
  return useSyncExternalStore(subscribe, readlinkeditingkey, readlinkeditingkey)
}
