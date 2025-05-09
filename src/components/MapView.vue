<template>
  <div class="map-wrapper bg-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
    <div
      class="p-4 font-bold text-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md flex items-center">
      <div class="text-cyan-300 mr-3 text-2xl">🗺️</div>
      <div>Bản đồ Ô nhiễm</div>
    </div>

    <div class="relative flex-grow">
      <div id="map" class="map-container w-full h-full z-0"></div>

      <!-- Toggle button for legend -->
      <div class="absolute bottom-4 right-4 z-10">
        <!-- Collapsed legend button -->
        <button v-if="!legendExpanded" @click="toggleLegend"
          class="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-slate-600 shadow-lg hover:bg-slate-700 transition-all duration-300">
          <span class="text-cyan-300 text-xl">≡</span>
        </button>

        <!-- Expanded legend -->
        <div v-else class="bg-slate-800 bg-opacity-90 rounded-lg p-3 border border-slate-600 shadow-lg w-48">
          <div class="flex justify-between items-center text-cyan-300 font-bold mb-2 text-lg">
            <div class="flex items-center">
              <span class="mr-2">📌</span> Chú thích AQI
            </div>
            <button @click="toggleLegend" class="text-cyan-300 hover:text-cyan-100 focus:outline-none">
              <span class="text-xl leading-none">&times;</span>
            </button>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-green-500 mr-2"></span>
              <span class="text-white">Tốt (0-50)</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-yellow-400 mr-2"></span>
              <span class="text-white">Trung bình (51-100)</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-orange-500 mr-2"></span>
              <span class="text-white">Kém (101-150)</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-red-500 mr-2"></span>
              <span class="text-white">Xấu (151-200)</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-purple-600 mr-2"></span>
              <span class="text-white">Nguy hại (>200)</span>
            </div>
            <div class="flex items-center">
              <span class="w-3 h-3 rounded-sm bg-gray-400 mr-2"></span>
              <span class="text-white">Không có dữ liệu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geoData from '@/assets/gis_quan_HN_HCM.json'

const legendExpanded = ref(false)

function toggleLegend() {
  legendExpanded.value = !legendExpanded.value
}

const dummyData = {
  "Ba Đình": { AQI: 45, CO: 0.5, SO2: 10, PM25: 15 },
  "Ba Vì": { AQI: 88, CO: 0.8, SO2: 15, PM25: 25 },
  "Cầu Giấy": { AQI: 123, CO: 1.2, SO2: 20, PM25: 35 },
  "Hoàn Kiếm": { AQI: 175, CO: 2.0, SO2: 30, PM25: 50 },
  "Long Biên": { AQI: 210, CO: 2.5, SO2: 40, PM25: 60 }
}

function getColor(aqi) {
  if (aqi <= 50) return '#10b981' // green-500
  if (aqi <= 100) return '#facc15' // yellow-400
  if (aqi <= 150) return '#f97316' // orange-500
  if (aqi <= 200) return '#ef4444' // red-500
  if (aqi > 200) return '#9333ea' // purple-600
  return '#9ca3af' // gray-400
}

// Function to calculate the centroid of a polygon or multipolygon
function getCentroid(feature) {
  let coords = []
  if (feature.geometry.type === 'Polygon') {
    coords = feature.geometry.coordinates[0]
  } else if (feature.geometry.type === 'MultiPolygon') {
    coords = feature.geometry.coordinates[0][0] // Use first polygon for simplicity
  }

  let latSum = 0, lngSum = 0, count = 0
  coords.forEach(coord => {
    latSum += coord[1]
    lngSum += coord[0]
    count++
  })

  return [latSum / count, lngSum / count]
}

onMounted(() => {
  // Need to wait a bit for the DOM to be fully rendered
  setTimeout(() => {
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([21.0285, 105.8542], 11)

    // Set minimum zoom level to prevent zooming out too far
    map.setMinZoom(10)

    // Use a dark theme tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap & CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Create a shadow pane for highlight effect
    map.createPane('shadowPane')
    map.getPane('shadowPane').style.zIndex = 450

    // Filter GeoJSON to include only Hà Nội districts
    const hanoiFeatures = geoData.features.filter(feature => feature.properties.NAME_1 === 'Hà Nội')
    const filteredGeoData = {
      ...geoData,
      features: hanoiFeatures
    }

    // Create GeoJSON layer
    const geoLayer = L.geoJSON(filteredGeoData, {
      style: feature => {
        const name = feature.properties.NAME_2
        const aqi = dummyData[name]?.AQI || null
        return {
          fillColor: getColor(aqi),
          weight: 1.5,
          color: '#1e293b', // slate-800
          fillOpacity: 0.8
        }
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.NAME_2
        const data = dummyData[name]
        const centroid = getCentroid(feature)
        const tooltipContent = data
          ? `<div style="font-family: 'Inter', sans-serif;">
             <div style="font-weight: bold; font-size: 16px; text-align: center; margin-bottom: 5px; color: #22d3ee;">${name}</div>
             <div style="padding: 5px; background: rgba(15, 23, 42, 0.7); border-radius: 4px;">
               <div>AQI: <span style="font-weight: bold; color: ${getColor(data.AQI)};">${data.AQI}</span></div>
               <div>CO: ${data.CO} ppm</div>
               <div>SO₂: ${data.SO2} µg/m³</div>
               <div>PM2.5: ${data.PM25} µg/m³</div>
             </div>
           </div>`
          : `<div style="font-family: 'Inter', sans-serif;">
             <div style="font-weight: bold; font-size: 16px; text-align: center; color: #22d3ee;">${name}</div>
             <div style="padding: 5px;">Không có dữ liệu</div>
           </div>`

        // Bind tooltip to the centroid of the district
        const tooltip = L.tooltip({
          permanent: false,
          direction: 'top',
          offset: [0, -20],
          opacity: 0.95,
          className: 'custom-tooltip'
        })
          .setContent(tooltipContent)
          .setLatLng(centroid)

        layer.bindTooltip(tooltip)

        // Show/hide tooltip on hover
        layer.on({
          mouseover: () => {
            layer.setStyle({
              weight: 3,
              color: '#0ea5e9', // sky-500
              fillOpacity: 0.9
            })
            layer.bringToFront()
            layer.openTooltip()
          },
          mouseout: () => {
            geoLayer.resetStyle(layer)
            layer.closeTooltip()
          },
          click: () => {
            map.fitBounds(layer.getBounds(), {
              padding: [50, 50],
              maxZoom: 12
            })
          }
        })
      },
      pane: 'shadowPane'
    }).addTo(map)

    // Fit map to Hà Nội districts' bounds
    const bounds = geoLayer.getBounds()
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 11
    })

    // Force map to update its size
    map.invalidateSize()
  }, 100)
})
</script>

<style scoped>
.map-wrapper {
  height: 100%;
  width: 100%;
}

.map-container {
  background-color: #0f172a;
  /* slate-900 */
  min-height: 400px;
}

/* Animation for legend toggle */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: scale(1.05);
}

/* Transition effect for the legend */
.absolute {
  transition: all 0.3s ease-in-out;
}

:global(.custom-tooltip) {
  background-color: #1e293b;
  /* slate-800 */
  color: #f1f5f9;
  /* slate-100 */
  font-size: 14px;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
  border: 1px solid #334155;
  /* slate-600 */
}

:global(.leaflet-tooltip.custom-tooltip::before) {
  border-top-color: #1e293b;
  /* slate-800 */
}

:global(.leaflet-control-container .leaflet-control) {
  background-color: #1e293b;
  /* slate-800 */
  color: #f1f5f9;
  /* slate-100 */
  border: 1px solid #334155;
  /* slate-600 */
}

/* Fix for empty space issue */
:global(.leaflet-container) {
  height: 100%;
  width: 100%;
}
</style>
