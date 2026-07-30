interface Feature {
  title: string
  image: string
}

const FEATURES: Feature[] = [
  { title: 'Social', image: 'https://picsum.photos/seed/footprint-feature-social/400/400' },
  { title: 'Community', image: 'https://picsum.photos/seed/footprint-feature-community/400/400' },
  { title: 'Share', image: 'https://picsum.photos/seed/footprint-feature-share/400/400' },
  { title: 'Life', image: 'https://picsum.photos/seed/footprint-feature-life/400/400' },
]

function FeatureTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="flex flex-col items-center gap-3 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:scale-105 hover:border-slate-200 hover:shadow-md"
        >
          <div className="aspect-square w-full overflow-hidden rounded-xl">
            <img
              src={feature.image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-base font-medium">{feature.title}</span>
        </div>
      ))}
    </div>
  )
}

export default FeatureTiles
