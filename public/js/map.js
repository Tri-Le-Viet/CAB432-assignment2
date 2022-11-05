let map;
let markers = [];
let info_windows = [];
let start_marker;
let end_marker;

// Load traffic cam names/coords from hiddent div
const traffic_cams = JSON.parse(document.getElementById("cam_data").innerHTML);
const icon_base = "http://maps.google.com/mapfiles/kml/";

// Create different icon markers
let camera_icon;
let start_icon;
let end_icon;

// Initialise map and add markers for all trafic cams
function initMap() {
  let my_lat_long = {
    lat: -27.445664,
    lng: 152.668992
  };
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 9,
    center: my_lat_long,
  });

  // Resize icons to ensure they are roughly the same
  camera_icon = {
    url:icon_base + "shapes/camera.png", // TODO: maybe find a better looking icon
    scaledSize: new google.maps.Size(15, 15),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0)
  };

  start_icon = {
    url: "img/start.png",
    scaledSize: new google.maps.Size(25, 25),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0)
  }

  end_icon = {
    url: "img/finish.png",
    scaledSize: new google.maps.Size(20, 20),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0)
  }

  waypoint_icon = {
    url:icon_base + "paddle/red-circle.png",
    scaledSize: new google.maps.Size(15, 15),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0)
  }

  // Create marker for each camera
  for(let i=0; i < traffic_cams.length; i++) {
    let coordinates = traffic_cams[i].geometry.coordinates;
    addMarker({
      lat: coordinates[1],
      lng: coordinates[0]
    }, map, traffic_cams[i].properties.description, "camera");
  }
}

// Add a new marker to the map
function addMarker(coords, map, marker_name, type) {
  let icon;
  if (type === "camera") {
    icon = camera_icon;

  } else if (type === "waypoint") {
    icon = waypoint_icon;
    
  }else if (type === "start") {
    icon = start_icon;

    // clear old start marker if present
    if (start_marker) {
      deleteMarker(markers, start_marker);
    }

    // new marker is pushed to end of list so this is index of new start_marker
    start_marker = markers.length;

  } else if (type === "end") {
    icon = end_icon;

    // clear old end marker if present
    if (end_marker) {
      deleteMarker(markers, end_marker);
    }

    end_marker = markers.length;
  }

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
  info_windows.push(info_window);
}

// Deletes map marker at specified index in array
function deleteMarker(markers, index) {
  markers[index].setMap(null);
  markers.splice(index, 1);
  info_windows.splice(index, 1);
}
