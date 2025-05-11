<template>
  <div class="map-wrapper bg-slate-800 rounded-lg overflow-hidden flex flex-col h-full">

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

    <!-- Thêm khu vực hiển thị chỉ số không khí ở phía dưới bản đồ -->
    <div class="flex bg-white text-slate-800 p-4 shadow-inner">
      <div class="flex-1 flex flex-col items-center justify-center border-r border-slate-200">
        <div class="text-3xl font-bold text-blue-600">
          {{ hoveredLocation ? hoveredLocation.name : '--' }}
        </div>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center border-r border-slate-200">
        <div class="text-4xl font-bold" :class="getAQIColor(hoveredLocation?.AQI)">
          {{ hoveredLocation ? hoveredLocation.AQI : '--' }}
        </div>
        <div class="text-sm text-slate-500">AQI</div>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center">
        <div class="text-xl font-medium" :class="getAQIColor(hoveredLocation?.AQI)">
          {{ hoveredLocation ? hoveredLocation.desc : '--' }}
        </div>
        <div class="text-sm text-slate-500">Tình trạng</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geoData from '@/assets/gis_quan_HN_HCM.json'
import vnBoundary from '@/assets/gadm41_VNM_1.json'

// Initialize the map store
const mapStore = useMapStore()
const hoveredLocation = ref(null) // { name: '', AQI: 0 }
const legendExpanded = ref(false)
const currentCity = ref('-')
const currentAQI = ref('-')
const map = ref(null)
const geoLayer = ref(null)
const vnLayer = ref(null) // Add a separate layer for Vietnam boundaries

// Computed property to access location data from the store
const locationData = computed(() => {
  if (!mapStore.hasData) {
    console.log('No data in mapStore')
    return {}
  }

  // Create a map object with location names as keys
  const dataMap = {}

  // Log available locations for debugging
  console.log('Available mapStore locations:', mapStore.locations)

  mapStore.locations.forEach((location, index) => {
    dataMap[location] = {
      AQI: mapStore.AQI[index],
      CO: mapStore.CO[index],
      SO2: mapStore.SO2[index],
      PM25: mapStore.PM25[index]
    }
  })

  return dataMap
})

function toggleLegend() {
  legendExpanded.value = !legendExpanded.value
}

// Lấy màu dựa trên chỉ số AQI cho phần hiển thị ở dưới
function getAQIColor(aqi) {
  if (aqi <= 50) return 'text-green-500'
  if (aqi <= 100) return 'text-yellow-500'
  if (aqi <= 150) return 'text-orange-500'
  if (aqi <= 200) return 'text-red-500'
  if (aqi > 200) return 'text-purple-600'
  return 'text-gray-400'
}

// Lấy mô tả tình trạng dựa trên chỉ số AQI
function getAQIDescription(aqi) {
  if (aqi <= 50) return 'Tốt'
  if (aqi <= 100) return 'Trung bình'
  if (aqi <= 150) return 'Kém'
  if (aqi <= 200) return 'Xấu'
  if (aqi > 200) return 'Nguy hại'
  return 'Không có dữ liệu'
}

function getColor(aqi) {
  if (aqi === undefined || aqi === null) return '#9ca3af' // gray-400 cho không có dữ liệu
  if (aqi <= 50) return '#10b981' // green-500
  if (aqi <= 100) return '#facc15' // yellow-400
  if (aqi <= 150) return '#f97316' // orange-500
  if (aqi <= 200) return '#ef4444' // red-500
  if (aqi > 200) return '#9333ea' // purple-600
  return '#9ca3af' // fallback gray-400
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

// Function to update the map with new data
function updateMap() {
  if (!map.value) return

  const city = mapStore.city
  currentCity.value = city === 'all' ? 'Việt Nam' : (city || 'Hà Nội')

  if (mapStore.mostPollutedLocation) {
    currentAQI.value = mapStore.mostPollutedLocation.AQI
  }

  // Clear existing layers
  if (geoLayer.value) {
    map.value.removeLayer(geoLayer.value)
    geoLayer.value = null
  }

  if (vnLayer.value) {
    map.value.removeLayer(vnLayer.value)
    vnLayer.value = null
  }

  let fitOptions = { padding: [50, 50], maxZoom: 11 }

  if (city === 'all') {
    // Handle nationwide view
    console.log('Rendering nationwide map view')
    map.value.setMinZoom(5)

    try {
      // Log the vnBoundary structure to debug
      console.log('VN Boundary structure:',
        vnBoundary ?
          `Found - Features: ${vnBoundary.features?.length}` :
          'Not found')

      // Create GeoJSON layer for Vietnam provinces - ensure it's properly structured
      if (vnBoundary && vnBoundary.features && vnBoundary.features.length > 0) {
        vnLayer.value = L.geoJSON(vnBoundary, {
          style: feature => {
            // Log the first feature to debug property access
            if (!window._loggedFeature) {
              console.log('Sample feature:', feature)
              window._loggedFeature = true
            }

            const name = feature.properties.NAME_1
            const data = locationData.value[name]
            const aqi = data?.AQI

            return {
              fillColor: getColor(aqi),
              weight: 1.5,
              color: '#1e293b',
              fillOpacity: 0.8
            }
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties.NAME_1
            const data = locationData.value[name]

            try {
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

              // Add hover effects
              layer.on({
                mouseover: () => {
                  layer.setStyle({
                    weight: 3,
                    color: '#0ea5e9', // sky-500
                    fillOpacity: 0.9
                  })
                  layer.bringToFront()
                  layer.openTooltip()

                  // Update current location info when hovering
                  if (data) {
                    currentCity.value = name
                    currentAQI.value = data.AQI
                    hoveredLocation.value = {
                      name,
                      AQI: data.AQI,
                      desc: getAQIDescription(data.AQI)
                    }
                  } else {
                    hoveredLocation.value = null
                  }
                },
                mouseout: () => {
                  vnLayer.value?.resetStyle(layer)
                  layer.closeTooltip()

                  // Reset to default info when not hovering
                  currentCity.value = 'Việt Nam'
                  if (mapStore.mostPollutedLocation) {
                    currentAQI.value = mapStore.mostPollutedLocation.AQI
                  } else {
                    currentAQI.value = 132 // Default value
                  }
                  hoveredLocation.value = null
                },
                click: () => {
                  map.value.fitBounds(layer.getBounds(), {
                    padding: [50, 50],
                    maxZoom: 8
                  })

                  // Update current location info when clicking
                  if (data) {
                    currentCity.value = name
                    currentAQI.value = data.AQI
                  }
                }
              })
            } catch (e) {
              console.error('Error processing feature:', e, feature)
            }
          },
          pane: 'shadowPane'
        }).addTo(map.value)

        // Fit to Vietnam bounds if layer was created successfully
        if (vnLayer.value && vnLayer.value.getBounds) {
          try {
            const bounds = vnLayer.value.getBounds()
            if (bounds.isValid()) {
              fitOptions = { padding: [20, 20], maxZoom: 6 }
              map.value.fitBounds(bounds, fitOptions)
            } else {
              // Fallback to a default view of Vietnam if bounds are invalid
              map.value.setView([16.0544, 107.9836], 5)
            }
          } catch (e) {
            console.error('Error setting bounds:', e)
            // Fallback to a default view of Vietnam
            map.value.setView([16.0544, 107.9836], 5)
          }
        } else {
          // Fallback if layer creation failed
          console.warn('Fallback to default Vietnam view')
          map.value.setView([16.0544, 107.9836], 5)
        }
      } else {
        console.error('Vietnam boundary data is not properly structured')
        // Set a default view for Vietnam
        map.value.setView([16.0544, 107.9836], 5)
      }
    } catch (e) {
      console.error('Error rendering nationwide map:', e)
      // Fallback to a default view of Vietnam
      map.value.setView([16.0544, 107.9836], 5)
    }
  } else {
    // Handle city view (Hanoi or HCM)
    map.value.setMinZoom(10)

    let features = []
    if (city === 'Hà Nội') {
      features = geoData.features.filter(f => f.properties.NAME_1 === 'Hà Nội')
    } else if (city === 'HCM' || city === 'Hồ Chí Minh') {
      features = geoData.features.filter(f => f.properties.NAME_1 === 'Hồ Chí Minh')
    } else {
      // Default to Hanoi
      features = geoData.features.filter(f => f.properties.NAME_1 === 'Hà Nội')
    }

    // Create GeoJSON layer for districts
    geoLayer.value = L.geoJSON({
      ...geoData,
      features
    }, {
      style: feature => {
        const name = feature.properties.NAME_2
        const data = locationData.value[name]
        const aqi = data?.AQI
        return {
          fillColor: getColor(aqi),
          weight: 1.5,
          color: '#1e293b',
          fillOpacity: 0.8
        }
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.NAME_2
        const data = locationData.value[name]
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

        // Add hover effects for districts
        layer.on({
          mouseover: () => {
            layer.setStyle({
              weight: 3,
              color: '#0ea5e9', // sky-500
              fillOpacity: 0.9
            })
            layer.bringToFront()
            layer.openTooltip()

            // Update current location info when hovering
            if (data) {
              currentCity.value = name
              currentAQI.value = data.AQI
              hoveredLocation.value = {
                name,
                AQI: data.AQI,
                desc: getAQIDescription(data.AQI)
              }
            } else {
              hoveredLocation.value = null
            }
          },
          mouseout: () => {
            geoLayer.value.resetStyle(layer)
            layer.closeTooltip()

            // Reset to default info when not hovering
            currentCity.value = city || 'Hà Nội'
            if (mapStore.mostPollutedLocation) {
              currentAQI.value = mapStore.mostPollutedLocation.AQI
            } else {
              currentAQI.value = 132 // Default value
            }
            hoveredLocation.value = null
          },
          click: () => {
            map.value.fitBounds(layer.getBounds(), {
              padding: [50, 50],
              maxZoom: 12
            })

            // Update current location info when clicking
            if (data) {
              currentCity.value = name
              currentAQI.value = data.AQI
            }
          }
        })
      },
      pane: 'shadowPane'
    }).addTo(map.value)

    // Fit to city bounds
    const bounds = geoLayer.value.getBounds()
    map.value.fitBounds(bounds, fitOptions)
  }

  // Force map to update its size
  map.value.invalidateSize()
}

// Watch for changes in the map store
watch(() => mapStore.city, (newCity) => {
  if (newCity) {
    console.log('Updating map for city:', newCity)
    updateMap()
  }
})

// Watch locationData để cập nhật màu khi dữ liệu đổi
watch(locationData, () => {
  updateMap() // Simply call updateMap since it already handles setting styles properly
}, { deep: true })

onMounted(() => {
  // Need to wait a bit for the DOM to be fully rendered
  setTimeout(() => {
    // Log that we're initializing the map
    console.log('Initializing map component')

    try {
      // Initialize the map
      map.value = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([21.0285, 105.8542], 11)

      // Set minimum zoom level (will be adjusted based on view)
      map.value.setMinZoom(10)

      // Use a dark theme tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap & CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map.value);

      // Create a shadow pane for highlight effect
      map.value.createPane('shadowPane')
      map.value.getPane('shadowPane').style.zIndex = 450

      // Log that we're now running the initial map update
      console.log('Running initial map update')

      // Initial map update based on current city
      updateMap()

      // Force map to update its size
      map.value.invalidateSize()

      console.log('Map initialization complete')
    } catch (e) {
      console.error('Error during map initialization:', e)
    }
  }, 200) // Increased timeout for more reliable DOM readiness
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
  min-height: 380px;
  /* giảm một chút chiều cao để chừa chỗ cho phần thông tin ở dưới */
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
