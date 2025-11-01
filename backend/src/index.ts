import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { StorageService } from './services/storage.service'
import { VideoService } from './services/video.service'
import { ProgressService } from './services/progress.service'

const app = new Elysia()
.use(cors({origin:true,credentials:true}))
.get('/api/video', ()=> ({
    videoId:'yt-abc123',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Sample Video',
    duration: 212
}))
.post('/api/progress/queue',({body})=>{
    const queueItem = Storage.addToQueue(body)
    return {ok: true, item:queueItem}
},{
    body:t.Object({
        videoId: t.String(),
        userId: t.String(),
    progressSeconds: t.Number({minimum:0})
    })
})
.get('/api/progress/furthest',({query})=> {
    const {userId, videoId}= query
    const progress = storage.getProgress(userId, videoId)
    return {
        videoId,
        userId,
        furthestSeconds: progress?.furthestSeconds || 0,
        lastUpdated: progress?.updatedAt || null
    }
},{
    query: t.Object({
        userId: t.String(),
        videoId: t.String()
    })
})
.get('/api/stats',() => Storage.getStats())
.post('/api/reset', () => {
    Storage.reset()
    return{ok: true}
})

app.listen(3000)