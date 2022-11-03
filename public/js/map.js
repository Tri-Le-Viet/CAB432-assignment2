let map;
let markers = [];


const trafficCams = JSON.parse(document.getElementById("data").innerHTML);

const icon_base = "http://maps.google.com/mapfiles/kml/shapes/";
const camera_icon = icon_base + "camera.png";

function initMap() {
  let myLatLng = {
    lat: -26.26563,
    lng: 150.478155
  };
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: myLatLng,
  });

  //TODO: add event listener to map for start and end points

  for(let i=0; i < trafficCams.length; i++) {
    let coordinates = trafficCams[i].geometry.coordinates;
    addMarker({
      lat: coordinates[1],
      lng: coordinates[0]
    }, map, trafficCams[i].properties.description, markers, camera_icon);
  }
}

function addMarker(coords, map, marker_name, markers, icon) {
  let new_marker = new google.maps.Marker({
    position: coords,
    icon: icon,
    map: map
  });

  let info_window = new google.maps.InfoWindow({
    content: marker_name
  });

  new_marker.addListener("click", () => {
    info_window.open({
      anchor: new_marker,
      map: map
    });
  });

  markers.push(new_marker);
}

// TODO: see if this is necessary, delete otherwise
// also markers array may be unneeded also
function deleteMarkers(markers) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }

  markers = [];
}

// TOOD: initMap for search page
// should display route
// only relevant cameras
// and graph of data for each camera
//
