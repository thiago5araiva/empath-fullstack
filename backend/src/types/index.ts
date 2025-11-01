export type QueueItem = {
  id: string
  videoId: string
  userId: string
  progressSeconds: number
  createdAt: string
}

export type ProgressRecord = {
  videoId: string
  userId: string
  furthestSeconds: number
  updatedAt: string
}
