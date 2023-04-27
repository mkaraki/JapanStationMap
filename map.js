let lastZoom = 14, lastPos = {};
const map = L.map('map').setView({ lat: 35.6580992222, lng: 139.7413574722 }, 14);

L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
}).addTo(map);

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

    lastPos = mapCurrentCenter;
    lastZoom = mapCurrentZoom;

    const mapBounds = map.getBounds();

    const renderStations = stations.filter((s) => {
        return (
            s.lat > mapBounds.getSouthWest().lat - 0.5 &&
            s.lat < mapBounds.getNorthEast().lat + 0.5 &&
            s.lon > mapBounds.getSouthWest().lng - 0.5 &&
            s.lon < mapBounds.getNorthEast().lng + 0.5
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

    if (mapCurrentZoom > 12 || renderStations.length < 250) {
        voronoiObjects = voronoi(renderStations.map(function (v) {
            return [v.lat, v.lon];
        }));

        renderStations.forEach((s, i) => {
            const popupText = s.station_name + '駅';

            //const marker = L.marker([s.lat, s.lon]).addTo(map).bindPopup(s.station_name);
            const marker = L.circleMarker([s.lat, s.lon], { radius: 7, fillOpacity: 1, attribution: '<a href="https://ekidata.jp/">駅データ．ｊｐ</a>' }).addTo(map);
            marker.bindPopup(popupText);
            mapMarkers.push({ station_cd: s.station_cd, marker: marker });

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

map.on('move', updateMarkers);
map.on('zoom', updateMarkers);