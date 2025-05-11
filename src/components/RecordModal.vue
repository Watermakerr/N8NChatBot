<template>
  <div class="modal-overlay" v-if="isModalOpen">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Ghi âm</h2>
        <button class="close-icon" @click="closeModal">×</button>
      </div>

      <div class="recording-status">
        {{ recordingStatus }}
      </div>

      <!-- Wave animation -->
      <div class="visualizer-container">
        <ul v-if="isRecording" class="wave-menu">
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
        <div v-else class="idle-indicator">
          <div class="pulse-ring"></div>
          <div class="mic-icon-large">🎙️</div>
        </div>
      </div>

      <!-- Recording time -->
      <div class="recording-time">{{ formattedRecordingTime }}</div>

      <!-- Recording controls -->
      <div class="controls">
        <button class="control-btn recording" @click="stopAndTranscribe" v-if="isRecording">
          Dừng và Gửi
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const emit = defineEmits(['transcription'])

const isModalOpen = ref(false)
const isRecording = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const recordingTime = ref(0)
const timerInterval = ref(null)
const recordingStatus = ref('Sẵn sàng ghi âm')
const chunkInterval = ref(null) // Interval for checking data

// Configure your API URL here - make sure it matches your FastAPI server
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Helper function to create a dummy silent audio for testing
const createDummyAudio = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = ctx.createOscillator()
  const dst = ctx.createMediaStreamDestination()
  oscillator.connect(dst)
  oscillator.start()

  const dummy = new MediaRecorder(dst.stream)
  const dummyChunks = []

  dummy.ondataavailable = (e) => dummyChunks.push(e.data)

  dummy.start()
  await new Promise(r => setTimeout(r, 100))
  dummy.stop()

  await new Promise(r => {
    dummy.onstop = () => {
      oscillator.disconnect()
      ctx.close()
      r()
    }
  })

  return new Blob(dummyChunks, { type: 'audio/webm' })
}

const formattedRecordingTime = computed(() => {
  const minutes = Math.floor(recordingTime.value / 60)
  const seconds = recordingTime.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const openModal = async () => {
  isModalOpen.value = true
  resetState()
  await nextTick()
  await startRecording()
}

const closeModal = () => {
  isModalOpen.value = false
  if (isRecording.value) {
    stopRecording()
  }
  resetState()
}

const resetState = () => {
  recordingTime.value = 0
  audioChunks.value = []
  isRecording.value = false
  recordingStatus.value = 'Sẵn sàng ghi âm'
}

const startRecording = async () => {
  try {
    recordingStatus.value = 'Đang ghi âm...'
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true,
      }
    })

    // Reset audio chunks
    audioChunks.value = []

    // Configure recorder with lower timeslice to get chunks during recording
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    })

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Got audio chunk of size:', event.data.size)
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      console.log(`Recording stopped, collected ${audioChunks.value.length} chunks`)
      stream.getTracks().forEach(track => track.stop())

      // Check if we have any data
      if (audioChunks.value.length === 0) {
        console.warn('No audio data collected during recording')
      }
    }

    recordingTime.value = 0
    timerInterval.value = setInterval(() => {
      recordingTime.value++
    }, 1000)

    // Request data every 1000ms (1 second)
    mediaRecorder.value.start(1000)
    isRecording.value = true

    // Additional check to make sure we're getting data
    chunkInterval.value = setInterval(() => {
      if (isRecording.value && audioChunks.value.length === 0 && recordingTime.value > 2) {
        console.warn('Not receiving audio chunks after 2 seconds')
      }
    }, 2000)
  } catch (error) {
    console.error('Lỗi khi bắt đầu ghi âm:', error)
    recordingStatus.value = 'Không thể ghi âm. Vui lòng kiểm tra quyền truy cập microphone.'
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
    isRecording.value = false
    clearInterval(timerInterval.value)
    clearInterval(chunkInterval.value)
  }
}

const stopAndTranscribe = async () => {
  stopRecording()
  isModalOpen.value = false // Ẩn modal NGAY LẬP TỨC khi ấn Dừng

  // Vẫn gửi API và xử lý như cũ
  recordingStatus.value = 'Đang chuyển giọng nói thành văn bản...'

  try {
    if (audioChunks.value.length === 0) {
      if (import.meta.env.DEV) {
        const dummyAudio = await createDummyAudio()
        audioChunks.value = [dummyAudio]
      } else {
        throw new Error('Không thu được âm thanh. Vui lòng kiểm tra microphone của bạn và thử lại.')
      }
    }

    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
    if (audioBlob.size === 0) {
      throw new Error('Không có dữ liệu âm thanh nào được ghi lại')
    }

    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')

    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Lỗi máy chủ: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    if (result.text || result.reply) {
      emit('transcription', result.text || result.reply)
    }
    // Không cần setTimeout đóng modal nữa vì đã đóng ngay ở trên
  } catch (error) {
    // Có thể log lỗi, không cần hiển thị lên modal nữa
    console.error('Lỗi khi gửi âm thanh:', error)
  } finally {
    resetState()
  }
}

defineExpose({ openModal })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-icon {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-icon:hover {
  color: #333;
}

.recording-status {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.visualizer-container {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 15px 0;
}

.wave-menu {
  border: 2px solid #54dbe5;
  border-radius: 30px;
  width: 180px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  background: #fff;
}

.wave-menu li {
  list-style: none;
  height: 25px;
  width: 3px;
  border-radius: 8px;
  background: #54dbe5;
  margin: 0 5px;
  animation: wave1 0.3s infinite alternate;
}

.wave-menu li:nth-child(2) {
  animation: wave2 0.3s 0.2s infinite alternate;
}

.wave-menu li:nth-child(3) {
  animation: wave3 0.4s 0.23s infinite alternate;
}

.wave-menu li:nth-child(4) {
  animation: wave4 0.3s 0.1s infinite alternate;
}

.wave-menu li:nth-child(5) {
  animation-delay: 0.5s;
}

.wave-menu li:nth-child(6) {
  animation: wave2 0.5s infinite alternate;
}

.wave-menu li:nth-child(8) {
  animation: wave4 0.25s 0.4s infinite alternate;
}

.wave-menu li:nth-child(9) {
  animation: wave3 0.3s 0.15s infinite alternate;
}

@keyframes wave1 {
  from {
    transform: scaleY(1);
  }

  to {
    transform: scaleY(0.5);
  }
}

@keyframes wave2 {
  from {
    transform: scaleY(0.3);
  }

  to {
    transform: scaleY(0.6);
  }
}

@keyframes wave3 {
  from {
    transform: scaleY(0.6);
  }

  to {
    transform: scaleY(0.8);
  }
}

@keyframes wave4 {
  from {
    transform: scaleY(0.2);
  }

  to {
    transform: scaleY(0.5);
  }
}

.idle-indicator {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pulse-ring {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(84, 219, 229, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }

  70% {
    transform: scale(1.2);
    opacity: 0;
  }

  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}

.mic-icon-large {
  font-size: 36px;
}

.recording-time {
  font-size: 20px;
  font-weight: bold;
  margin: 10px 0;
}

.controls {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.control-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #54dbe5, #3492de);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  min-width: 100px;
}

.control-btn:hover {
  transform: translateY(-1px);
}

.control-btn.recording {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
}

@media (max-width: 480px) {
  .modal-content {
    width: 90%;
    padding: 15px;
  }
}
</style>
