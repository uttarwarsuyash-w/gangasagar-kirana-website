import Link from 'next/link'

export function SectionHead({ no, title, lede, link, linkLabel, className = '', id }: { no?: string; title: string; lede?: string; link?: string; linkLabel?: string; className?: string; id?: string }) {
  return (
    <div className={`grid gap-4 md:grid-cols-12 md:items-end ${className}`}>
      <div className="md:col-span-8">
        {no && <p className="section-no mb-3">{no}</p>}
        <h2 id={id} className="display-m max-w-[18ch] text-balance">
          {title}
        </h2>
      </div>
      <div className="md:col-span-4 md:pb-2">
        {lede && <p className="text-muted md:text-[1.05rem]">{lede}</p>}
        {link && linkLabel && (
          <Link href={link} className="link-u mt-3 inline-block font-semibold">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
