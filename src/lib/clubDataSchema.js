export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateClubDataRoot(value) {
  if (!isRecord(value) || !isRecord(value.club) || !isRecord(value.stats)) {
    throw new TypeError('The server returned invalid club data')
  }
  if (typeof value.club.id !== 'string' || !value.club.id.trim() ||
      typeof value.club.name !== 'string' || !value.club.name.trim()) {
    throw new TypeError('Invalid club data: club identity is missing')
  }
  return value
}

export function readRecords(value, path, requiredStrings = []) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new TypeError(`Invalid club data: ${path} must be an array`)
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new TypeError(`Invalid club data: ${path}[${index}] must be an object`)
    for (const key of requiredStrings) {
      if (typeof entry[key] !== 'string' || !entry[key].trim()) {
        throw new TypeError(`Invalid club data: ${path}[${index}].${key} is required`)
      }
    }
    return entry
  })
}

export function readStrings(value, path) {
  if (value == null) return []
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new TypeError(`Invalid club data: ${path} must contain strings`)
  }
  return value
}
