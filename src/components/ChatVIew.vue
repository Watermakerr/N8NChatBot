<template>
  <div class="flex flex-col h-full bg-gray-100 overflow-hidden rounded-lg">
    <!-- Header -->
    <div
      class="p-4 font-bold text-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md flex items-center">
      <div class="text-cyan-200 mr-3 text-2xl">🤖</div>
      <div>Trợ lý Ô nhiễm</div>
    </div>

    <!-- Chat content -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
      <div v-for="(msg, idx) in messages" :key="idx" class="flex"
        :class="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
        <div :class="[
          'max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md relative group',
          msg.sender === 'user'
            ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
            : 'bg-gray-200 text-gray-800'
        ]">
          <div v-html="msg.text"></div>
          <div v-if="msg.timestamp" class="text-xs mt-1 opacity-70"
            :class="msg.sender === 'user' ? 'text-white' : 'text-gray-600'">
            {{ formatTimestamp(msg.timestamp) }}
          </div>

          <!-- Audio button for bot messages with audio -->
          <div v-if="msg.sender === 'bot' && msg.audioUrl"
            class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button @click="playAudio(msg.audioUrl)"
              class="w-8 h-8 bg-cyan-500 text-white rounded-full shadow-lg hover:bg-cyan-600 transition-colors duration-200 flex items-center justify-center text-sm">
              🔊
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="flex items-end p-4 bg-gray-100 space-x-2 border-t border-gray-300">
      <textarea v-model="newMessage" placeholder="Nhập tin nhắn..." rows="1" @keydown.enter.prevent="sendMessage"
        class="flex-1 border border-gray-300 bg-white text-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y overflow-auto transition-all duration-200">
      </textarea>

      <button @click="recordVoice"
        class="bg-gray-200 text-cyan-600 px-3 py-2 border border-gray-300 hover:bg-gray-300 rounded-full h-12 transition-colors duration-200">
        🎤
      </button>
      <button @click="sendMessage"
        class="bg-cyan-500 text-white px-4 py-2 rounded-full hover:bg-cyan-400 h-12 transition-colors duration-200">
        Gửi
      </button>
    </div>

    <RecordModal ref="recordModalRef" @transcription="handleTranscription" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import RecordModal from './RecordModal.vue'

const recordModalRef = ref(null)
const mapStore = useMapStore()
const messages = ref([
  { sender: 'bot', text: 'Xin chào! Tôi là Trợ lý Ô nhiễm.', timestamp: new Date() },
  { sender: 'user', text: 'Chào bạn, tôi cần kiểm tra chất lượng không khí.', timestamp: new Date() },
  { sender: 'bot', text: 'Bạn vui lòng nhập khu vực bạn muốn kiểm tra?', timestamp: new Date() },
  { sender: 'user', text: 'Tp. Hồ Chí Minh, Quận 1.', timestamp: new Date() },
  { sender: 'bot', text: 'AQI hiện tại: 125 (Không tốt cho người nhạy cảm).', timestamp: new Date() },
])

const newMessage = ref('')
const chatContainer = ref(null)

// Function to convert base64 to audio URL
function base64ToAudioUrl(base64String) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:audio\/[^;]+;base64,/, '')

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create blob and URL
    const blob = new Blob([bytes], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error converting base64 to audio:', error)
    return null
  }
}

// Function to play audio
function playAudio(audioUrl) {
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.play().catch(error => {
      console.error('Error playing audio:', error)
    })
  }
}

async function sendMessage() {
  if (newMessage.value.trim() !== '') {
    messages.value.push({ sender: 'user', text: newMessage.value, timestamp: new Date() })
    const userInput = newMessage.value
    newMessage.value = ''

    try {
      const response = await fetch('http://127.0.0.1:8000/send-to-webhook', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: userInput
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      console.log('API response:', data)

      // Create message object
      const botMessage = {
        sender: 'bot',
        text: data.reply,
        timestamp: new Date()
      }

      // Add audio URL if audioBase64 exists and map is null
      if (data.map === null && data.audioBase64) {
        const audioUrl = base64ToAudioUrl(data.audioBase64)
        if (audioUrl) {
          botMessage.audioUrl = audioUrl
        }
      }

      messages.value.push(botMessage)

      // Update map data if available
      if (data.map && data.map !== 'none') {
        mapStore.city = data.map
        mapStore.locations = data.location || []
        mapStore.AQI = data.AQI || []
        mapStore.CO = data.CO || []
        mapStore.SO2 = data.SO2 || []
        mapStore.PM25 = data.PM25 || []
        console.log('Map data updated in store:', mapStore.city)
      }
    } catch (error) {
      console.error('Lỗi:', error)
      messages.value.push({
        sender: 'bot',
        text: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.',
        timestamp: new Date()
      })
    }
  }
}

function recordVoice() {
  recordModalRef.value?.openModal()
}

function handleTranscription(text) {
  newMessage.value = text
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

watch(messages, () => {
  setTimeout(scrollToBottom, 0)
}, { deep: true })

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
/* Custom styles */
</style>
