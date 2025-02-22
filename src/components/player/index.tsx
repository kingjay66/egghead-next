import * as React from 'react'
import {isEmpty, isArray} from 'lodash'
import {
  Player,
  BigPlayButton,
  ClosedCaptionButton,
  ControlBar,
  CurrentTimeDisplay,
  DurationDisplay,
  ForwardControl,
  FullscreenToggle,
  PlaybackRateMenuButton,
  PlayToggle,
  ProgressControl,
  ReplayControl,
  TimeDivider,
  usePlayer,
  VolumeMenuButton,
} from 'cueplayer-react'
import HLSSource from './hls-source'
import CueBar from './cue-bar'
import ControlBarDivider from './control-bar-divider'
import DownloadControl from './download-control'
import {track} from 'utils/analytics'
import {Switch} from '@headlessui/react'
import {
  defaultSubtitlePreference,
  useEggheadPlayerPrefs,
} from 'components/EggheadPlayer/use-egghead-player'
import {VideoResource} from 'types'
import {MutableRefObject, SyntheticEvent} from 'react'
import AddNoteControl from './add-note-control'

export type VideoResourcePlayerProps = {
  videoResource: VideoResource
  containerRef?: MutableRefObject<any>
  actualPlayerRef?: MutableRefObject<any>
  onCanPlay?: (event: any) => void
  onLoadStart?: (event: any) => void
  onPause?: () => void
  onPlay?: () => void
  onTimeUpdate?: (event: any) => void
  onFullscreenChange?: (isFullscreen: boolean) => void
  onEnded?: () => void
  onVolumeChange?: (event: any) => void
  onAddNote?: () => void
  newNotes?: any[]
  hidden?: boolean
  className?: string
  volume?: number
}

const VideoResourcePlayer: React.FC<VideoResourcePlayerProps> = ({
  videoResource,
  containerRef,
  actualPlayerRef,
  hidden = false,
  className = '',
  children,
  onFullscreenChange,
  onLoadStart,
  newNotes,
  onAddNote,
  ...props
}) => {
  const {setPlayerPrefs, getPlayerPrefs} = useEggheadPlayerPrefs()

  const {subtitle, playbackRate, volumeRate} = getPlayerPrefs()

  const noteTrack = React.useRef<HTMLTrackElement>(null)

  React.useEffect(() => {
    const track = noteTrack.current?.track

    if (track && isArray(newNotes)) {
      newNotes.forEach((note) => {
        const cue = new VTTCue(
          note.start_time,
          note.end_time,
          JSON.stringify(note),
        )
        track.addCue(cue)
      })
    }
  }, [newNotes, noteTrack])

  return (
    <div
      className={`relative z-10 h-full ${className} 
          ${hidden ? 'hidden' : 'block'} 
          ${hasNotes(videoResource) ? 'pb-[5rem]' : 'pb-14'}`}
    >
      <Player
        crossOrigin="anonymous"
        className="font-sans"
        volume={0.2}
        poster={videoResource.thumb_url}
        onLoadStart={(event: any) => {
          const videoElement: HTMLVideoElement =
            event.target as HTMLVideoElement
          videoElement.volume = volumeRate / 100
          videoElement.playbackRate = playbackRate
          if (onLoadStart) {
            onLoadStart(event)
          }
        }}
        onVolumeChange={(event: SyntheticEvent) => {
          const player: HTMLVideoElement = event.target as HTMLVideoElement
          setPlayerPrefs({volumeRate: player.volume * 100})
        }}
        rootElement={containerRef?.current}
        {...props}
      >
        <BigPlayButton position="center" />
        {videoResource.hls_url && (
          <HLSSource
            key={videoResource.hls_url}
            isVideoChild
            src={videoResource.hls_url}
          />
        )}
        {videoResource.subtitles_url && (
          <track
            key={videoResource.subtitles_url}
            src={videoResource.subtitles_url}
            kind="subtitles"
            srcLang="en"
            label="English"
            default={subtitle?.language === 'en'}
          />
        )}
        {hasNotes(videoResource) && (
          <track
            key={videoResource.slug}
            ref={noteTrack}
            id="notes"
            src={`/api/lessons/notes/${videoResource.slug}?staff_notes_url=${videoResource.staff_notes_url}`}
            kind="metadata"
            label="notes"
          />
        )}
        {hasNotes(videoResource) && (
          <CueBar key={videoResource.slug} order={6.0} />
        )}
        <ProgressControl key="progress-control" order={7.0} />
        <ControlBar
          disableDefaultControls
          autoHide={false}
          className={`flex ${
            hasNotes(videoResource) ? 'translate-y-[5rem]' : 'translate-y-14'
          }`}
          order={8.0}
        >
          <PlayToggle key="play-toggle" order={1} />
          <ReplayControl key="replay-control" order={2} />
          <ForwardControl key="forward-control" order={3} />
          <VolumeMenuButton key="volume-menu-button" order={4} />
          <CurrentTimeDisplay key="current-time-display" order={5} />
          <TimeDivider key="time-divider" order={6} />
          <DurationDisplay key="duration-display" order={7} />
          <ControlBarDivider key="divider" order={8} className="flex-grow" />
          <AutoplayControl
            enabled={true}
            onDark={true}
            key="autoplay-control"
            order={9}
          />
          <PlaybackRateMenuButton
            rates={[2, 1.75, 1.5, 1.25, 1, 0.85, 0.75]}
            key="playback-rate"
            order={10}
            selected={playbackRate}
            onChange={(playbackRate: number) => {
              setPlayerPrefs({playbackRate})
            }}
          />
          <AddNoteControl
            key="add-note-control"
            order={11}
            lesson={videoResource}
            onAddNote={onAddNote}
          />
          <DownloadControl
            key="download-control"
            order={12}
            download_url={videoResource.download_url}
            slug={videoResource.slug}
          />
          {videoResource.subtitles_url && (
            <ClosedCaptionButton
              key={videoResource.subtitles_url}
              order={13}
              selected={subtitle}
              onChange={(track?: TextTrack) => {
                const updatedSubtitlePref = track
                  ? {
                      id: track.id,
                      kind: track.kind,
                      label: track.label,
                      language: track.language,
                    }
                  : defaultSubtitlePreference

                setPlayerPrefs({
                  subtitle: updatedSubtitlePref,
                })
              }}
            >
              1123
            </ClosedCaptionButton>
          )}
          <FullscreenToggle
            key="fullscreen-toggle"
            fullscreenElement={containerRef?.current}
            order={14}
            onFullscreenChange={onFullscreenChange}
          />
        </ControlBar>
      </Player>
      {children}
    </div>
  )
}

export const hasNotes = (resource: VideoResource) => {
  return (
    process.env.NEXT_PUBLIC_NOTES_ENABLED === 'true' &&
    !isEmpty(resource.staff_notes_url)
  )
}

export const useNotesCues = () => {
  const {player} = usePlayer()
  const {activeMetadataTracks = []} = player

  const noteTracks = activeMetadataTracks.filter((track: TextTrack) => {
    return track.label === 'notes'
  })

  const cues: VTTCue[] = noteTracks.reduce(
    (acc: VTTCue[], track: TextTrack) => {
      return [...acc, ...Array.from(track.cues || [])]
    },
    [],
  )

  return {
    cues,
  }
}

type AutoplayControlProps = {
  enabled: boolean
  onDark?: boolean
  actions?: any
  order?: number
}

const AutoplayControl: React.FC<AutoplayControlProps> = ({
  enabled,
  onDark = false,
  actions,
}) => {
  const {getPlayerPrefs, setPlayerPrefs} = useEggheadPlayerPrefs()
  const {autoplay} = getPlayerPrefs()

  return (
    <div className="hidden md:flex px-3 items-center space-x-2">
      <span>Autoplay</span>
      <Switch
        checked={autoplay}
        onChange={() => {
          if (enabled) {
            const newAutoplayPref = !autoplay
            track(`clicked toggle autoplay`, {
              state: !autoplay ? 'off' : 'on',
            })
            setPlayerPrefs({autoplay: newAutoplayPref})

            if (newAutoplayPref && actions) {
              actions.play()
            } else {
              actions.pause()
            }
          }
        }}
        className={`${
          autoplay ? 'bg-blue-600' : 'bg-gray-700'
        } relative inline-flex items-center h-5 rounded-full w-10`}
      >
        <span className="sr-only">Enable autoplay</span>
        <span
          className={`${
            autoplay ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-3 h-3 transform bg-white rounded-full`}
        />
      </Switch>
    </div>
  )
}

export default VideoResourcePlayer
