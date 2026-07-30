import Hero from './Hero'
import PhotoShowcase from './PhotoShowcase'
import CommentMarquee from './CommentMarquee'
import FeatureTiles from './FeatureTiles'

function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <PhotoShowcase />
      <CommentMarquee />
      <FeatureTiles />
    </div>
  )
}

export default Home
