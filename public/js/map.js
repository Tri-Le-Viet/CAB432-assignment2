let map;
let markers = [];

const trafficCams = JSON.parse(document.getElementById("data").innerHTML);
const icon_base = "http://maps.google.com/mapfiles/kml/shapes/";

function initMap() {
  let myLatLng = {
    lat: -27.445664,
    lng: 152.668992
  };
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 9,
    center: myLatLng,
  });

  const camera_icon = {
    url:icon_base + "camera.png", // TODO: maybe find a better looking icon
    scaledSize: new google.maps.Size(15, 15),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0)
  };

  //TODO: add event listener to map for start and end points
  /*
  map.addListener("new_start_location", () => {

    addMarker({
      lat:
      lng:
    }, map,
    })
  })*/

  for(let i=0; i < trafficCams.length; i++) {
    let coordinates = trafficCams[i].geometry.coordinates;
    addMarker({
      lat: coordinates[1],
      lng: coordinates[0]
    }, map, markers, trafficCams[i].properties.description, camera_icon);
  }
}

function addMarker(coords, map, markers, marker_name, icon) {
  let new_marker;
  if (icon) {
    new_marker = new google.maps.Marker({
      position: coords,
      icon: icon,
      map: map
    });

  } else {
    console.log(coords);
    new_marker = new google.maps.Marker({
      position: coords,
      map: map
    });
  }

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

// TOOD: initMap for search page
// should display route
// only relevant cameras
// and graph of data for each camera
//
