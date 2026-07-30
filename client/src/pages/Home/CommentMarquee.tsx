interface Comment {
  name: string
  text: string
}

const COMMENTS: Comment[] = [
  {
    name: 'Aria K.',
    text: 'Footprint made it so easy to relive our Kyoto trip — every photo and note, right where I left it.',
  },
  {
    name: 'Marcus T.',
    text: 'The Discover feed is my new favorite scroll. So many trips I want to steal ideas from.',
  },
  {
    name: 'Priya S.',
    text: 'I finally have one place for all my travel memories instead of scattered notes apps.',
  },
  {
    name: 'Devon L.',
    text: 'Loved seeing my friends comment on my Iceland trip within minutes of posting it.',
  },
  {
    name: 'Yuki H.',
    text: "Simple, fast, and it doesn't try to be anything more than a great travel journal.",
  },
  {
    name: 'Elena R.',
    text: 'Swiping through the photo carousel on a trip page feels great — smooth and fast.',
  },
  {
    name: 'Tomás F.',
    text: "Marked my Patagonia trip public and got comments from total strangers who'd been there too.",
  },
  {
    name: 'Sam W.',
    text: "Been journaling my trips here for months. Can't imagine going back to a plain notes app.",
  },
]

// Rendered twice back-to-back so a -50% translateX loop is seamless — the
// point where the animation resets is exactly where the second copy already
// sits, so there's no visible jump.
const MARQUEE_ITEMS = [...COMMENTS, ...COMMENTS]

function CommentMarquee() {
  return (
    <div className="overflow-hidden py-8">
      <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
        {MARQUEE_ITEMS.map((comment, i) => (
          <div
            key={`${comment.name}-${i}`}
            className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-600">“{comment.text}”</p>
            <p className="mt-3 text-sm font-medium text-slate-900">
              {comment.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CommentMarquee
