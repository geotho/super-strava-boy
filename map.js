const pubStravaToken = "57a2e0bbc8a2789e2a56cb2f911d76d6ce48b5e5";
const cross = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_close_black_16px.svg"

let map;

const streams = [];
const markers = [];

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 51.508235, lng: -0.324592},
    zoom: 16,
    styles: [
      // {
      //   featureType: "all",
      //   elementType: "labels",
      //   stylers: [
      //     { visibility: "off" },
      //   ],
      // },
    ],
  });

  fetchCommutes("to_work")
    .then(x => x.map(j => j.id))
    .then(ids => {
      const proms = [];
      for (const id of ids) {
        proms.push(fetchActivity(id).then(x => {
          if (x.stream[0].point.lng < -0.321546) {
            return;
          }
          map.data.addGeoJson(makeGeoJson(x.stream));
          return x;
        }))
      }
      return Promise.all(proms);
    })
    .then(activities => {
      const minTime = activities.filter(Boolean).map(a => a.stream[0].time).sort()[0];
      console.log("minTime = ", minTime);
      for (const a of activities.filter(Boolean)) {
        relativeTime(a);
        streams.push(a.stream);
        markers.push(new google.maps.Marker({
          position: a.stream[0].point,
          map: map,
        }));
      }

      console.log("markers = ", markers);
      console.log("streams = ", streams);

      console.log(streams.filter(Boolean).map(s => posAtTimeT(s, 1447666275)))
    })
}

function moveMarkersToTimeT(t) {
  for (let i = 0; i < streams.length; i++) {
    markers[i].setPosition(posAtTimeT(streams[i], t));
  }
}

function makeGeoJson(stream) {
  return {
    type: "Feature",
    properties: {
      color: "blue",
    },
    geometry: {
      type: "LineString",
      coordinates: stream.map(s => [s.point.lng, s.point.lat]),
    }
  };
}


function fetchCommutes(direction) {
  const p = fetch("activities200.json")
    .then(x => x.json())

  if (direction === "to_work") {
    // get the morning commutes
    return p.then(acts => acts.filter(a => new Date(a.start_date).getHours() < 12))
  } else if (direction === "from_work") {
    // get the evening commutes
    return p.then(acts => acts.filter(a => new Date(a.start_date).getHours() >= 12))
  }
  return p
}

function fetchActivity(id) {
  return fetch("https://nene.strava.com/flyby/stream_compare/" + id + "/" + id)
    .then(x => x.json())
}

function posAtTimeT(activity, t) {
  const i = greatestIndexLessThanT_v1(activity, t);
  const p1 = JSON.parse(JSON.stringify(activity[i]));
  if (i === activity.length - 1) {
    activity.push(activity[i]);
  }

  const p2 = JSON.parse(JSON.stringify(activity[i+1]));

  t -= p1.time;
  if (p1.time === p2.time) {
    return p1.point;
  }
  p2.time -= p1.time;
  p1.time -= p1.time;
  t /= p2.time;

  return {
    lat: (1-t) * p1.point.lat + t * p2.point.lat,
    lng: t * p1.point.lng + (1-t) * p2.point.lng,
  }
}

function greatestIndexLessThanT_v1(activity, t) {
  let i = 0;

  while (i < activity.length - 1 && !(activity[i].time <= t && t <= activity[i+1].time)) {
    i++;
  }

  return i;
}

function greatestIndexLessThanT_v2(activity, t) {
  let start = 0;
  let end = activity.length - 1;
  let i = Math.floor((start + end) / 2);

  while (!(activity[i].time <= t && t <= activity[i+1].time)) {
    if (activity[i].time <= t) {
      start = i + 1;
      i = Math.floor((start + end) / 2);
    }
  }

  return i;

}

function relativeTime(activity) {
  const minTime = activity.stream[0].time;
  for (const s of activity.stream) {
    s.time -= minTime;
  }
}

function play() {
  let i = 0;
  setInterval(() => {
    moveMarkersToTimeT(i);
    i += 1;
  }, 10)
}

function onSlider() {
  const slider = document.getElementById("time");
  const t = parseInt(slider.value);
  moveMarkersToTimeT(t);
}
