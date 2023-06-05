let defaultMapState = JSON.parse(localStorage.getItem('lastMapState') ?? '[{"lat":35.6580992222,"lng":139.7413574722},14]');
let lastZoom = -1, lastPos = {};
const map = L.map('map').setView(defaultMapState[0], defaultMapState[1]);

L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'ab',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

const lc = L.control.locate().addTo(map);
lc.start();

const voronoi = d3.geom.voronoi()
    .clipExtent([[0, 110], [60, 170]]);

let stations = [];

window.onload = () => {
    d3.csv('./s20230327.csv', function (s) {
        stations = s;
        setTimeout(() => {
            updateMarkers();
        }, 0);
    });
};

let mapMarkers = [];
let mapVoronoiPolygons = [];

function updateMarkers() {
    const mapCurrentCenter = map.getCenter();
    const mapCurrentZoom = map.getZoom();

    if (
        mapCurrentZoom == lastZoom &&
        Math.abs(mapCurrentCenter.lat - lastPos.lat) < 0.2 &&
        Math.abs(mapCurrentCenter.lng - lastPos.lng) < 0.2
    ) {
        return;
    }

    const mapBounds = map.getBounds();

    const renderStations = stations.filter((s) => {
        return (
            s.lat > mapBounds.getSouthWest().lat - 0.5 &&
            s.lat < mapBounds.getNorthEast().lat + 0.5 &&
            s.lon > mapBounds.getSouthWest().lng - 0.5 &&
            s.lon < mapBounds.getNorthEast().lng + 0.5
        );
    });

    const displayStations = renderStations.filter((s) => {
        return (
            s.lat > mapBounds.getSouthWest().lat &&
            s.lat < mapBounds.getNorthEast().lat &&
            s.lon > mapBounds.getSouthWest().lng &&
            s.lon < mapBounds.getNorthEast().lng
        );
    });

    mapMarkers.forEach((m) => {
        map.removeLayer(m.marker);
    });
    mapMarkers = [];

    mapVoronoiPolygons.forEach((p) => {
        map.removeLayer(p);
    });
    mapVoronoiPolygons = [];

    lastPos = mapCurrentCenter;
    lastZoom = mapCurrentZoom;

    localStorage.setItem('lastMapState', JSON.stringify([lastPos, lastZoom]));

    if (mapCurrentZoom > 12 || displayStations.length < 150) {
        voronoiObjects = voronoi(renderStations.map(function (v) {
            return [v.lat, v.lon];
        }));

        renderStations.forEach((s, i) => {
            const popupText = s.station_name + '駅';

            //const marker = L.marker([s.lat, s.lon]).addTo(map).bindPopup(s.station_name);
            if (!mapMarkers.some((v) => v.station_cd === s.station_cd)) {
                const marker = L.circleMarker([s.lat, s.lon], { radius: 7, fillOpacity: 1, attribution: '<a href="https://ekidata.jp/">駅データ．ｊｐ</a>' }).addTo(map);
                marker.bindPopup(popupText);
                mapMarkers.push({ station_cd: s.station_cd, marker: marker });
            }

            if (i in voronoiObjects) {
                const voronoiPaths = voronoiObjects[i].map((v) => {
                    if (Object.keys(v !== 'point'))
                        return [v[0], v[1]];
                });
                const voronoiPolygon = L.polygon(voronoiPaths, { color: 'red', fillOpacity: 0 }).addTo(map);
                voronoiPolygon.bindPopup(popupText);
                mapVoronoiPolygons.push(voronoiPolygon);
            }
        });
    }
}

map.on('moveend', updateMarkers);
map.on('zoomend', updateMarkers);