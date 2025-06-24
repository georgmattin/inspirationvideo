"use client"

import { useState } from "react"
import { Play, ExternalLink, Hash, Eye, Heart, MessageCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Video } from "@/app/page"

interface VideoCardProps {
  video: Video
}

export function VideoCard({ video }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handleOpenOriginal = () => {
    window.open(video.url, "_blank")
  }

  // Determine if video should use vertical aspect ratio
  const isVertical = video.isShort || video.platform === "tiktok"

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Video Area - Dynamic Height based on video type */}
        <div className={`relative bg-muted flex-shrink-0 ${isVertical ? "aspect-[9/16]" : "aspect-[16/9]"}`}>
          {isPlaying ? (
            <iframe
              src={video.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 relative">
              <Button size="lg" className="rounded-full w-16 h-16" onClick={handlePlay}>
                <Play className="h-6 w-6 fill-current" />
              </Button>

              {/* Video type indicator */}
              <div className="absolute top-2 left-2 flex gap-1">
                {video.isShort && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    Short
                  </Badge>
                )}
                {video.platform === "tiktok" && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    TikTok
                  </Badge>
                )}
              </div>

              {/* Duration indicator */}
              {video.duration && video.duration > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(video.duration)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Info - Below Video */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{video.title}</h3>
            <Button variant="ghost" size="sm" onClick={handleOpenOriginal} className="h-6 w-6 p-0 flex-shrink-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {video.author && (
            <p className="text-xs text-muted-foreground mb-2">
              <span className="capitalize">{video.platform}</span> • {video.author}
            </p>
          )}

          {/* Statistics */}
          {video.stats && (
            <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
              {video.stats.views > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{video.stats.viewsFormatted || video.stats.views.toLocaleString()}</span>
                </div>
              )}
              {video.stats.likes > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{video.stats.likesFormatted || video.stats.likes.toLocaleString()}</span>
                </div>
              )}
              {video.stats.comments > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{video.stats.commentsFormatted || video.stats.comments.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {video.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{video.description}</p>}

          {video.hashtags && video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {video.hashtags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                  <Hash className="h-2.5 w-2.5 mr-0.5" />
                  {tag}
                </Badge>
              ))}
              {video.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{video.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
