let start;
let end;

// set up autocomplete forms for starting and end location
function setupForms() {
  let start_input = document.getElementById("start");
  let end_input = document.getElementById("end");

  start = new google.maps.places.Autocomplete(
    start_input,
    {
      componentRestrictions: {"country": "AU"},
      fields: ["place_id", "geometry", "name"]
    });

  end = new google.maps.places.Autocomplete(
    end_input,
    {
      componentRestrictions: {"country": "AU"},
      fields: ["place_id", "geometry", "name"]
    });

  start.addListener("place_changed", () => {
    onPlaceChanged("start");
  });
  end.addListener("place_changed", () => {
    onPlaceChanged("end");
  });

  initMap();
}

function onPlaceChanged(form_type) {
  let place;

  if (form_type === "start") {
    place = start.getPlace();
  } else if (form_type === "end") {
    place = end.getPlace();
  } else {
    //TODO: some form of error handling
  }

  if (!place.geometry || !place.geometry.location) {
    document.getElementById("autocomplete").placeholder = "Enter a place";
  } else {
    let lat = place.geometry.location.lat();
    let long = place.geometry.location.lng();
    let coords = "{" + lat + ","  + long + "}";


    // TODO: send an event to map to create a pin for start and end location
    if (form_type === "start") {
      document.getElementById("start_coords").value = coords;
    } else if (form_type === "end") {
      document.getElementById("end_coords").value = coords;
    }
  }
}
