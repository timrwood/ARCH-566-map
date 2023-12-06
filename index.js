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

var lng = +readLocalStorage("map.lng", -87.7);
var lat = +readLocalStorage("map.lat", 41.86);
var zoom = +readLocalStorage("map.zoom", 10);

if (location.search === "?export") {
  document.body.classList.add("export");
}

if (location.search === "?page") {
  document.body.classList.add("page");
  lng = -87.65;
  lat = 41.86;
  zoom = 14;

  // 0.5 = 1165 px = 0.5688476562
}

if (location.search === "?plot") {
  document.body.classList.add("plot");
  lng = -87.7;
  lat = 41.86;
  zoom = 11.5;
}

var map = new maplibregl.Map({
  container: "map",
  style: "style-build.json",
  center: [lng, lat],
  zoom: zoom,
});

// var xratio = 0.05688476562;
var xratio = 0.0878582202;
// var yratio = 0.04944086074;
var yratio = 0.0654494382;

// min = 41.64
// max = 42.02
// average = 41.83

// min = -87.86
// max = -87.52
// average = -87.69

// 41.97961161002717, -87.85911190244606
// 42.023229073363666, -87.6729293568596
// 41.64501496942171, -87.52432141290845

window.setTile = function (x, y) {
  map.setZoom(14);
  map.setCenter([-87.7 + x * xratio, 41.83 + y * yratio]);
};

// Add zoom and rotation controls to the map.
map.addControl(new maplibregl.NavigationControl());

map.on("moveend", (e) => {
  const center = map.getCenter();
  writeLocalStorage("map.lng", center.lng);
  writeLocalStorage("map.lat", center.lat);
});

map.on("zoomend", (e) => {
  console.log("zoomend", map.getZoom());
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
    this.path = this.buildSvgPath();
    this.category.group.appendChild(this.path);
  }

  isValid() {
    return this.lat && this.lng;
  }

  buildSvgPath() {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", window.getIconPath(this.category.name));
    path.setAttribute("transform", this.svgTransform());
    return path;
  }

  svgTransform() {
    const x = (2048 * (this.lng + 87.7 + xratio * 2.5)) / xratio;
    const y = (2048 * (41.83 - this.lat + yratio * 4.5)) / yratio;
    return `translate(${x - 12}, ${y - 12}) scale(5)`;

    // -87.7 + x * xratio, 41.83 + y * yratio
  }

  buildMarker() {
    if (!this.isValid()) return null;

    // create marker with popup
    const el = document.createElement("div");
    el.className = "marker";
    el.innerHTML = this.category.buildSvgIcon();

    return new maplibregl.Marker({ element: el })
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
  constructor(name, glyph) {
    this.name = name;
    this.glyph = glyph;
    this.isActive = readLocalStorage(this.isActiveKey(), "true") === "true";
    this.locations = [];
    // create svg group node
    this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.group.setAttribute("id", this.name);
    this.group.setAttribute("serif:id", this.name);
    document.querySelector("#svg").appendChild(this.group);
  }

  buildSvgIconForeground() {
    return `<svg viewBox="-6 -6 36 36" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
      <path class="icon-foreground" d="${window.getIconPath(this.name)}" />
    </svg>`;
  }

  buildSvgIconBackground() {
    return `<svg viewBox="-6 -6 36 36" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
      <path class="icon-background" d="${window.getIconPath(this.name)}" />
    </svg>`;
  }

  buildSvgIcon() {
    return this.buildSvgIconBackground() + this.buildSvgIconForeground();
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

  if (categoryName && !categories[categoryName]) {
    categories[categoryName] = new Category(categoryName, color);
  }

  return categories[categoryName];
}

function addMarker(data) {
  const category = addCategory([data[0], "?"]);
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
    span.classList.add("category");
    span.appendChild(document.createTextNode(category.name));

    const glyph = document.createElement("span");
    glyph.classList.add("glyph");
    glyph.innerHTML = category.buildSvgIcon();
    span.appendChild(glyph);

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
