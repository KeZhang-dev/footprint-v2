const LARGE_PHOTO = 'https://picsum.photos/seed/footprint-hero/600/900'

const SMALL_PHOTOS = [
  'https://picsum.photos/seed/footprint-grid-1/500/500',
  'https://picsum.photos/seed/footprint-grid-2/500/500',
  'https://picsum.photos/seed/footprint-grid-3/500/500',
  'https://picsum.photos/seed/footprint-grid-4/500/500',
  'https://picsum.photos/seed/footprint-grid-5/500/500',
  'https://picsum.photos/seed/footprint-grid-6/500/500',
]

function PhotoShowcase() {
  return (
    <div className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-[1fr_2fr]">
      <div className="group relative overflow-hidden rounded-2xl">
        <img
          src={LARGE_PHOTO}
          alt=""
          className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-110 sm:h-full"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {SMALL_PHOTOS.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-2xl"
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PhotoShowcase
