/** 对齐 Medusa draft-order plugin v2.15.3 */
export function convertNumber(value?: string | number) {
  return typeof value === "string"
    ? Number(value.replace(",", "."))
    : value
}
