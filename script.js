const latLngSeparator = '_'
const markerSeparator = '~'

const map = new L.Map('map', { zoom: 12 })

const layer = new L.TileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=4f3a2d6bb33747d89ca9a12fc87fd088', {
  maxZoom: 18,
  attribution: [
    '<a href="https://github.com/liamcmitchell/cycle-map">Source</a>',
    'Maps © <a href="https://www.thunderforest.com">Thunderforest</a>',
    'Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  ].join(' | ')
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
  return new L.LatLng(...latLng.split(latLngSeparator).map(Number))
}

/** @param {L.LatLng} latLng */
function serializeLatLng(latLng) {
  return [latLng.lat.toFixed(4), latLng.lng.toFixed(4)].join(latLngSeparator)
}

map.on('move', () => {
  foundLocation = true
  updateUrl()
})


/** @type {Set<L.Marker>} */
const markers = new Set()

/** @param {L.LatLng} latlng */
function addMarker(latlng) {
  const marker = L.marker(latlng, { draggable: true })
  const fadeTime = 2000
  const fadeOut = () => {
    if (marker.removeTime) {
      const elapsedTime = Date.now() - marker.removeTime
      const remainingTime = Math.max(0, fadeTime - elapsedTime)
      if (remainingTime) {
        marker.setOpacity(0.8 * (remainingTime / fadeTime))
        requestAnimationFrame(fadeOut)
      } else {
        marker.removeFrom(map)
        markers.delete(marker)
      }
    }
  }
  marker.on('click', () => {
    if (marker.removeTime) {
      marker.removeTime = undefined
      marker.setOpacity(1)
    } else {
      marker.removeTime = Date.now()
      fadeOut()
    }
    updateLines()
    updateUrl()
  })
  marker.on('dragstart', () => {
    if (marker.removeTime) {
      marker.removeTime = undefined
      marker.setOpacity(1)
      updateUrl()
    }
  })
  marker.on('dragend', updateUrl)
  marker.on('dragend', updateLines)
  marker.addTo(map)
  markers.add(marker)
}

if (initialParams.has('m')) {
  initialParams.get('m').split(markerSeparator).map(parseLatLng).map(addMarker)
}

map.on('click', (event) => {
  addMarker(event.latlng)
  updateLines()
  updateUrl()
})

function updateUrl() {
  const url = new URL(location.href)
  const hashParams = new URLSearchParams()
  hashParams.set('c', serializeLatLng(map.getCenter()))
  hashParams.set('z', map.getZoom())
  const activeMarkers = Array.from(markers).filter((marker) => !marker.removeTime)
  if (activeMarkers.length) {
    hashParams.set('m', activeMarkers.map(marker => serializeLatLng(marker.getLatLng())).join(markerSeparator))
  }
  url.hash = hashParams
  history.replaceState(null, '', url)
}

/** @type {Set<L.Polyline>} */
const lines = new Set()

function updateLines() {
  lines.forEach((line) => {
    line.removeFrom(map)
    lines.delete(line)
  })

  const points = [locationControl._marker, ...markers]
    .filter((marker) => marker && !marker.removeTime)
    .map(marker => marker.getLatLng())

  points.forEach((latlng) => {
    const distances = points
      .map(ll => [ll, latlng.distanceTo(ll)])
      .sort((a, b) => a[1] - b[1])
    distances.slice(1, 3).forEach(([ll, distance]) => {
      const line = L.polyline([latlng, ll])
        .bindTooltip((distance / 1000).toFixed(1) + 'km', { permanent: true })
        .addTo(map)
      lines.add(line)
    })
  })
}

map.on('locationfound', updateLines)

updateLines()