// First plot start and end markers of search
let start_data = document.getElementById("start_data").innerHTML;
start_data = start_data.substring(1, start_data.length - 1).split(",");
let start_coords = {
  lat: parseFloat(start_data[0]),
  lng: parseFloat(start_data[1])
}

let start_name = "Starting Location: " + document.getElementById("start").value;
addMarker(start_coords, map, start_name, "start");

let end_data = document.getElementById("end_data").innerHTML;
end_data = end_data.substring(1, end_data.length - 1).split(",");
let end_coords = {
  lat: parseFloat(end_data[0]),
  lng: parseFloat(end_data[1])
}

let end_name = "Destination: " + document.getElementById("end").value;
addMarker(end_coords, map, end_name, "end");

// Plot each waypoint
let waypoints = JSON.parse(document.getElementById("waypoint_data").innerHTML);
for (let i = 0; i < waypoints.length; i++) {
  let coords = {
    lat: waypoints[i][0],
    lng: waypoints[i][1]
  };
  addMarker(coords, map, "Waypoint " + String(i + 1), "waypoint");
}

// Next plot data for each camera
const template = "\<div><b>Camera: camera_name</b></div><div><canvas id='camera_name'></canvas></div>"
let traffic_data = JSON.parse(document.getElementById("traffic_data").innerHTML);

for(let i=0; i < traffic_cams.length; i++) {
  let info_window = info_windows[i];
  let camera_name = traffic_cams[i].properties.description;
  let info = template.replace(/camera_name/g, camera_name);
  info_window.setContent(info);

  let labels = [];
  let dataset = [];

  for (let j = 0; j < traffic_data[i].images.length; j++) {
    let image = traffic_data[i].images[j];
    let name = image.loggedImage.length;
    labels.push(image.loggedImage.substring(name - 15, name - 4));
    dataset.push(image.results);
  }

  let data = {
    labels: lables,
    data: dataset
  };

  let newChart = new Chart(document.getElementById(camera_name), {
    type: "line",
    data: data,
    options: {}
  });
}
