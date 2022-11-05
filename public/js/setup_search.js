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
    lng: waypoint[i][1]
  };
  addMarker(coords, map, "Waypoint " + String(i + 1), "waypoint");
}

// Next plot data for each camera
const template = "<div><b>Camera: camera_name</b></div>"

for(let i=0; i < traffic_cams.length; i++) {
  let info_window = info_windows[i];
  let info = template.replace(/camera_name/, traffic_cams[i].properties.description);
  //TODO: get camera data and graph then add onto end of info
  info_window.setContent(info);

}
