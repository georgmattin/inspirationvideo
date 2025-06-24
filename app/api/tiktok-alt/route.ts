import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoUrl = searchParams.get("url")

  if (!videoUrl) {
    return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
  }

  try {
    // Alternative TikTok API service
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 })
    }

    // Using TikTok Scraper API
    const response = await fetch(`https://tiktok-scraper7.p.rapidapi.com/?url=${encodeURIComponent(videoUrl)}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
    })

    if (!response.ok) {
      throw new Error("TikTok Scraper API request failed")
    }

    const data = await response.json()

    if (!data.success || !data.data) {
      throw new Error("Invalid TikTok video or API response")
    }

    const videoData = data.data
    const description = videoData.title || videoData.desc || ""

    // Extract hashtags from description
    const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
    const hashtags = hashtagMatches.map((tag: string) => tag.substring(1))

    return NextResponse.json({
      title: description || "TikTok Video",
      author: videoData.author?.username ? `@${videoData.author.username}` : undefined,
      description: description,
      hashtags: hashtags.slice(0, 10),
      thumbnail: videoData.video?.cover || videoData.video?.thumbnail,
      stats: {
        views: videoData.stats?.views || 0,
        likes: videoData.stats?.likes || 0,
        comments: videoData.stats?.comments || 0,
        shares: videoData.stats?.shares || 0,
      },
    })
  } catch (error) {
    console.error("TikTok Alt API error:", error)
    return NextResponse.json({ error: "Failed to fetch TikTok video data" }, { status: 500 })
  }
}
