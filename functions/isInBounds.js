// Determines if a point is within the bounds drawn by two points
function isInBounds(start_location, end_location, point, radius) {
  if (isNumBetween(start_location[0], end_location[0], point[1], radius) &&
    isNumBetween(start_location[1], end_location[1], point[0], radius)) {

    return true;
  }

  return false;
}

// Determines if a given number is within set of bounds +- some radius
function isNumBetween(bound1, bound2, num, radius) {
  if ((((bound1 - radius) < num) && ((bound2 + radius) > num)) ||
    (((bound1 + radius) > num) && ((bound2 - radius) < num))) {

    return true;
  }

  return false;
}

module.exports = { isInBounds }
