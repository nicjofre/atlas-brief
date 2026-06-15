import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Footer from '../Footer'
import RenderBlocks from '../_blocks/RenderBlocks'
import { RefreshRouteOnSave } from '../_blocks/RefreshRouteOnSave'
import { getPageBySlug } from '@/lib/getPage'
import './build.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Build · Atlas Home Pro',
  description:
    'Atlas Home Builders, Inc. — a California Class B general contracting practice run by an owner-operator. Los Angeles.',
}

export default async function BuildPage() {
  const page = await getPageBySlug('build')
  if (!page) notFound()
  return (
    <>
      <RefreshRouteOnSave />
      <RenderBlocks blocks={page.layout} />
      <Footer />
    </>
  )
}
