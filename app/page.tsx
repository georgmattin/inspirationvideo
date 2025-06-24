"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VideoGrid } from "@/components/video-grid"
import { AddVideoDialog } from "@/components/add-video-dialog"

export interface VideoStats {
  views: number
  likes: number
  comments: number
  shares?: number
  viewsFormatted?: string
  likesFormatted?: string
  commentsFormatted?: string
}

export interface Video {
  id: string
  title: string
  description?: string
  hashtags?: string[]
  author?: string
  url: string
  embedUrl: string
  platform: "youtube" | "tiktok"
  thumbnail?: string
  stats?: VideoStats
  publishedAt?: string
  channelId?: string
  duration?: number
  isShort?: boolean
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const addVideo = (video: Video) => {
    setVideos((prev) => [video, ...prev])
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inspiratsioonivideod</h1>
            <p className="text-muted-foreground mt-2">Salvesta ja vaata oma lemmik YouTube'i ja TikToki videoid</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Lisa uus
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pole veel videoid</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Alusta inspiratsioonivideote kogumist - lisa oma esimene YouTube'i või TikToki video
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Lisa esimene video
            </Button>
          </div>
        ) : (
          <VideoGrid videos={videos} />
        )}

        <AddVideoDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddVideo={addVideo} />
      </div>
    </div>
  )
}
