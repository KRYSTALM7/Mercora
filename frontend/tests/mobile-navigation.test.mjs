import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sidebar = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8')
const dashboardLayout = await readFile(new URL('../src/app/dashboard/layout.tsx', import.meta.url), 'utf8')
const globalStyles = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8')

test('mobile navigation is a closed drawer until its menu button is opened', () => {
  assert.match(sidebar, /useState\(false\)/)
  assert.match(sidebar, /aria-expanded=\{mobileOpen\}/)
  assert.match(sidebar, /onClick=\{\(\) => setMobileOpen\(\(open\) => !open\)\}/)
  assert.match(sidebar, /mobileOpen \? 'translate-x-0' : 'translate-x-full'/)
  assert.match(sidebar, /aria-hidden=\{!mobileOpen\} inert=\{!mobileOpen\}/)
})

test('mobile navigation closes after navigation, on Escape, and from the backdrop', () => {
  assert.match(sidebar, /useEffect\(\(\) => setMobileOpen\(false\), \[pathname\]\)/)
  assert.match(sidebar, /event\.key === 'Escape'/)
  assert.match(sidebar, /Close navigation menu.*onClick=\{\(\) => setMobileOpen\(false\)\}/s)
  assert.match(sidebar, /Navigation onNavigate=\{\(\) => setMobileOpen\(false\)\}/)
})

test('desktop sidebar visibility is controlled by the responsive utility, not the helper', () => {
  assert.match(sidebar, /container-sidebar hidden w-64[^"']*md:flex/)
  const helper = globalStyles.match(/\.container-sidebar\s*\{([^}]*)\}/)?.[1] ?? ''
  assert.doesNotMatch(helper, /(?:^|\s)flex(?:\s|;)/)
  assert.match(helper, /flex-col/)
})

test('dashboard content can shrink to the mobile viewport width', () => {
  assert.match(dashboardLayout, /flex min-w-0 flex-1 flex-col/)
  assert.match(dashboardLayout, /main className="min-w-0 flex-1/)
})
