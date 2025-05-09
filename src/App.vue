<template>
  <div class="flex h-screen bg-cyan-900 p-4 gap-4">
    <ChatView class="w-1/3 rounded-lg overflow-hidden shadow-2xl" />
    <MapView class="flex-1 rounded-lg overflow-hidden shadow-2xl" />
  </div>
</template>

<script setup>
import ChatView from './components/ChatView.vue'
import MapView from './components/MapView.vue'
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
  background-color: #164e63;
  /* cyan-900 */
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #0c4a6e;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #38bdf8;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0ea5e9;
}
</style>
