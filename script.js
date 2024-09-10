
const map = new L.Map('map')

const layer = new L.TileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=4f3a2d6bb33747d89ca9a12fc87fd088', {
  maxZoom: 18,
  attribution: 'Maps © <a href="https://www.thunderforest.com">Thunderforest</a> | Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
})

map.addLayer(layer)

const locationControl = L.control.locate().addTo(map)

if ("geolocation" in navigator && "permissions" in navigator) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") {
      locationControl.start()
    } else {
      map.setView(new L.LatLng(52.52, 13.405), 12)
    }
  })
}
