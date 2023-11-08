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
  // style: "https://tiles.stadiamaps.com/styles/stamen_toner.json", // Style URL; see our documentation for more options
  style: "style.json", // Style URL; see our documentation for more options
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

function loadCategories() {
  return gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1T-OE9_qtHuFrp4i7PDuKUwgMhDdkDJpn03Axm62x3Dk",
      range: "CATEGORIES!A2:B1000",
    })
    .then(
      (response) => response.result.values.forEach(addCategory),
      (err) => console.error("Execute error", err)
    );
}

function loadLocations() {
  return gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1T-OE9_qtHuFrp4i7PDuKUwgMhDdkDJpn03Axm62x3Dk",
      range: "LOCATIONS!A2:F1000",
    })
    .then(
      (response) => response.result.values.forEach(addMarker),
      (err) => console.error("Execute error", err)
    );
}

class Location {
  constructor(name, lat, lng, address, city, category) {
    this.name = name;
    this.lat = +lat;
    this.lng = +lng;
    this.category = category;
    this.address = address;
    this.city = city;
    this.marker = this.buildMarker();
  }

  isValid() {
    return this.lat && this.lng;
  }

  buildMarker() {
    if (!this.isValid()) return null;

    // create marker with popup
    return new maplibregl.Marker({ color: this.category.getColor() })
      .setLngLat([this.lng, this.lat])
      .setPopup(new maplibregl.Popup().setHTML(this.html()));
  }

  html() {
    return [
      `<b>${this.name || this.category.name}</b>`,
      `${this.address}, ${this.city}`,
    ].join("<br/>");
  }

  add() {
    this.marker.addTo(map);
  }

  remove() {
    this.marker.remove();
  }
}

class Category {
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.isActive = readLocalStorage(this.isActiveKey(), "true") === "true";
    this.locations = [];
  }

  getColor() {
    return `#${this.color}`;
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

function addCategory(data) {
  const categoryName = data[0];
  const color = data[1];

  if (!categories[categoryName]) {
    categories[categoryName] = new Category(categoryName, color);
  }

  return categories[categoryName];
}

function addMarker(data) {
  const category = addCategory([data[0], "ff0000"]);
  const location = new Location(
    data[1],
    data[2],
    data[3],
    data[4],
    data[5],
    category
  );

  if (location.isValid()) {
    category.add(location);
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

    const span = document.createElement("span");
    span.style.borderColor = category.getColor();
    span.appendChild(document.createTextNode(category.name));

    const label = document.createElement("label");
    label.appendChild(checkbox);
    label.appendChild(span);

    document.querySelector("#controls").appendChild(label);
  });
}

gapi.load("client", function () {
  loadClient()
    .then(loadCategories)
    .then(loadLocations)
    .then(buildCheckboxes)
    .then(render);
});
