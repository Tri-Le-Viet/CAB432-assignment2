let start;
let end;

// set up autocomplete forms for starting and end location
function setupForms() {
  let start_input = document.getElementById("start");
  let end_input = document.getElementById("end");

  let autocomplete_config = {
    componentRestrictions: {"country": "AU"},
    fields: ["place_id", "geometry", "name"]
  };

  start = new google.maps.places.Autocomplete(start_input, autocomplete_config);
  end = new google.maps.places.Autocomplete(end_input, autocomplete_config);


  // Add listeners to update coordinates after new location is selected
  start.addListener("place_changed", () => {
    onPlaceChanged("start");
  });
  end.addListener("place_changed", () => {
    onPlaceChanged("end");
  });

  initMap();
}

// Depending on which form was changed update the coordinates for
// either the start or the destination
function onPlaceChanged(form_type) {
  let place;

  if (form_type === "start") {
    place = start.getPlace();
  } else if (form_type === "end") {
    place = end.getPlace();
  }

  if (!place.geometry || !place.geometry.location) {
    document.getElementById("autocomplete").placeholder = "Enter a place";
  } else {
    let lat = place.geometry.location.lat();
    let long = place.geometry.location.lng();
    let lat_long = {
      lat: lat,
      lng: long
    };

    let coords = "{" + lat + ","  + long + "}";

    if (form_type === "start") {
      let name = "Starting Location: " + place.name
      document.getElementById("start_coords").value = coords;
      addMarker(lat_long, map, name, "start");

    } else if (form_type === "end") {
      let name = "Destination: " + place.name
      document.getElementById("end_coords").value = coords;
      addMarker(lat_long, map, name, "end");
    }
  }
}


// Verifies that form has been properly filled in before submitting
function check_form() {
  let start_name = document.getElementById("start").value;
  let end_name = document.getElementById("end").value;
  let start_coords = document.getElementById("start_coords").value;
  let end_coords = document.getElementById("end_coords").value;

  // If any of the form elements is not properly filled in send warning and
  // prevent user from submitting
  if (start_name == "" || end_name == "" ||
    start_coords == "" || end_coords == "") {

    // Change CSS class to make warning visible
    document.getElementById("warning").className = "warning";

  } else {
    document.getElementById("warning").className = "hidden";
    document.getElementById("search_form").submit();
  }
}
