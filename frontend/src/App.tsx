// frontend/src/App.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import ReactPlayer from 'react-player'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw } from 'lucide-react'

const API_URL = 'http://localhost:3000/api'
const USER_ID = 'test-user-1'

interface Video {
  videoId: string
  url: string
  title: string
  duration?: number
}

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  
  const [video, setVideo] = useState<Video | null>(null)
  const [furthestProgress, setFurthestProgress] = useState(0)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const videoRes = await fetch(`${API_URL}/video`)
        const videoData = await videoRes.json()
        setVideo(videoData)

        const progressRes = await fetch(
          `${API_URL}/progress/furthest?userId=${USER_ID}&videoId=${videoData.videoId}`
        )
        const progressData = await progressRes.json()
        setFurthestProgress(progressData.furthestSeconds || 0)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const enqueueProgress = useCallback(async () => {
    if (!video) return
    
    const progress = (playerRef.current?.getCurrentTime?.() ?? 0) || 0
    
    try {
      await fetch(`${API_URL}/progress/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          userId: USER_ID,
          progressSeconds: Math.floor(progress)
        })
      })
      console.log(`📤 Progress sent: ${Math.floor(progress)}s`)
    } catch (error) {
      console.error('Error sending progress:', error)
    }
  }, [video])

  const runCronJob = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/progress/run-cron`, { method: 'POST' })
      const data = await res.json()
      console.log('🔄 Cron job executed:', data)
    } catch (error) {
      console.error('Error running cron:', error)
    }
  }, [])

  const startProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      enqueueProgress()
    }, 3000)
    
    console.log('▶️ Progress tracking started')
  }, [enqueueProgress])

  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
      console.log('⏸️ Progress tracking stopped')
    }
  }, [])

  const handlePlay = () => {
    setIsPlaying(true)
    startProgressTracking()
  }

  const handlePause = () => {
    setIsPlaying(false)
    stopProgressTracking()
    enqueueProgress()
  }

  const handleEnded = () => {
    setIsPlaying(false)
    stopProgressTracking()
    runCronJob()
  }

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setCurrentProgress(state.playedSeconds)
  }

  const resumeFromFurthest = () => {
    if (playerRef.current && furthestProgress > 0) {
      playerRef.current.seekTo(furthestProgress)
    }
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      runCronJob()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      stopProgressTracking()
    }
  }, [runCronJob, stopProgressTracking])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  const progressPercentage = video?.duration 
    ? (currentProgress / video.duration) * 100 
    : 0

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Video Progress Queue</CardTitle>
            <div className="flex gap-2">
              <Badge variant={isPlaying ? "default" : "secondary"}>
                {isPlaying ? "Playing" : "Paused"}
              </Badge>
              <Badge variant="outline">
                User: {USER_ID}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Current: {Math.floor(currentProgress)}s</span>
              <span>Furthest: {Math.floor(furthestProgress)}s</span>
            </div>
            {video?.duration && (
              <Progress value={progressPercentage} className="h-2" />
            )}
          </div>

          {video && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <ReactPlayer
                ref={playerRef}
                url={video.url}
                width="100%"
                height="100%"
                controls
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                // @ts-expect-error - react-player's onProgress signature differs from standard HTMLVideoElement
                onProgress={handleProgress}
              />
            </div>
          )}

          {furthestProgress > 5 && !isPlaying && (
            <Button 
              onClick={resumeFromFurthest}
              className="w-full"
              variant="secondary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Resume from {Math.floor(furthestProgress)}s
            </Button>
          )}
      
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <p>Video ID: {video?.videoId}</p>
            <p>Tracking: {intervalRef.current ? 'Active' : 'Inactive'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}