"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RefreshCw } from "lucide-react"
import type { Video } from "@/app/page"

interface AddVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddVideo: (video: Video) => void
}

interface VideoMetadata {
  title: string
  author?: string
  description?: string
  hashtags?: string[]
  thumbnail?: string
  stats?: {
    views: number
    likes: number
    comments: number
    shares?: number
    viewsFormatted?: string
    likesFormatted?: string
    commentsFormatted?: string
  }
  publishedAt?: string
  channelId?: string
  duration?: string
  isShort?: boolean
}

export function AddVideoDialog({ open, onOpenChange, onAddVideo }: AddVideoDialogProps) {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [author, setAuthor] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [metadataFetched, setMetadataFetched] = useState(false)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)

  const extractVideoInfo = (url: string) => {
    // YouTube URL patterns (including Shorts)
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    const youtubeMatch = url.match(youtubeRegex)

    if (youtubeMatch) {
      const videoId = youtubeMatch[1]
      return {
        platform: "youtube" as const,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
        id: videoId,
      }
    }

    // TikTok URL patterns
    const tiktokRegex = /tiktok\.com\/.*\/video\/(\d+)/
    const tiktokMatch = url.match(tiktokRegex)

    if (tiktokMatch) {
      const videoId = tiktokMatch[1]
      return {
        platform: "tiktok" as const,
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        id: videoId,
      }
    }

    return null
  }

  const fetchVideoMetadata = async (url: string, platform: string, videoId?: string) => {
    setIsFetchingMetadata(true)
    try {
      let response

      if (platform === "youtube" && videoId) {
        response = await fetch(`/api/youtube?videoId=${videoId}&originalUrl=${encodeURIComponent(url)}`)
      } else if (platform === "tiktok") {
        // Try primary TikTok API first
        response = await fetch(`/api/tiktok?url=${encodeURIComponent(url)}`)

        // If primary fails, try alternative API
        if (!response.ok) {
          console.log("Primary TikTok API failed, trying alternative...")
          response = await fetch(`/api/tiktok-alt?url=${encodeURIComponent(url)}`)
        }
      } else {
        throw new Error("Unsupported platform")
      }

      if (!response.ok) {
        throw new Error("Failed to fetch metadata")
      }

      const metadata: VideoMetadata = await response.json()

      // Update form fields with fetched data
      setTitle(metadata.title || "")
      setAuthor(metadata.author || "")
      setDescription(metadata.description || "")
      setHashtags(metadata.hashtags?.join(", ") || "")
      setMetadataFetched(true)
      setMetadata(metadata)
      // Show success message for TikTok
      if (platform === "tiktok" && metadata.title) {
        console.log("TikTok metadata fetched successfully:", metadata)
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      // Set basic defaults if fetching fails
      setTitle(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`)
      setMetadataFetched(true)
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl)
    setMetadataFetched(false)

    if (newUrl.trim()) {
      const videoInfo = extractVideoInfo(newUrl)
      if (videoInfo) {
        await fetchVideoMetadata(newUrl, videoInfo.platform, videoInfo.id)
      }
    } else {
      // Clear fields when URL is empty
      setTitle("")
      setAuthor("")
      setDescription("")
      setHashtags("")
    }
  }

  const handleRefreshMetadata = async () => {
    if (url.trim()) {
      const videoInfo = extractVideoInfo(url)
      if (videoInfo) {
        await fetchVideoMetadata(url, videoInfo.platform, videoInfo.id)
      }
    }
  }

  const parseHashtags = (hashtagString: string): string[] => {
    return hashtagString
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, "").trim())
      .filter((tag) => tag.length > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)

    try {
      const videoInfo = extractVideoInfo(url)

      if (!videoInfo) {
        alert("Palun sisesta kehtiv YouTube'i või TikToki link")
        return
      }

      const video: Video = {
        id: `${videoInfo.platform}-${videoInfo.id}-${Date.now()}`,
        title: title.trim() || `${videoInfo.platform.charAt(0).toUpperCase() + videoInfo.platform.slice(1)} Video`,
        description: description.trim() || undefined,
        hashtags: hashtags.trim() ? parseHashtags(hashtags) : undefined,
        author: author.trim() || undefined,
        url: url.trim(),
        embedUrl: videoInfo.embedUrl,
        platform: videoInfo.platform,
        stats: metadata?.stats,
        publishedAt: metadata?.publishedAt,
        channelId: metadata?.channelId,
        duration: metadata?.duration,
        isShort: metadata?.isShort,
      }

      onAddVideo(video)

      // Reset form
      setUrl("")
      setTitle("")
      setDescription("")
      setHashtags("")
      setAuthor("")
      setMetadataFetched(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding video:", error)
      alert("Viga video lisamisel")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lisa uus video</DialogTitle>
          <DialogDescription>Lisa YouTube'i või TikToki video link - info tõmmatakse automaatselt</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">Video link *</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://youtube.com/watch?v=... või https://tiktok.com/..."
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  required
                  disabled={isFetchingMetadata}
                />
                {metadataFetched && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshMetadata}
                    disabled={isFetchingMetadata}
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetchingMetadata ? "animate-spin" : ""}`} />
                  </Button>
                )}
              </div>
              {isFetchingMetadata && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tõmban video infot...
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Pealkiri</Label>
              <Input
                id="title"
                placeholder="Video pealkiri"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isFetchingMetadata}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Autor/Kasutaja</Label>
              <Input
                id="author"
                placeholder="Kes selle video postitas"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={isFetchingMetadata}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Kirjeldus</Label>
              <Textarea
                id="description"
                placeholder="Video kirjeldus"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isFetchingMetadata}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hashtags">Hashtagid</Label>
              <Input
                id="hashtags"
                placeholder="design, inspiration, ui"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                disabled={isFetchingMetadata}
              />
              <p className="text-xs text-muted-foreground">Automaatselt tõmmatud hashtagid. Saad neid redigeerida.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Tühista
            </Button>
            <Button type="submit" disabled={isLoading || isFetchingMetadata}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lisab...
                </>
              ) : (
                "Lisa video"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
