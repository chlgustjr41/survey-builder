/**
 * Firebase RTDB rejects writes that contain `undefined` values, NaN, or
 * ±Infinity.  Run any payload through this before calling set() or update().
 *
 * Uses a JSON round-trip so:
 *   - `undefined` properties are silently dropped  (JSON.stringify omits them)
 *   - NaN / ±Infinity are replaced with 0         (via the replacer)
 *   - Arrays, nested objects, null, and booleans  are preserved as-is
 */
export function sanitizeForFirebase<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === 'number' && !isFinite(value)) return 0  // NaN / ±Infinity → 0
      return value                                                  // undefined stripped automatically
    })
  ) as T
}
