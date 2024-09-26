const latLngSeparator = "_"
const markerSeparator = "*"
const linkSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'
const clearSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
const tickSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>'
const shareSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>'

let foundLocation = false

const map = new L.Map("map", { zoom: 12 })

const layer = new L.TileLayer(
  "https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=4f3a2d6bb33747d89ca9a12fc87fd088",
  {
    maxZoom: 18,
    attribution: [
      '<a href="https://github.com/liamcmitchell/cycle-map">Source</a>',
      'Maps © <a href="https://www.thunderforest.com">Thunderforest</a>',
      'Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    ].join(" | "),
  },
)

map.addLayer(layer)

const locationControl = L.control
  .locate({
    keepCurrentZoomLevel: true,
    onLocationError: () => {},
  })
  .addTo(map)

/** @param {string} latLng */
function parseLatLng(latLng) {
  return new L.LatLng(...latLng.split(latLngSeparator).map(Number))
}

/** @param {L.LatLng} latLng */
function serializeLatLng(latLng) {
  return [latLng.lat.toFixed(4), latLng.lng.toFixed(4)].join(latLngSeparator)
}

function formatDistance(distance = 0) {
  return `${(distance / 1000).toFixed(1)} km`
}

map.on("move", () => {
  foundLocation = true
  updateUrl()
})

const pointIcon = L.divIcon({
  className: "point-icon",
  iconSize: [16, 16],
})

/** @type {L.Marker[]} */
const markers = []

/**
 * @param {L.LatLng} latlng
 * @param {number} [index]
 */
function addMarker(latlng, index) {
  const marker = L.marker(latlng, {
    draggable: true,
    icon: pointIcon,
  })
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
        markers.splice(markers.indexOf(marker), 1)
      }
    }
  }
  marker.on("click", () => {
    if (marker.removeTime) {
      marker.removeTime = undefined
      marker.setOpacity(1)
    } else {
      marker.removeTime = Date.now()
      fadeOut()
    }
    updateMap()
    updateUrl()
  })
  marker.on("dragstart", () => {
    if (marker.removeTime) {
      marker.removeTime = undefined
      marker.setOpacity(1)
      updateUrl()
    }
  })
  marker.on("dragend", updateUrl)
  marker.on("dragend", updateMap)
  marker.addTo(map)
  if (index) {
    markers.splice(index, 0, marker)
  } else {
    markers.push(marker)
  }
}

map.on("click", (event) => {
  addMarker(event.latlng)
  updateMap()
  updateUrl()
})

/** @param {L.Marker[]} markers */
function createUrl(markers) {
  const url = new URL(location.href)
  const hashParams = new URLSearchParams()
  hashParams.set("c", serializeLatLng(map.getCenter()))
  hashParams.set("z", map.getZoom())
  if (markers?.length) {
    hashParams.set(
      "m",
      markers
        .map((marker) => serializeLatLng(marker.getLatLng()))
        .join(markerSeparator),
    )
  }
  url.hash = hashParams
  return url
}

function actuallyUpdateUrl() {
  history.replaceState(
    null,
    "",
    createUrl(markers.filter((marker) => !marker.removeTime)),
  )
}

let updateUrlTimeout
function updateUrl() {
  clearTimeout(updateUrlTimeout)
  updateUrlTimeout = setTimeout(actuallyUpdateUrl, 100)
}

/** @type {Set<L.Polyline>} */
const lines = new Set()

function updateMap() {
  lines.forEach((line) => {
    line.removeFrom(map)
    lines.delete(line)
  })

  const points = markers
    .filter((marker) => marker && !marker.removeTime)
    .map((marker) => marker.getLatLng())

  cycleControl.update(points.length > 0)

  let totalDistance = 0

  points.forEach((from, index) => {
    const to = points[index + 1]

    if (!to) return

    const distance = from.distanceTo(to)
    totalDistance += distance

    const line = L.polyline([from, to], {
      weight: 6,
      bubblingMouseEvents: false,
    })

    line.on("click", (event) => {
      addMarker(event.latlng, index + 1)
      updateMap()
      updateUrl()
    })

    line.addTo(map)
    lines.add(line)

    const pixels = map.project(from).distanceTo(map.project(to))

    if (pixels > 60) {
      const tooltip = L.tooltip({
        content: (distance / 1000).toFixed(1) + " km",
        direction: "center",
        permanent: true,
        interactive: true,
        bubblingMouseEvents: false,
      })
      line.bindTooltip(tooltip)
    }
  })

  totalDistanceControl.update(totalDistance)
}

map.on("locationfound", updateMap)
map.on("zoomend", updateMap)

const CycleControl = L.Control.extend({
  /** @type {HTMLAnchorElement} */
  _clearLink: undefined,
  onAdd() {
    const container = L.DomUtil.create(
      "div",
      "leaflet-bar leaflet-control cycle-control",
    )

    const clearLink = (this._clearLink = L.DomUtil.create(
      "a",
      "leaflet-bar-part leaflet-bar-part-single clear-control",
      container,
    ))
    clearLink.title = "Clear map (use browser back to undo)"
    clearLink.href = "#"
    clearLink.setAttribute("role", "button")
    clearLink.innerHTML = clearSvg
    L.DomEvent.on(clearLink, "click", L.DomEvent.stopPropagation)
    L.DomEvent.on(clearLink, "click", L.DomEvent.preventDefault)
    L.DomEvent.on(clearLink, "dblclick", L.DomEvent.stopPropagation)
    L.DomEvent.on(clearLink, "click", () => {
      location.assign(createUrl())
    })

    const canShare = navigator.canShare({ url: location.href })
    const shareLink = (this._shareLink = L.DomUtil.create(
      "a",
      "leaflet-bar-part leaflet-bar-part-single share-control",
      container,
    ))
    shareLink.title = canShare ? "Share" : "Copy link"
    shareLink.href = "#"
    shareLink.setAttribute("role", "button")
    const shareIcon = canShare ? shareSvg : linkSvg
    shareLink.innerHTML = shareIcon
    L.DomEvent.on(shareLink, "click", L.DomEvent.stopPropagation)
    L.DomEvent.on(shareLink, "click", L.DomEvent.preventDefault)
    L.DomEvent.on(shareLink, "dblclick", L.DomEvent.stopPropagation)
    L.DomEvent.on(shareLink, "click", () => {
      const shareData = {
        title: document.title,
        url: location.href,
      }
      navigator
        .share(shareData)
        .catch(() => navigator.clipboard.writeText(shareData.url).then(() => {
          shareLink.innerHTML = tickSvg
          setTimeout(() => {
            shareLink.innerHTML = shareIcon
          }, 1000)
        })
        .catch(() => {
          alert("Failed to copy link")
        }))
        
    })

    return container
  },
  update(haveMarkers) {
    if (!haveMarkers) {
      this._clearLink.classList.add("leaflet-disabled")
    } else {
      this._clearLink.classList.remove("leaflet-disabled")
    }
    this._shareLink.href = location.href
  },
})

const cycleControl = new CycleControl({ position: "topleft" }).addTo(map)

var totalDistanceControl = L.control()

totalDistanceControl.onAdd = function () {
  this._div = L.DomUtil.create(
    "div",
    "leaflet-control leaflet-bar total-distance",
  )
  this.update()
  return this._div
}

totalDistanceControl.update = function (distance) {
  this._div.innerHTML = formatDistance(distance)
}

totalDistanceControl.addTo(map)

function updateState() {
  const params = new URLSearchParams(location.hash.replace("#", ""))

  if (params.has("c")) {
    map.setView(parseLatLng(params.get("c")), parseInt(params.get("z") || 12))
    foundLocation = true
  }

  while (markers.length) {
    markers.pop().removeFrom(map)
  }

  if (params.has("m")) {
    params.get("m").split(/[\*~]/).map(parseLatLng).map(addMarker)
  }
}

window.addEventListener("hashchange", () => {
  updateState()
  updateMap()
})

updateState()

if ("geolocation" in navigator && "permissions" in navigator) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") {
      locationControl.start()
      if (foundLocation) {
        locationControl._userPanned = true
      } else {
        setTimeout(() => {
          map.setView(new L.LatLng(52.52, 13.405), 12)
          foundLocation = true
        }, 1000)
      }
    } else if (!foundLocation) {
      map.setView(new L.LatLng(52.52, 13.405), 12)
      foundLocation = true
    }
  })
}

updateMap()
