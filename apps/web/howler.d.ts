declare module 'howler' {
  export type HowlEvent = 'load' | 'play' | 'playerror'

  export class Howl {
    constructor(options: {
      src: string[]
      format?: string[]
      autoplay?: boolean
      preload?: boolean
      loop?: boolean
      volume?: number
      html5?: boolean
      onloaderror?: (id: number, error: unknown) => void
      onplayerror?: (id: number, error: unknown) => void
    })

    play(): number
    stop(id?: number): void
    unload(): void
    once(event: HowlEvent, callback: (...args: unknown[]) => void, id?: number): this
    on(event: HowlEvent, callback: (...args: unknown[]) => void, id?: number): this
    off(event?: HowlEvent, callback?: (...args: unknown[]) => void, id?: number): this
  }
}
