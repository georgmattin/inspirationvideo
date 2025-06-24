import { VideoCard } from "./video-card"
import type { Video } from "@/app/page"

interface VideoGridProps {
  videos: Video[]
}

export function VideoGrid({ videos }: VideoGridProps) {
  // Show max 20 videos
  const displayVideos = videos.slice(0, 20)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 auto-rows-max">
      {displayVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}
