import axios from 'axios'
import { currentTime } from './date'

function formatPrefixes(prefixes: string[]): string {
  return prefixes.map((prefix) => `[${prefix}]`).join('')
}

export function log(prefixes: string[], message: string): void {
  const prefix = prefixes.length > 0 ? `${formatPrefixes(prefixes)} ` : ''
  console.log(`${currentTime()} ${prefix}${message}`)
}

export function logError(prefixes: string[], message: string, err?: unknown): void {
  const prefix = prefixes.length > 0 ? `${formatPrefixes(prefixes)} ` : ''
  if (err === undefined) {
    console.error(`${currentTime()} ${prefix}${message}`)
    return
  }
  const detail = axios.isAxiosError(err)
    ? (err.response?.data ?? err.message)
    : err instanceof Error
      ? err.message
      : err
  console.error(`${currentTime()} ${prefix}${message}`, detail)
}
