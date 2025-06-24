import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const originalUrl = searchParams.get("originalUrl")

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
  }

  try {
    // Using YouTube Data API v3
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    // Fetch snippet, statistics, and contentDetails for duration
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error("Failed to fetch from YouTube API")
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const video = data.items[0]
    const snippet = video.snippet
    const statistics = video.statistics
    const contentDetails = video.contentDetails

    // Detect if it's a Short
    const isShort = detectYouTubeShort(originalUrl, contentDetails?.duration)

    // Extract hashtags from description
    const description = snippet.description || ""
    const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
    const hashtags = hashtagMatches.map((tag) => tag.substring(1)) // Remove # symbol

    // Format numbers for better readability
    const formatNumber = (num: string | number) => {
      const number = typeof num === "string" ? Number.parseInt(num) : num
      if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + "M"
      } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + "K"
      }
      return number.toString()
    }

    // Parse duration from ISO 8601 format (PT1M30S -> 90 seconds)
    const parseDuration = (duration: string) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      const hours = Number.parseInt(match[1] || "0")
      const minutes = Number.parseInt(match[2] || "0")
      const seconds = Number.parseInt(match[3] || "0")
      return hours * 3600 + minutes * 60 + seconds
    }

    const durationInSeconds = contentDetails?.duration ? parseDuration(contentDetails.duration) : 0

    return NextResponse.json({
      title: snippet.title,
      author: snippet.channelTitle,
      description: snippet.description,
      hashtags: hashtags.slice(0, 10), // Limit to 10 hashtags
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      publishedAt: snippet.publishedAt,
      duration: durationInSeconds,
      isShort: isShort,
      stats: {
        views: Number.parseInt(statistics.viewCount || "0"),
        likes: Number.parseInt(statistics.likeCount || "0"),
        comments: Number.parseInt(statistics.commentCount || "0"),
        viewsFormatted: formatNumber(statistics.viewCount || "0"),
        likesFormatted: formatNumber(statistics.likeCount || "0"),
        commentsFormatted: formatNumber(statistics.commentCount || "0"),
      },
      channelId: snippet.channelId,
    })
  } catch (error) {
    console.error("YouTube API error:", error)
    return NextResponse.json({ error: "Failed to fetch video data" }, { status: 500 })
  }
}

function detectYouTubeShort(originalUrl: string | null, duration: string | undefined): boolean {
  // Primary detection: URL contains "/shorts/"
  if (originalUrl && originalUrl.includes("/shorts/")) {
    return true
  }

  // Secondary detection: duration is 60 seconds or less
  if (duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (match) {
      const hours = Number.parseInt(match[1] || "0")
      const minutes = Number.parseInt(match[2] || "0")
      const seconds = Number.parseInt(match[3] || "0")
      const totalSeconds = hours * 3600 + minutes * 60 + seconds

      // If video is 60 seconds or less, likely a Short
      if (totalSeconds <= 60) {
        return true
      }
    }
  }

  return false
}
