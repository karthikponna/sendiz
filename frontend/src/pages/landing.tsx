import { Link } from 'react-router'
import { Code2, Layers, RotateCw } from 'lucide-react'
import heroImage from '@/assets/hero-clouds.jpg'
import { CornerFrame, DottedFrame, PageRails } from '@/components/landing/frame'
import { SiteHeader } from '@/components/landing/site-header'
import { FooterBar, Wordmark } from '@/components/landing/wordmark-footer'

const features = [
  {
    icon: Layers,
    title: 'Queued, never blocked',
    text: 'Your request returns in milliseconds. Emails wait in a Redis stream while workers send them in parallel.',
  },
  {
    icon: RotateCw,
    title: 'Retries built in',
    text: 'Temporary SMTP failures are retried automatically. Bounces are marked failed with the exact reason.',
  },
  {
    icon: Code2,
    title: 'A Go SDK that feels native',
    text: 'Create an API key, go get the SDK, and send your first email in a few lines of code.',
  },
]

export function LandingPage() {
  return (
    <PageRails rails={false}>
      <SiteHeader />

      <section className="relative px-2 pt-20">
        {/* Separates the header area from the hero. */}
        <div aria-hidden className="cf-rail-x pointer-events-none absolute inset-x-0 top-[72px]" />
        <div className="relative isolate flex min-h-[640px] items-center justify-center overflow-hidden rounded-2xl bg-cf-bg-raised md:min-h-[720px]">
          <img src={heroImage} alt="" aria-hidden className="absolute inset-0 -z-20 size-full object-cover" />
          {/* Darkens the bright clouds behind the headline so the text stays readable. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(0_0_0/0.5),rgb(0_0_0/0.15))]"
          />

          <div className="flex max-w-[1080px] flex-col items-center gap-10 px-6 py-16 text-center">
            <h1 className="text-balance text-[40px] font-medium leading-[0.99] tracking-[-1.4px] text-cf-fg-strong md:text-[56px]">
              Email infrastructure for developers who ship
            </h1>

            <p className="max-w-xl text-lg leading-snug text-cf-fg-strong/90">
              One API for transactional email. Queue-backed, retried automatically, and tracked in your dashboard.
            </p>

            <Link
              to="/login"
              className="rounded-full border border-cf-cream bg-cf-cream px-6 py-3 font-medium text-cf-ink backdrop-blur-md transition hover:scale-[1.02]"
            >
              Start sending for free
            </Link>
          </div>
        </div>
      </section>

      <DottedFrame>
        <section className="px-6 pt-20">
          <CornerFrame className="mx-auto grid max-w-[1200px] grid-cols-1 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className={i > 0 ? 'border-t border-cf-border p-6 md:border-l md:border-t-0 md:p-8' : 'p-6 md:p-8'}
              >
                <Icon className="size-6 text-cf-fg" strokeWidth={1.5} />
                <h3 className="mt-2 pb-1 pt-2 text-lg font-medium tracking-[-0.45px]">{title}</h3>
                <p className="leading-[1.3] text-cf-fg-muted">{text}</p>
              </div>
            ))}
          </CornerFrame>
        </section>
        <Wordmark />
      </DottedFrame>

      <FooterBar />
    </PageRails>
  )
}
