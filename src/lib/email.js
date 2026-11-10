const NIT_DOMAIN = '@nitjsr.ac.in'

export function isNitEmail(email) {
  return /^[^\s@]+@nitjsr\.ac\.in$/i.test(String(email).trim())
}

export function nitEmailHint() {
  return `Use your official NIT Jamshedpur email (${NIT_DOMAIN}).`
}

export { NIT_DOMAIN }
