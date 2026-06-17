import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import './about.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'About · Atlas Brief',
  description:
    'Atlas is a Los Angeles real estate practice with three sides: Atlas Brief (publication), Atlas Home Builders, Inc. (general contractor), and Atlas Home Pro (acquisitions).',
}

export default async function AboutPage() {
  const page = await getPageBySlug('about')
  if (!page) notFound()
  return (
    <>
      <RefreshRouteOnSave />
      <RenderBlocks blocks={page.layout} />
      <Footer />
    </>
  )
}
