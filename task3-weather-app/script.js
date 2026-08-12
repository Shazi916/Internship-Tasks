/**
 * Weather App
 * -----------
 * Uses the Open-Meteo API (free, no API key needed).
 *
 * Flow:
 *   1. User enters a city name
 *   2. Call the Geocoding API to convert the city name into lat/lon
 *   3. Call the Forecast API with those coordinates to get the weather
 *   4. Render the data in the UI
 */

/* ------------------------------------------------------------------ */
/* Weather code → emoji + human-readable description                    */
/* ------------------------------------------------------------------ */
// Based on WMO Weather Interpretation Codes
const WEATHER_MAP = {
    0:  { icon: '☀️',  label: 'Clear sky' },
    1:  { icon: '🌤️', label: 'Mainly clear' },
    2:  { icon: '⛅',  label: 'Partly cloudy' },
    3:  { icon: '☁️',  label: 'Overcast' },
    45: { icon: '🌫️', label: 'Fog' },
    48: { icon: '🌫️', label: 'Depositing rime fog' },
    51: { icon: '🌦️', label: 'Light drizzle' },
    53: { icon: '🌦️', label: 'Moderate drizzle' },
    55: { icon: '🌦️', label: 'Dense drizzle' },
    56: { icon: '🌧️', label: 'Light freezing drizzle' },
    57: { icon: '🌧️', label: 'Freezing drizzle' },
    61: { icon: '🌧️', label: 'Light rain' },
    63: { icon: '🌧️', label: 'Moderate rain' },
    65: { icon: '🌧️', label: 'Heavy rain' },
    66: { icon: '🌧️', label: 'Freezing rain' },
    67: { icon: '🌧️', label: 'Heavy freezing rain' },
    71: { icon: '❄️',  label: 'Light snow' },
    73: { icon: '❄️',  label: 'Moderate snow' },
    75: { icon: '❄️',  label: 'Heavy snow' },
    77: { icon: '❄️',  label: 'Snow grains' },
    80: { icon: '🌦️', label: 'Light rain showers' },
    81: { icon: '🌦️', label: 'Rain showers' },
    82: { icon: '⛈️',  label: 'Heavy rain showers' },
    85: { icon: '🌨️', label: 'Snow showers' },
    86: { icon: '🌨️', label: 'Heavy snow showers' },
    95: { icon: '⛈️',  label: 'Thunderstorm' },
    96: { icon: '⛈️',  label: 'Thunderstorm with hail' },
    99: { icon: '⛈️',  label: 'Heavy thunderstorm with hail' },
};

function getWeatherInfo(code) {
    return WEATHER_MAP[code] || { icon: '🌡️', label: 'Unknown' };
}

/* ------------------------------------------------------------------ */
/* DOM references                                                      */
/* ------------------------------------------------------------------ */
const searchForm = document.getElementById('searchForm');
const cityInput  = document.getElementById('cityInput');

const stateEmpty   = document.getElementById('stateEmpty');
const stateLoading = document.getElementById('stateLoading');
const stateError   = document.getElementById('stateError');
const weatherCard  = document.getElementById('weatherCard');
const errorMessage = document.getElementById('errorMessage');

const cityName    = document.getElementById('cityName');
const countryName = document.getElementById('countryName');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const condition   = document.getElementById('condition');
const feelsLike   = document.getElementById('feelsLike');
const humidity    = document.getElementById('humidity');
const wind        = document.getElementById('wind');
const highLow     = document.getElementById('highLow');
const forecastList = document.getElementById('forecastList');

/* ------------------------------------------------------------------ */
/* State switcher — shows one of: empty, loading, error, weatherCard   */
/* ------------------------------------------------------------------ */
function showState(name) {
    [stateEmpty, stateLoading, stateError, weatherCard].forEach(el => {
        el.classList.add('hidden');
    });
    const map = {
        empty:   stateEmpty,
        loading: stateLoading,
        error:   stateError,
        weather: weatherCard,
    };
    if (map[name]) {
        map[name].classList.remove('hidden');
    }
}

/* ------------------------------------------------------------------ */
/* API calls                                                           */
/* ------------------------------------------------------------------ */

// Step 1: convert a city name into geographic coordinates.
async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not reach the geocoding service.');
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
        throw new Error('CITY_NOT_FOUND');
    }
    const r = data.results[0];
    return {
        latitude:  r.latitude,
        longitude: r.longitude,
        name:      r.name,
        country:   r.country || '',
        admin1:    r.admin1  || '',  // region/state
    };
}

// Step 2: fetch the current weather + 7-day forecast for those coordinates.
async function fetchWeather(latitude, longitude) {
    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto` +
        `&forecast_days=7`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not reach the weather service.');
    return res.json();
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */
function renderWeather(place, data) {
    // Location
    cityName.textContent = place.name;
    const parts = [place.admin1, place.country].filter(Boolean);
    countryName.textContent = parts.join(', ');

    // Current weather
    const cur = data.current;
    const info = getWeatherInfo(cur.weather_code);

    weatherIcon.textContent = info.icon;
    temperature.textContent = `${Math.round(cur.temperature_2m)}°`;
    condition.textContent   = info.label;

    feelsLike.textContent = `${Math.round(cur.apparent_temperature)}°`;
    humidity.textContent  = `${cur.relative_humidity_2m}%`;
    wind.textContent      = `${Math.round(cur.wind_speed_10m)} km/h`;

    // Today's high/low from the daily data (index 0 = today)
    const todayMax = Math.round(data.daily.temperature_2m_max[0]);
    const todayMin = Math.round(data.daily.temperature_2m_min[0]);
    highLow.textContent = `${todayMax}° / ${todayMin}°`;

    // 7-day forecast
    forecastList.innerHTML = '';
    for (let i = 0; i < data.daily.time.length; i++) {
        const dateStr = data.daily.time[i];
        const code    = data.daily.weather_code[i];
        const max     = Math.round(data.daily.temperature_2m_max[i]);
        const min     = Math.round(data.daily.temperature_2m_min[i]);
        const label   = (i === 0)
            ? 'Today'
            : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.innerHTML = `
            <span class="forecast-day">${label}</span>
            <span class="forecast-icon">${getWeatherInfo(code).icon}</span>
            <span class="forecast-temps"><strong>${max}°</strong>${min}°</span>
        `;
        forecastList.appendChild(row);
    }

    showState('weather');
}

/* ------------------------------------------------------------------ */
/* Event handlers                                                      */
/* ------------------------------------------------------------------ */
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    showState('loading');

    try {
        const place = await geocodeCity(city);
        const data  = await fetchWeather(place.latitude, place.longitude);
        renderWeather(place, data);
    } catch (err) {
        console.error(err);
        if (err.message === 'CITY_NOT_FOUND') {
            errorMessage.textContent = `We couldn't find "${city}". Try a different spelling or a nearby city.`;
        } else {
            errorMessage.textContent = 'Something went wrong while fetching the weather. Please check your connection and try again.';
        }
        showState('error');
    }
});

/* ------------------------------------------------------------------ */
/* Auto-load a default city on first visit                             */
/* ------------------------------------------------------------------ */
window.addEventListener('load', () => {
    cityInput.value = 'Islamabad';
    searchForm.dispatchEvent(new Event('submit'));
});
