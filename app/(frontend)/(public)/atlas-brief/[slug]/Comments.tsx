'use client'

import { Comments as HyvorComments } from '@hyvor/hyvor-talk-react'

// Hyvor Talk comments for freeform posts. website-id is the public Atlas Brief
// site id from the Hyvor console; page-id is the post slug so each post gets its
// own thread. Moderation (hold-for-approval) is configured in the Hyvor console.
const HYVOR_WEBSITE_ID = 15635 // Atlas Brief website in the Hyvor Talk console

export default function Comments({ slug, title }: { slug: string; title?: string | null }) {
  if (!HYVOR_WEBSITE_ID) return null
  return (
    <section className="post-comments">
      <div className="wrap">
        <div className="pc-head">Comments</div>
        <HyvorComments
          website-id={HYVOR_WEBSITE_ID}
          page-id={slug}
          page-title={title ?? undefined}
          colors="light"
          loading="lazy"
        />
      </div>
    </section>
  )
}
