import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Without `globals: true` in vite.config.ts, RTL's own auto-cleanup
// (which checks for a global `afterEach`) never registers, so unmounted
// components from one test stay in the DOM for the next - do it explicitly.
afterEach(() => {
  cleanup()
})
