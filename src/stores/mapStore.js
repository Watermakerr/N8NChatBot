// stores/mapStore.js
import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', {
  state: () => ({
    city: '',
    locations: [],
    AQI: [],
    CO: [],
    SO2: [],
    PM25: [],
    lastUpdated: null,
  }),

  getters: {
    hasData: (state) => state.locations.length > 0,

    // Get data for specific location by index
    getLocationData: (state) => (index) => {
      if (index < 0 || index >= state.locations.length) return null

      return {
        name: state.locations[index],
        AQI: state.AQI[index],
        CO: state.CO[index],
        SO2: state.SO2[index],
        PM25: state.PM25[index],
      }
    },

    // Get all location data as an array of objects
    allLocationsData: (state) => {
      return state.locations.map((location, index) => ({
        name: location,
        AQI: state.AQI[index],
        CO: state.CO[index],
        SO2: state.SO2[index],
        PM25: state.PM25[index],
      }))
    },

    // Get location with highest AQI
    mostPollutedLocation: (state) => {
      if (!state.locations.length) return null

      const maxIndex = state.AQI.reduce(
        (maxIndex, current, index, array) => (current > array[maxIndex] ? index : maxIndex),
        0,
      )

      return {
        name: state.locations[maxIndex],
        AQI: state.AQI[maxIndex],
        CO: state.CO[maxIndex],
        SO2: state.SO2[maxIndex],
        PM25: state.PM25[maxIndex],
      }
    },
  },

  actions: {
    // Update map data from API response
    updateFromApiResponse(data) {
      if (!data) return

      this.city = data.map || ''
      this.locations = data.location || []
      this.AQI = data.AQI || []
      this.CO = data.CO || []
      this.SO2 = data.SO2 || []
      this.PM25 = data.PM25 || []
      this.lastUpdated = new Date()
    },

    // Clear all data
    clearData() {
      this.city = ''
      this.locations = []
      this.AQI = []
      this.CO = []
      this.SO2 = []
      this.PM25 = []
    },
  },
})
