import { customAlphabet } from "nanoid"

const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  26
)

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`
}
