/**
 * Sample JavaScript code for sheets.spreadsheets.values.get
 * See instructions for running APIs Explorer code samples locally:
 * https://developers.google.com/explorer-help/code-samples#javascript
 */

function writeLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

function readLocalStorage(key, defaultValue) {
  const value = localStorage.getItem(key);
  if (value == null) return defaultValue;
  return value;
}

var map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.stadiamaps.com/styles/stamen_toner.json", // Style URL; see our documentation for more options
  center: [
    +readLocalStorage("map.lng", -87.7),
    +readLocalStorage("map.lat", 41.86),
  ], // Initial focus coordinate
  zoom: +readLocalStorage("map.zoom", 10),
});

// Add zoom and rotation controls to the map.
map.addControl(new maplibregl.NavigationControl());

map.on("moveend", (e) => {
  const center = map.getCenter();
  writeLocalStorage("map.lng", center.lng);
  writeLocalStorage("map.lat", center.lat);
});

map.on("zoomend", (e) => {
  writeLocalStorage("map.zoom", map.getZoom());
});

const categories = {};

function loadClient() {
  gapi.client.setApiKey("AIzaSyB4qtVkB2VImogUtOe1IjPbUZJqwJvSl3E");
  return gapi.client.load(
    "https://sheets.googleapis.com/$discovery/rest?version=v4"
  );
}

function loadLocations() {
  return gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1T-OE9_qtHuFrp4i7PDuKUwgMhDdkDJpn03Axm62x3Dk",
      range: "LOCATIONS!A1:D1000",
    })
    .then(
      (response) => response.result.values.forEach(addMarker),
      (err) => console.error("Execute error", err)
    );
}

function loadCategories() {
  return gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1T-OE9_qtHuFrp4i7PDuKUwgMhDdkDJpn03Axm62x3Dk",
      range: "LOCATIONS!A1:D1000",
    })
    .then(
      function (response) {
        // Handle the results here (response.result has the parsed body).
        console.log("Response", response);
        console.log(response.result.values);
        response.result.values.forEach(addMarker);
      },
      function (err) {
        console.error("Execute error", err);
      }
    );
}

class Location {
  constructor(name, lat, lng, category) {
    this.name = name;
    this.lat = +lat;
    this.lng = +lng;
    this.category = category;
    this.marker = this.buildMarker();
  }

  isValid() {
    return this.lat && this.lng;
  }

  buildMarker() {
    return new maplibregl.Marker({
      color: "red",
    }).setLngLat([this.lng, this.lat]);
  }

  add() {
    this.marker.addTo(map);
  }

  remove() {
    this.marker.remove();
  }
}

class Category {
  constructor(name) {
    this.name = name;
    this.isActive = readLocalStorage(this.isActiveKey(), "true") === "true";
    this.locations = [];
  }

  isActiveKey() {
    return `category.active.${this.name}`;
  }

  setActive(isActive) {
    this.isActive = isActive;
    writeLocalStorage(this.isActiveKey(), isActive);
  }

  add(location) {
    this.locations.push(location);
  }
}

function addMarker(data, i) {
  const categoryName = data[0];

  if (!categories[categoryName]) {
    categories[categoryName] = new Category(categoryName);
  }
  const location = new Location(data[1], data[2], data[3]);

  if (location.isValid()) {
    categories[categoryName].add(location);
  } else {
    console.log("Invalid location", location.name, location.lat, location.lng);
  }
}

function render() {
  Object.values(categories).forEach((category) => {
    category.locations.forEach((location) => {
      if (category.isActive) {
        location.add();
      } else {
        location.remove();
      }
    });
  });
}

function computeActiveState() {
  document
    .querySelectorAll('#controls input[type="checkbox"]')
    .forEach((checkbox) =>
      categories[checkbox.value].setActive(checkbox.checked)
    );
}

function buildCheckboxes() {
  document.addEventListener("change", (event) => {
    if (event.target.closest('#controls input[type="checkbox"]')) {
      computeActiveState();
      render();
    }
  });

  Object.values(categories).forEach((category) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = category.name;
    checkbox.value = category.name;
    checkbox.checked = category.isActive;

    const label = document.createElement("label");
    label.appendChild(document.createTextNode(category.name));
    label.appendChild(checkbox);

    document.querySelector("#controls").appendChild(label);
  });
}

// gapi.load("client", function () {
//   loadClient().then(execute);
// });

addMarker(["One", "", "41.8726358", "-87.6395327"], 0);
addMarker(["Two", "", "41.9014178", "-87.6428567"], 1);
addMarker(["Three", "", "41.8726358", "-87.6428567"], 2);
buildCheckboxes();
render();
