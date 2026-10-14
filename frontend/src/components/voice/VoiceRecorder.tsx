'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { apiClient } from '@/lib/api'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
  disabled?: boolean
}

export default function VoiceRecorder({ onTranscript, onError, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    // Check if voice transcription is available
    apiClient.getVoiceStatus().then((status) => {
      setIsAvailable(status.available)
      if (!status.available) {
        if (!status.configured) {
          console.warn('Voice transcription not configured. Set GEMINI_API_KEY in backend/.env')
          if (onError) {
            onError('Voice transcription is not configured on the server. Please use typed input.')
          }
        } else {
          console.warn('Voice transcription unavailable')
          if (onError) {
            onError('Voice transcription service is currently unavailable.')
          }
        }
      }
    }).catch((err) => {
      console.error('Failed to check voice status:', err)
      setIsAvailable(false)
      if (onError) {
        onError('Unable to check voice transcription availability.')
      }
    })
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        
        // Transcribe
        setIsProcessing(true)
        try {
          const result = await apiClient.transcribeAudio(audioBlob)
          if (result.success && result.transcript) {
            onTranscript(result.transcript)
          } else {
            const errorMessage = result.error || 'Transcription failed'
            if (onError) {
              onError(errorMessage)
            }
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || err.message || 'Failed to transcribe audio'
          if (onError) {
            onError(errorMessage)
          }
        } finally {
          setIsProcessing(false)
        }
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Microphone permission denied' 
        : 'Failed to access microphone'
      if (onError) {
        onError(errorMessage)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="text-slate-300 cursor-not-allowed"
          title="Voice transcription not configured"
        >
          <MicOff className="w-5 h-5" />
        </button>
        <span className="text-xs text-slate-400">Voice disabled</span>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="text-primary-600">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isProcessing}
      className={`transition-all ${
        isRecording
          ? 'text-red-600 hover:text-red-700 animate-pulse'
          : 'text-slate-400 hover:text-primary-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? (
        <Mic className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  )
}
