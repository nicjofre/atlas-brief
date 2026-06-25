import Link from 'next/link'
import SignOutButton from './SignOutButton'

type NavKey = 'listings' | 'articles' | 'explore' | 'dashboard' | 'prompts' | 'pages' | 'dispatch'

const ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: 'listings', href: '/listings', label: 'Database' },
  { key: 'dashboard', href: '/dashboard', label: 'Input' },
  { key: 'explore', href: '/explore', label: 'Explore' },
  { key: 'articles', href: '/articles', label: 'Articles' },
  { key: 'dispatch', href: '/dispatch', label: 'Dispatch' },
  { key: 'prompts', href: '/admin/prompts', label: 'Prompts' },
  { key: 'pages', href: '/cms', label: 'Pages' },
]

export default function InternalNav({ active }: { active?: NavKey }) {
  return (
    <div style={{ borderBottom: '1px solid #ddd', padding: '16px 32px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <Link href="/listings" style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#111', textDecoration: 'none' }}>
          Atlas <em>Brief</em>
        </Link>
        {ITEMS.map(item => {
          const isActive = item.key === active
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: isActive ? '#111' : '#666',
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid #9A6B3F' : '2px solid transparent',
                paddingBottom: 2,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <SignOutButton />
    </div>
  )
}
