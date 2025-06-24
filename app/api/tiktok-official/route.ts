import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoUrl = searchParams.get("url")

  if (!videoUrl) {
    return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
  }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET

    if (!clientKey || !clientSecret) {
      console.log("TikTok API credentials not found, skipping official API")
      return NextResponse.json({ error: "TikTok API credentials not configured" }, { status: 500 })
    }

    // Extract video ID from URL
    const videoId = extractTikTokVideoId(videoUrl)
    if (!videoId) {
      console.log("Could not extract video ID from URL:", videoUrl)
      return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 })
    }

    console.log("Attempting to get TikTok access token...")

    // First, get access token
    const accessToken = await getAccessToken(clientKey, clientSecret)
    if (!accessToken) {
      console.log("Failed to get access token, API might not be available in sandbox")
      throw new Error("Failed to get access token")
    }

    console.log("Access token obtained, fetching video info...")

    // Get video info using TikTok API
    const videoData = await getVideoInfo(accessToken, videoId, videoUrl)

    if (!videoData) {
      console.log("No video data returned from TikTok API")
      throw new Error("Failed to fetch video data")
    }

    // Extract hashtags from description
    const description = videoData.desc || videoData.title || ""
    const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
    const hashtags = hashtagMatches.map((tag: string) => tag.substring(1))

    console.log("TikTok Official API success:", { title: description, author: videoData.author })

    return NextResponse.json({
      title: description || "TikTok Video",
      author: videoData.author ? `@${videoData.author.display_name || videoData.author.username}` : undefined,
      description: description,
      hashtags: hashtags.slice(0, 10),
      thumbnail: videoData.video?.cover || videoData.cover,
      stats: {
        views: videoData.statistics?.view_count || 0,
        likes: videoData.statistics?.like_count || 0,
        comments: videoData.statistics?.comment_count || 0,
        shares: videoData.statistics?.share_count || 0,
        viewsFormatted: formatNumber(videoData.statistics?.view_count || 0),
        likesFormatted: formatNumber(videoData.statistics?.like_count || 0),
        commentsFormatted: formatNumber(videoData.statistics?.comment_count || 0),
      },
      duration: videoData.video?.duration || 0,
    })
  } catch (error) {
    console.error("TikTok Official API error:", error)
    // Return a more specific error for debugging
    return NextResponse.json(
      {
        error: "TikTok Official API failed",
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Using fallback methods",
      },
      { status: 500 },
    )
  }
}

async function getAccessToken(clientKey: string, clientSecret: string): Promise<string | null> {
  try {
    console.log("Requesting access token from TikTok...")

    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    })

    const responseText = await response.text()
    console.log("Token response status:", response.status)
    console.log("Token response:", responseText)

    if (!response.ok) {
      console.error("Token request failed:", response.status, responseText)
      return null
    }

    const data = JSON.parse(responseText)
    if (data.access_token) {
      console.log("Access token obtained successfully")
      return data.access_token
    } else {
      console.error("No access token in response:", data)
      return null
    }
  } catch (error) {
    console.error("Error getting access token:", error)
    return null
  }
}

async function getVideoInfo(accessToken: string, videoId: string, originalUrl: string) {
  try {
    console.log("Fetching video info for ID:", videoId)

    // Try different TikTok API endpoints
    const endpoints = [
      // Research API (most comprehensive but requires special access)
      {
        name: "Research API",
        url: "https://open.tiktokapis.com/v2/research/video/query/",
        method: "POST",
        body: JSON.stringify({
          query: {
            and: [
              {
                operation: "EQ",
                field_name: "video_id",
                field_values: [videoId],
              },
            ],
          },
          max_count: 1,
          fields: [
            "id",
            "video_description",
            "create_time",
            "region_code",
            "share_count",
            "view_count",
            "like_count",
            "comment_count",
            "music_id",
            "hashtag_names",
            "username",
            "display_name",
          ],
        }),
      },
      // Display API (requires user authorization but let's try)
      {
        name: "Display API",
        url: "https://open.tiktokapis.com/v2/video/list/",
        method: "GET",
        params:
          "fields=id,title,video_description,duration,cover_image_url,like_count,comment_count,share_count,view_count",
      },
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.name}...`)

        let response
        if (endpoint.method === "POST") {
          response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: endpoint.body,
          })
        } else {
          response = await fetch(`${endpoint.url}?${endpoint.params}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })
        }

        const responseText = await response.text()
        console.log(`${endpoint.name} response status:`, response.status)
        console.log(`${endpoint.name} response:`, responseText.substring(0, 500))

        if (response.ok) {
          const data = JSON.parse(responseText)

          if (endpoint.name === "Research API" && data.data?.videos && data.data.videos.length > 0) {
            const video = data.data.videos[0]
            return {
              desc: video.video_description,
              title: video.video_description,
              author: { display_name: video.display_name, username: video.username },
              statistics: {
                view_count: video.view_count,
                like_count: video.like_count,
                comment_count: video.comment_count,
                share_count: video.share_count,
              },
            }
          }

          if (endpoint.name === "Display API" && data.data?.videos) {
            const video = data.data.videos.find((v: any) => v.id === videoId)
            if (video) {
              return {
                desc: video.title || video.video_description,
                title: video.title || video.video_description,
                author: { display_name: "TikTok User" },
                video: {
                  cover: video.cover_image_url,
                  duration: video.duration,
                },
                statistics: {
                  view_count: video.view_count,
                  like_count: video.like_count,
                  comment_count: video.comment_count,
                  share_count: video.share_count,
                },
              }
            }
          }
        }
      } catch (endpointError) {
        console.error(`${endpoint.name} failed:`, endpointError)
        continue
      }
    }

    console.log("All TikTok API endpoints failed")
    return null
  } catch (error) {
    console.error("Error fetching video info:", error)
    return null
  }
}

function extractTikTokVideoId(url: string): string | null {
  // Extract video ID from various TikTok URL formats
  const patterns = [
    /tiktok\.com\/.*\/video\/(\d+)/,
    /tiktok\.com\/v\/(\d+)/,
    /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      console.log("Extracted video ID:", match[1])
      return match[1]
    }
  }

  console.log("Could not extract video ID from URL:", url)
  return null
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}
