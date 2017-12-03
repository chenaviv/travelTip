'use strict';

// TODO: add costume right-click/touch menu to each marker, with an option to remove from map (marker.setMap(null))
var API_KEY_GOOGLE = 'AIzaSyCtxbjhQQ_q5GZejP-k6U2CCi-6x460AnY';
var API_KEY_WEATHER = '0577e96c357a8d3ff8b82f365360883e';
var gState = null;
// var gQueryCoords = null;

// var testCoords = {lat: -34, lng: 151};

function queryCoords() {
    console.log('entered init');
    var queryObj = {};
    var url = location.href;
    var queryStr = url.replace(/.+\?/, '');
    var paramRegex = /([^=&]+)=([^&]+)/g
    var match = paramRegex.exec(queryStr);

    while (match) {
        queryObj[match[1]] = match[2];
        match = paramRegex.exec(queryStr)
    }
    // if (!(queryObj.hasOwnProperty('lat') && queryObj.hasOwnProperty('lng'))) return;
    var lat = +queryObj.lat;
    var lng = +queryObj.lng;
    if (isNaN(lat) || isNaN(lng)) return null;

    return {lat, lng}
}

function initMap() {
    console.log('entered init map');
    var coords = queryCoords();
    
    if (!coords) {
        coords = {lat: 32.087955, lng: 34.803147};
    }

    var map = new google.maps.Map(document.querySelector('.map'), {
        // zoom: 17,
        center: coords
    });
    var marker = new google.maps.Marker({
        position: coords
        // animation: google.maps.Animation.DROP        
    })
    gState = {map, marker};

    initSearchBox();

    handleLocation(coords, map);
    
    // handleCurrentLocation(map, coords);
}

function initSearchBox(map) {
    var elSearch = document.querySelector('.search input');
    var elBtn = document.querySelector('.search .not-btn');
    var autoComplete = new google.maps.places.Autocomplete(elSearch);
    
    autoComplete.addListener('place_changed', () => {
        let place = autoComplete.getPlace();
        console.log(place);
        if (!place.geometry) {
            console.log('Searched for:', place.name);
            console.log('TODO use geocoding to try to get the coordinates');
            return;
        }
        let coords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        }
        handleLocation(coords, map);
    })

    elBtn.addEventListener('click', _ => {
        if (!elSearch.value) return;
        google.maps.event.trigger(autoComplete, 'place_changed');
    })
}

// Mark and center map on current position, if possible.
// If not, mark and center on fallback coordinates.
// Also, send position coordinates to displayLocationData().
// 
// TODO: better solution for when geolocation request fails
function handleCurrentLocation(map, fallbackCoords) {
    map = map || gState.map;
    navigator.geolocation.getCurrentPosition(location => {
        var coords = {lat: location.coords.latitude, lng: location.coords.longitude};
        handleLocation(coords, map);
    }, err => {
        console.log(err);
        if (!fallbackCoords) return;
        // TODO: Indicate to user that current location was not handled.

        handleLocation(fallbackCoords, map)
        // the above will likely result in an array with multiple identicle markers       
        console.log('Default location marked instead');
    });
}

// Probably TODO: lose map parameters from all functions and embrace the global state
function handleLocation(coords, map) {
    map = map || gState.map;
    showMarker(coords, map);
    var prmDataObj = getLocationData(coords)

    prmDataObj.prmName.then(name => {
        document.querySelector('.location-name .name').innerText = name;
    })

    prmDataObj.prmWeather.then(weather => renderWeather(weather));
}

function showMarker(coords, map) {
    map = map || gState.map;
    var marker = gState.marker;
    map.setCenter(coords);
    map.setZoom(16);
    marker.setPosition(coords);
    marker.setAnimation(google.maps.Animation.DROP);
    marker.setMap(map);

}

function getLocationData(coords) {
    var prmName = fetchLocationName(coords)
    .then(name => name)
    .catch(err => console.error('Fetch from geocode API failed:\n', err));

    var prmWeather = fetchLocationWeather(coords)
    .then(weather => weather)
    .catch(err => console.error('Fetch from OpenWeatherMap API failed:\n', err));

    return {prmName, prmWeather};
}
        
function fetchLocationName(coords) {
    return fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${API_KEY_GOOGLE}`
    ).then(res => res.json())
    .then(data => {
        console.log(data)
        if (data.status === 'OK') return data.results[2].formatted_address;
        else return Promise.reject(`Geocode response status: ${data.status}`);
    })
    // .catch(err => console.error('Fetch from geocode API failed:', err));
}
        
function fetchLocationWeather(coords) {
    return fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&units=metric&APPID=${API_KEY_WEATHER}`
    ).then(res => res.json())
    .then(weather => {
        if (weather.cod === 200) return weather;
        else return Promise.reject(weather);
    })
    // .catch(err => console.error('Fetch from OpenWeatherMap API failed:\n', err));
}

function getWeatherTemplate(weather) {
    var temp = Math.round(weather.main.temp);

   return `
    <h2>${temp}°, ${weather.weather[0].main}</h2>
    `
}

// Wholly unscientific
function setDocColors({sunrise, sunset}) {
    var now = Date.now() / 1000; // timestamp in seconds (unix)
    var elBody = document.body;

    // return to this in more conscious state
    if (sunrise < now && now < sunset) {
        elBody.className = 'day';
    } else if (now < sunrise) {
        if (now + 45*60 >= sunrise) elBody.className = 'dawn';
        else elBody.className = 'night';        
    } else if (now - 45*60 <= sunset) elBody.className = 'dusk';
    else elBody.className = 'night';
}
        
function renderWeather(weather) {
    console.log(weather);
    setDocColors(weather.sys);
    
    var elWeather = document.querySelector('.weather');
    elWeather.innerHTML = getWeatherTemplate(weather);
}

function copyUrl() {
    var lat = gState.marker.getPosition().lat();
    var lng = gState.marker.getPosition().lng();
    var baseUrl = location.href.replace(/\?.*/, '');

    var urlToCopy = `${baseUrl}?lat=${lat}&lng=${lng}`;

    var elText = document.querySelector('input.url-copy');
    elText.value = urlToCopy;

    elText.select();
    var copied = document.execCommand('copy');

    if (copied) console.log('Copied URL successfully');
    else console.warn('Could not copy URL');
}

function toggleSearchBoxFocus(elBox, isFocused, elInput) {
    elBox.classList.toggle('focused');
    if (isFocused) elInput.select()
}


// // // not in use
// // accepts a geocode formatted address string. TODO: retrieve desired parameters (city, country/state) in a better way
// function renderLocationName(geocodeAddress) {
//     var regEx = /,\s(.+,\s.+)(?:\s\d|\s,|)/;
//     var locationName = geocodeAddress.match(regEx)[1];
//     console.log(locationName);

//     document.querySelector('.location-name').innerText = locationName;
// }


// TODO: 
//      Style (consider media queries as well)
//      Work on weather component
//      Handle non autocompleted searches
//      Use a less error prone approach to retrieving location name 