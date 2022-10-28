let map;
let markers = [];

//TODO: this is just a placeholder, please replace as soon as possible
let trafficCams;
fetch("https://raw.githubusercontent.com/Tri-Le-Viet/CAB432-assignment2/main/trafficCams.json?token=GHSAT0AAAAAAB2DTCX6LSEZIOGQEP4GLPHIY2YOCZQ").then(response => response.json())
  .then((data) => trafficCams = data);

function initMap() {
  let myLatLng = {
    lat: -266.26563,
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
    }, map, trafficCams[i].properties.description, markers);
  }
}

function addMarker(coords, map, label, markers) {
  let new_marker = new google.maps.Marker({
    position: coords,
    map: map
  });

  let info_window = new google.maps.InfoWindow({
    content: label
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
