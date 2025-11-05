'use client';

type Props = {
  src: string;
  title?: string;
  className?: string;
};

export default function Embed({ src, title = 'Embedded page', className }: Props) {
  return (
    <iframe
      src={src}
      title={title}
      // Fyll höjd/bredd – justera efter behov
      className={className ?? 'w-full h-[85vh] border-0'}
      // Sandbox är bra default; ta bort/justera om den inbäddade sidan kräver mer
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      // Tillåt helskärm om det behövs
      allow="fullscreen; geolocation; clipboard-read; clipboard-write"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
