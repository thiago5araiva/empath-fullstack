import { mkdirSync,readFileSync, existsSync, writeFileSync} from 'fs'
import {ProgressRecord, QueueItem} from '../types'
import path from 'path'

export class StorageService{
    private queue: Map<string, QueueItem[]> = new Map()
    private progress: Map<string, ProgressRecord> = new Map()
    private dataPath = path.join(process.cwd(), 'data')
    private queueFile = path.join(this.dataPath, 'queue.json')
    private progressFile = path.join(this.dataPath, 'progress.json')

    constructor() {
        this.ensureDataDirectory()
        this.loadFromDisk()
    }
    private ensureDataDirectory(){
        if(!existsSync(this.dataPath)){
            mkdirSync(this.dataPath, {recursive:true})
            console.log('directory created')
        }
    }
    private loadFromDisk() {
        try{
            if(existsSync(this.queueFile)){
                const queueData = readFileSync(this.queueFile, 'utf-8')
                const  parsed = JSON.parse(queueData)
                this.queue = new Map(Object.entries(parsed))
                console.log('laoded form disk')
            }
            if(existsSync(this.progressFile)){
                const progressData = readFileSync(this.progressFile, 'utf-8')
                const parsed = JSON.parse(progressData)
                this.progress = new Map(Object.entries(parsed))
                console.log('Load from disk')
            }
        }catch(error){
            console.error('Error loading from disk', error)
            this.queue = new Map()
            this.progress = new Map()
        }
    }
    private saveToDisk() {
        try{
            const queueObj = Object.fromEntries(this.queue)
            writeFileSync(this.queueFile, JSON.stringify(queueObj, null,2))
            const progressObj = Object.fromEntries(this.progress)
            writeFileSync(this.progressFile, JSON.stringify(progressObj, null,2))
            console.log('Data saved')
        }catch(error){
            console.error('Error saving', error)
        }
    }
    addToQueue(item: Omit<QueueItem, 'Id'|'createdAt'>):QueueItem{
        const queueItem: QueueItem = {
            ...item,
            id:`${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            createdAt: new Date().toISOString()
        }
        const key = `${item.userId}-${item.videoId}`
        const existing = this.queue.get(key) || []
        existing.push(queueItem)
        this.queue.set(key,existing)
        this.saveToDisk()
        return queueItem
    }
    getQueueItems(userId:string, videoId: string): QueueItem[]{
        const key = `${userId}-${videoId}`
        return this.queue.get(key) || []
    }
    getAllQueueItem():Map<string,QueueItem[]>{
        return new Map(this.queue)
    }    
    clearQueue():void{
        this.queue.clear()
        this.saveToDisk()
    }
    clearQueueForKey(userId:string, videoId:string):void{
        const key = `${userId}-${videoId}`
        this.queue.delete(key)
        this.saveToDisk()
    }
    getProgress(userId:string,videoId:string): ProgressRecord | null {
         const key = `${userId}-${videoId}`
         return this.progress.get(key) || null
    }
    setProgress(userId:string, videoId:string, furthestSeconds:number): ProgressRecord{
        const key = `${userId}-${videoId}`
        const progressRecord:ProgressRecord = {
            userId,
            videoId,
            furthestSeconds,
            updatedAt: new Date().toISOString()
        }
        this.progress.set(key,progressRecord)
        this.saveToDisk()
        return progressRecord
    }
      updateProgressIfHigher(userId: string, videoId: string, seconds: number): boolean {
        const key = `${userId}-${videoId}`
        const current = this.progress.get(key)
        if(!current || seconds > current.furthestSeconds){
            this.setProgress(userId,videoId,seconds)
            return true
        }
        return false
      }
      getAlssProgress():Map<string, ProgressRecord>{
        return new Map(this.progress)
      }
      processCronJob():{updated:number,processed:number}{
        let updated = 0
        let processed = 0
        for(const [key,items] of this.queue){
            if(items.length ===0)continue
            const maxProgress = Math.max(...items.map(item => item.progressSeconds))
            const [userId,videoId] = key.split('-')
            const wasUpdated = this.updateProgressIfHigher(userId,videoId,maxProgress)
            if(wasUpdated)updated++
        }
        this.queue.clear()
        this.saveToDisk()
        console.log('Cron job processed')
        return {updated,processed}
      }
      getStats(){
        return{
            queueSize: this.queue.size,
            queueItems: Array.from(this.queue.values()).flat().length,
            progressRecords:this.progress.size,
            dataPath:this.dataPath
        }
      }
      reset(){
        this.queue.clear()
        this.progress.clear()
        this.saveToDisk()
        console.log('Storage reset')
      }

}