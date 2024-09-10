
const map = new L.Map('map', { zoom: 12 })

const layer = new L.TileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=4f3a2d6bb33747d89ca9a12fc87fd088', {
  maxZoom: 18,
  attribution: 'Maps © <a href="https://www.thunderforest.com">Thunderforest</a> | Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
})

map.addLayer(layer)

const locationControl = L.control.locate({ setView: 'untilPan' }).addTo(map)

let foundLocation = false

const initialParams = new URLSearchParams(location.hash.replace('#', ''))

if (initialParams.has('c')) {
  map.setView(parseLatLng(initialParams.get('c')), parseInt(initialParams.get('z') || 12))
  foundLocation = true
}

if ("geolocation" in navigator && "permissions" in navigator) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") {
      locationControl.start()
      if (foundLocation) {
        locationControl._userPanned = true
      }
    } else if (!foundLocation) {
      map.setView(new L.LatLng(52.52, 13.405), 12)
      foundLocation = true
    }
  })
}

/** @param {string} latLng */
function parseLatLng(latLng) {
  return new L.LatLng(...latLng.split('_').map(Number))
}

/** @param {L.LatLng} latLng */
function serializeLatLng(latLng) {
  return [latLng.lat.toFixed(4), latLng.lng.toFixed(4)].join('_')
}

map.on('move', () => {
  foundLocation = true
  const url = new URL(location.href)
  const hashParams = new URLSearchParams()
  hashParams.set('c', serializeLatLng(map.getCenter()))
  hashParams.set('z', map.getZoom())
  url.hash = hashParams
  history.replaceState(null, '', url)
})
