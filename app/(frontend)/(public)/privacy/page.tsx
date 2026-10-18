import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import Footer from '../Footer'
import './privacy.css'

// /privacy — added 2026-10-18. Meta won't run lead ads without a public
// privacy policy URL, so this covers what the lead forms and site signups
// collect, what it's used for, and how to opt out or be deleted. Plain static
// copy; edit here.

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy · Atlas Brief',
  description: 'What Atlas Brief collects, how it is used, and how to opt out or have your information deleted.',
  path: '/privacy',
})

const UPDATED = 'October 18, 2026'

export default function PrivacyPage() {
  return (
    <>
      <main className="wrap privacy">
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated {UPDATED}</p>

        <p>
          Atlas Brief (atlasbrief.la) is a journal of Los Angeles real estate published by David Safai. This
          policy explains what information we collect, how we use it, and how you can opt out or have it deleted.
        </p>

        <h2>What we collect</h2>
        <p>When you sign up through our website or through a lead form on Facebook or Instagram, we collect:</p>
        <ul>
          <li>Your name</li>
          <li>Your email address</li>
          <li>Your phone number, if the form asks for it</li>
          <li>Any other answers you choose to give on the form, such as your role in real estate</li>
        </ul>
        <p>
          Like most websites, we also use cookies and similar tools from Google, Meta and LinkedIn to measure
          visits and the performance of our ads. These record things like the pages you view and the ad that
          brought you here. They do not give us your name or contact details.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To send you the Atlas Brief newsletter</li>
          <li>To follow up with you about Atlas Brief and the services you asked about</li>
          <li>To understand which articles and ads are useful, so we can improve them</li>
        </ul>

        <h2>What we don&rsquo;t do</h2>
        <p>
          We do not sell your personal information, and we do not share it with anyone for their own marketing.
          We share it only with the service providers that help us run Atlas Brief, such as our email delivery
          and website hosting providers, and only so they can provide those services to us.
        </p>

        <h2>Opting out and deleting your information</h2>
        <p>
          Every newsletter email has an unsubscribe link, and you can use it at any time. To stop all contact,
          see what we hold about you, or have your information deleted, email{' '}
          <a href="mailto:david@atlasbrief.la">david@atlasbrief.la</a>. We will take care of it promptly. If you
          live in California, you have the right to know what personal information we collect and to ask us to
          delete it, and we will not treat you differently for asking.
        </p>

        <h2>How long we keep it</h2>
        <p>We keep your information while you are subscribed or in contact with us, and delete it when you ask.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we will post the new version on this page with a new date.</p>

        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href="mailto:david@atlasbrief.la">david@atlasbrief.la</a>
        </p>
      </main>
      <Footer />
    </>
  )
}
