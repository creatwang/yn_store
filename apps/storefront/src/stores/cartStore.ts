import { atom } from "nanostores"

export const $cartCount = atom<number>(0)

export function incrementCart(by = 1) {
  $cartCount.set($cartCount.get() + by)
}

export function decrementCart(by = 1) {
  $cartCount.set(Math.max(0, $cartCount.get() - by))
}

export function setCartCount(count: number) {
  $cartCount.set(Math.max(0, count))
}
