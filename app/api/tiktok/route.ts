import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoUrl = searchParams.get("url")

  if (!videoUrl) {
    return NextResponse.json({ error: "Video URL is required" }, { status: 400 })
  }

  console.log("TikTok API called with URL:", videoUrl)

  try {
    // Try official TikTok API first (but expect it to fail in sandbox)
    console.log("Trying official TikTok API...")
    try {
      const officialResponse = await fetch(
        `${request.nextUrl.origin}/api/tiktok-official?url=${encodeURIComponent(videoUrl)}`,
      )

      if (officialResponse.ok) {
        const officialData = await officialResponse.json()
        console.log("TikTok Official API success!")
        return NextResponse.json(officialData)
      } else {
        const errorData = await officialResponse.json()
        console.log("Official TikTok API failed:", errorData)
      }
    } catch (officialError) {
      console.log("Official TikTok API error:", officialError)
    }

    console.log("Trying RapidAPI fallback...")

    // Fallback to RapidAPI services
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (rapidApiKey) {
      try {
        const rapidResponse = await fetch("https://tiktok-video-no-watermark2.p.rapidapi.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": "tiktok-video-no-watermark2.p.rapidapi.com",
          },
          body: JSON.stringify({
            url: videoUrl,
          }),
        })

        if (rapidResponse.ok) {
          const data = await rapidResponse.json()
          console.log("RapidAPI response:", data)

          if (data.code === 0 && data.data) {
            const videoData = data.data
            const author = videoData.author
            const videoInfo = videoData.video

            // Extract hashtags from description
            const description = videoInfo.title || ""
            const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
            const hashtags = hashtagMatches.map((tag: string) => tag.substring(1))

            console.log("RapidAPI success!")
            return NextResponse.json({
              title: videoInfo.title || "TikTok Video",
              author: author ? `@${author.unique_id}` : undefined,
              description: videoInfo.title,
              hashtags: hashtags.slice(0, 10),
              thumbnail: videoInfo.cover || videoInfo.dynamic_cover,
              stats: {
                views: videoData.stats?.play_count || 0,
                likes: videoData.stats?.digg_count || 0,
                comments: videoData.stats?.comment_count || 0,
                shares: videoData.stats?.share_count || 0,
                viewsFormatted: formatNumber(videoData.stats?.play_count || 0),
                likesFormatted: formatNumber(videoData.stats?.digg_count || 0),
                commentsFormatted: formatNumber(videoData.stats?.comment_count || 0),
              },
            })
          }
        } else {
          console.log("RapidAPI failed:", rapidResponse.status, await rapidResponse.text())
        }
      } catch (rapidError) {
        console.log("RapidAPI error:", rapidError)
      }
    } else {
      console.log("No RapidAPI key found")
    }

    console.log("Using web scraping fallback...")
    // Final fallback to web scraping
    return await fallbackScraping(videoUrl)
  } catch (error) {
    console.error("All TikTok methods failed:", error)
    return await fallbackScraping(videoUrl)
  }
}

async function fallbackScraping(videoUrl: string) {
  try {
    console.log("Starting web scraping for:", videoUrl)

    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    console.log("HTML fetched, length:", html.length)

    // Try to extract JSON data from script tags
    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/,
    )

    if (scriptMatch) {
      try {
        console.log("Found JSON data in script tag")
        const jsonData = JSON.parse(scriptMatch[1])
        const videoData = jsonData?.["__DEFAULT_SCOPE__"]?.["webapp.video-detail"]?.itemInfo?.itemStruct

        if (videoData) {
          const description = videoData.desc || ""
          const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
          const hashtags = hashtagMatches.map((tag: string) => tag.substring(1))

          console.log("Web scraping success!")
          return NextResponse.json({
            title: description || "TikTok Video",
            author: videoData.author ? `@${videoData.author.uniqueId}` : undefined,
            description: description,
            hashtags: hashtags.slice(0, 10),
            thumbnail: videoData.video?.cover,
            stats: {
              views: videoData.stats?.playCount || 0,
              likes: videoData.stats?.diggCount || 0,
              comments: videoData.stats?.commentCount || 0,
              shares: videoData.stats?.shareCount || 0,
              viewsFormatted: formatNumber(videoData.stats?.playCount || 0),
              likesFormatted: formatNumber(videoData.stats?.diggCount || 0),
              commentsFormatted: formatNumber(videoData.stats?.commentCount || 0),
            },
          })
        }
      } catch (parseError) {
        console.error("Error parsing JSON data:", parseError)
      }
    }

    // Basic meta tag extraction as final fallback
    console.log("Using basic meta tag extraction")
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(" | TikTok", "").trim() : "TikTok Video"

    const authorMatch = html.match(/<meta[^>]*property="profile:username"[^>]*content="([^"]*)"[^>]*>/i)
    const author = authorMatch ? `@${authorMatch[1]}` : undefined

    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
    const description = descMatch ? descMatch[1] : undefined

    const hashtags: string[] = []
    if (description) {
      const hashtagMatches = description.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || []
      hashtags.push(...hashtagMatches.map((tag) => tag.substring(1)))
    }

    console.log("Basic scraping result:", { title, author })
    return NextResponse.json({
      title,
      author,
      description,
      hashtags: hashtags.slice(0, 10),
    })
  } catch (error) {
    console.error("Web scraping failed:", error)
    return NextResponse.json({
      title: "TikTok Video",
      author: undefined,
      description: undefined,
      hashtags: [],
      error: "All methods failed",
    })
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}
