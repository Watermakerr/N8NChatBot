<template>
  <div class="flex h-screen bg-gray-100 p-4 gap-4">
    <ChatView class="w-1/3 rounded-lg overflow-hidden shadow-2xl" />
    <MapView class="flex-1 rounded-lg overflow-hidden shadow-2xl" />
  </div>
</template>

<script setup>
import ChatView from './components/ChatVIew.vue'
import MapView from './components/MapView.vue'
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
  background-color: #f3f4f6;
  /* gray-100 */
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #e5e7eb;
  /* gray-200 */
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #60a5fa;
  /* blue-400 */
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
  /* blue-500 */
}
</style>z
