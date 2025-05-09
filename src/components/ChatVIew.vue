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
          'max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md',
          msg.sender === 'user'
            ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
            : 'bg-gray-200 text-gray-800'
        ]">
          {{ msg.text }}
          <div v-if="msg.timestamp" class="text-xs mt-1 opacity-70"
            :class="msg.sender === 'user' ? 'text-white' : 'text-gray-600'">
            {{ formatTimestamp(msg.timestamp) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="flex items-end p-4 bg-gray-100 space-x-2 border-t border-gray-300">
      <textarea v-model="newMessage" placeholder="Nhập tin nhắn..." rows="1" @input="autoResize"
        class="flex-1 border border-gray-300 bg-white text-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none overflow-hidden transition-all duration-200"></textarea>

      <button @click="recordVoice"
        class="bg-gray-200 text-cyan-600 px-3 py-2 border border-gray-300 hover:bg-gray-300 rounded-full h-12 transition-colors duration-200">
        🎤
      </button>
      <button @click="sendMessage"
        class="bg-cyan-500 text-white px-4 py-2 rounded-full hover:bg-cyan-400 h-12 transition-colors duration-200">
        Gửi
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const messages = ref([
  { sender: 'bot', text: 'Xin chào! Tôi là Trợ lý Ô nhiễm.', timestamp: new Date() },
  { sender: 'user', text: 'Chào bạn, tôi cần kiểm tra chất lượng không khí.', timestamp: new Date() },
  { sender: 'bot', text: 'Bạn vui lòng nhập khu vực bạn muốn kiểm tra?', timestamp: new Date() },
  { sender: 'user', text: 'Tp. Hồ Chí Minh, Quận 1.', timestamp: new Date() },
  { sender: 'bot', text: 'AQI hiện tại: 125 (Không tốt cho người nhạy cảm).', timestamp: new Date() },
  { sender: 'user', text: 'Cảm ơn bạn!', timestamp: new Date() },
  { sender: 'bot', text: 'Bạn có cần thêm thông tin gì không?', timestamp: new Date() },
  { sender: 'user', text: 'Không, cảm ơn!', timestamp: new Date() },
  { sender: 'bot', text: 'Chúc bạn một ngày tốt lành!', timestamp: new Date() }
])

const newMessage = ref('')
const chatContainer = ref(null)
const isRecording = ref(false)

function sendMessage() {
  if (newMessage.value.trim() !== '') {
    messages.value.push({ sender: 'user', text: newMessage.value, timestamp: new Date() })
    setTimeout(() => {
      messages.value.push({ sender: 'bot', text: 'Bot đã nhận tin nhắn: ' + newMessage.value, timestamp: new Date() })
    }, 800)
    newMessage.value = ''
    autoResize()
  }
}

function recordVoice() {
  isRecording.value = !isRecording.value

  if (isRecording.value) {
    alert('Đang ghi âm...')
  } else {
    alert('Đã dừng ghi âm')
  }
}

function autoResize(event) {
  const textarea = event ? event.target : document.querySelector('textarea')
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
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

// Watch for changes in messages and scroll to bottom
watch(messages, () => {
  setTimeout(scrollToBottom, 0)
}, { deep: true })

// Scroll to bottom on initial load
scrollToBottom()
</script>

<style scoped></style>
