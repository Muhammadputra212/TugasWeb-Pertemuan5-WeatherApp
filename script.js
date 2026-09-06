// =============================================================================
// KONFIGURASI
// =============================================================================
// API_KEY didefinisikan di config.js (file terpisah, TIDAK di-push ke GitHub)
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const HISTORY_KEY = 'weather-app:history';
const MAX_HISTORY = 8;

// =============================================================================
// STATE
// =============================================================================
let lastWeatherData = null;
let lastForecastData = null;
let currentUnit = 'metric';
let clockIntervalId = null;

// =============================================================================
// ELEMEN DOM
// =============================================================================
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const historyEl = document.getElementById('history');
const quickCitiesEl = document.getElementById('quick-cities');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const weatherCardEl = document.getElementById('weather-card');
const currentCardEl = document.getElementById('current-card');
const forecastEl = document.getElementById('forecast');
const forecastPathEl = document.getElementById('forecast-path');
const forecastPointsEl = document.getElementById('forecast-points');
const forecastDaysEl = document.getElementById('forecast-days');
const emptyStateEl = document.getElementById('empty-state');
const unitToggleEl = document.getElementById('unit-toggle');
const bodyEl = document.getElementById('app-body');
const nightOverlayEl = document.getElementById('night-overlay');
const particlesEl = document.getElementById('particles');
const localTimeEl = document.getElementById('local-time');
const otherCitiesEl = document.getElementById('other-cities');
const otherCitiesListEl = document.getElementById('other-cities-list');

const WEATHER_THEME_MAP = {
  Clear: 'weather--clear',
  Clouds: 'weather--clouds',
  Rain: 'weather--rain',
  Drizzle: 'weather--rain',
  Thunderstorm: 'weather--thunder',
  Snow: 'weather--snow',
  Mist: 'weather--mist',
  Fog: 'weather--mist',
  Haze: 'weather--mist',
};

// Judul besar per kondisi cuaca (gaya headline dashboard)
const WEATHER_HEADLINE_MAP = {
  Clear: 'Cerah Sepanjang Hari',
  Clouds: 'Berawan',
  Rain: 'Hujan',
  Drizzle: 'Gerimis Ringan',
  Thunderstorm: 'Badai Petir',
  Snow: 'Bersalju',
  Mist: 'Berkabut',
  Fog: 'Berkabut Tebal',
  Haze: 'Udara Berkabut',
};

// =============================================================================
// HELPER: UI STATE
// =============================================================================
const showLoading = () => {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
};

const hideLoading = () => {
  loadingEl.classList.add('hidden');
};

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  weatherCardEl.classList.add('hidden');
  currentCardEl.classList.add('hidden');
  otherCitiesEl.classList.add('hidden');
};

const clearError = () => {
  errorEl.classList.add('hidden');
};

// =============================================================================
// HELPER: SUHU
// =============================================================================
const celsiusToFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

const formatTemp = (celsius, unit) => {
  const value = unit === 'imperial' ? celsiusToFahrenheit(celsius) : celsius;
  return `${Math.round(value)}°${unit === 'imperial' ? 'F' : 'C'}`;
};

const formatTempNumber = (celsius, unit) => {
  const value = unit === 'imperial' ? celsiusToFahrenheit(celsius) : celsius;
  return Math.round(value);
};

// =============================================================================
// FETCH: CUACA (nama kota atau koordinat)
// =============================================================================
const fetchWeather = async (query) => {
  const url = `${BASE_URL}/weather?${query}&units=metric&appid=${API_KEY}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('NETWORK_ERROR');
  }

  if (response.status === 404) throw new Error('CITY_NOT_FOUND');
  if (response.status === 401) throw new Error('INVALID_API_KEY');
  if (!response.ok) throw new Error('UNKNOWN_ERROR');

  return response.json();
};

const fetchForecast = async (query) => {
  const url = `${BASE_URL}/forecast?${query}&units=metric&appid=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

// Versi ringan buat sidebar "Kota Lain" — gagal 1 kota gak boleh gagalin semua
const fetchMiniWeather = async (city) => {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('FAILED');
  return response.json();
};

// =============================================================================
// JAM & TANGGAL LOKAL
// =============================================================================
const startLocalClock = (timezoneOffsetSeconds) => {
  if (clockIntervalId) clearInterval(clockIntervalId);

  const render = () => {
    const localMs = Date.now() + timezoneOffsetSeconds * 1000;
    const localDate = new Date(localMs);

    const time = localDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    const date = localDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    localTimeEl.textContent = `${date} · ${time}`;
  };

  render();
  clockIntervalId = setInterval(render, 1000);
};

// =============================================================================
// SIANG / MALAM
// =============================================================================
const applyDayNightOverlay = (data) => {
  const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;
  nightOverlayEl.classList.toggle('is-active', isNight);
};

// =============================================================================
// PARTIKEL ANIMASI
// =============================================================================
const renderParticles = (conditionMain) => {
  particlesEl.innerHTML = '';
  particlesEl.className = 'particles';

  const isRainy = ['Rain', 'Drizzle', 'Thunderstorm'].includes(conditionMain);
  const isCloudy = ['Clouds', 'Mist', 'Fog', 'Haze'].includes(conditionMain);
  const isSnowy = conditionMain === 'Snow';

  if (isRainy) {
    particlesEl.classList.add('particles--rain');
    Array.from({ length: 45 }).forEach(() => {
      const drop = document.createElement('span');
      drop.className = 'particle particle--rain';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      drop.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
      particlesEl.appendChild(drop);
    });
  } else if (isSnowy) {
    particlesEl.classList.add('particles--snow');
    Array.from({ length: 30 }).forEach(() => {
      const flake = document.createElement('span');
      flake.className = 'particle particle--snow';
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.animationDelay = `${Math.random() * 5}s`;
      flake.style.animationDuration = `${4 + Math.random() * 3}s`;
      particlesEl.appendChild(flake);
    });
  } else if (isCloudy) {
    particlesEl.classList.add('particles--clouds');
    Array.from({ length: 5 }).forEach(() => {
      const cloud = document.createElement('span');
      cloud.className = 'particle particle--cloud';
      cloud.style.top = `${10 + Math.random() * 30}%`;
      cloud.style.animationDelay = `${Math.random() * 20}s`;
      cloud.style.animationDuration = `${25 + Math.random() * 15}s`;
      particlesEl.appendChild(cloud);
    });
  }
};

// =============================================================================
// RENDER: HERO HEADLINE + KARTU CUACA UTAMA
// =============================================================================
const renderWeather = (data) => {
  lastWeatherData = data;

  const cityName = document.getElementById('city-name');
  const weatherDesc = document.getElementById('weather-desc');
  const weatherHeadline = document.getElementById('weather-headline');
  const weatherSummary = document.getElementById('weather-summary');
  const weatherIcon = document.getElementById('weather-icon');
  const tempValue = document.getElementById('temp-value');
  const feelsLike = document.getElementById('feels-like');
  const humidity = document.getElementById('humidity');
  const wind = document.getElementById('wind');

  const condition = data.weather[0];

  cityName.textContent = `${data.name}, ${data.sys.country}`;
  weatherDesc.textContent = condition.description;
  weatherIcon.src = `https://openweathermap.org/img/wn/${condition.icon}@2x.png`;
  weatherIcon.alt = condition.description;

  tempValue.textContent = formatTemp(data.main.temp, currentUnit);
  feelsLike.textContent = formatTemp(data.main.feels_like, currentUnit);
  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${data.wind.speed} m/s`;

  weatherHeadline.textContent = WEATHER_HEADLINE_MAP[condition.main] || condition.description;
  weatherSummary.textContent = `${condition.description.charAt(0).toUpperCase()}${condition.description.slice(1)} di ${data.name}. Kelembaban ${data.main.humidity}%, angin ${data.wind.speed} m/s.`;

  const themeClass = WEATHER_THEME_MAP[condition.main] || 'weather--default';
  bodyEl.className = themeClass;

  startLocalClock(data.timezone);
  applyDayNightOverlay(data);
  renderParticles(condition.main);

  weatherCardEl.classList.remove('hidden');
  currentCardEl.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');
};

// =============================================================================
// FORECAST — WAVE CHART (SVG smooth curve) + label hari
// =============================================================================

// Bikin path SVG melengkung halus dari sekumpulan titik (Catmull-Rom -> Bezier)
const buildSmoothPath = (points) => {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
};

const renderForecast = (forecastData) => {
  lastForecastData = forecastData;

  if (!forecastData || !forecastData.list) {
    forecastEl.classList.add('hidden');
    return;
  }

  // .filter() -> ambil 1 titik per hari (jam 12:00)
  const dailyNoonEntries = forecastData.list.filter((entry) => entry.dt_txt.includes('12:00:00'));

  if (dailyNoonEntries.length === 0) {
    forecastEl.classList.add('hidden');
    return;
  }

  const temps = dailyNoonEntries.map((entry) => formatTempNumber(entry.main.temp, currentUnit));
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const range = Math.max(maxTemp - minTemp, 1);

  const width = 700;
  const height = 130;
  const paddingX = 40;
  const paddingY = 30;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // .map() -> ubah tiap temp jadi koordinat x/y buat digambar
  const points = temps.map((temp, i) => {
    const x = paddingX + (usableWidth / (temps.length - 1 || 1)) * i;
    const normalized = (temp - minTemp) / range;
    const y = paddingY + usableHeight - normalized * usableHeight;
    return { x, y, temp };
  });

  forecastPathEl.setAttribute('d', buildSmoothPath(points));

  const todayString = new Date().toDateString();

  forecastPointsEl.innerHTML = points
    .map((point, i) => {
      const entry = dailyNoonEntries[i];
      const isToday = new Date(entry.dt * 1000).toDateString() === todayString;
      return `
        <div class="forecast-point${isToday ? ' is-today' : ''}" style="left:${(point.x / width) * 100}%; top:${(point.y / height) * 100}%;">
          <span class="forecast-point__dot"></span>
          <span class="forecast-point__temp">${point.temp}°</span>
        </div>
      `;
    })
    .join('');

  forecastDaysEl.innerHTML = dailyNoonEntries
    .map((entry) => {
      const date = new Date(entry.dt * 1000);
      const isToday = date.toDateString() === todayString;
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
      return `<span class="forecast-wave__day${isToday ? ' is-today' : ''}">${dayName}</span>`;
    })
    .join('');

  forecastEl.classList.remove('hidden');
};

// =============================================================================
// SIDEBAR: KOTA LAIN — ambil dari riwayat, fetch ringan tiap kota
// =============================================================================
const renderOtherCities = async (currentCityName) => {
  const history = getHistory().filter(
    (city) => city.toLowerCase() !== (currentCityName || '').toLowerCase()
  );
  const shortlist = history.slice(0, 4);

  if (shortlist.length === 0) {
    otherCitiesEl.classList.add('hidden');
    return;
  }

  // .map() -> bikin array Promise fetch, Promise.allSettled -> gagal 1 gak gagalin semua
  const results = await Promise.allSettled(shortlist.map((city) => fetchMiniWeather(city)));

  const successfulData = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  if (successfulData.length === 0) {
    otherCitiesEl.classList.add('hidden');
    return;
  }

  otherCitiesListEl.innerHTML = successfulData
    .map((data) => {
      const condition = data.weather[0];
      return `
        <button type="button" class="other-city" data-city="${data.name}">
          <img class="other-city__icon" src="https://openweathermap.org/img/wn/${condition.icon}.png" alt="" width="28" height="28">
          <span class="other-city__name">${data.name}</span>
          <span class="other-city__temp">${formatTemp(data.main.temp, currentUnit)}</span>
        </button>
      `;
    })
    .join('');

  otherCitiesEl.classList.remove('hidden');
};

// =============================================================================
// RIWAYAT PENCARIAN (localStorage)
// =============================================================================
const getHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (city) => {
  const existing = getHistory();
  const withoutDuplicate = existing.filter((item) => item.toLowerCase() !== city.toLowerCase());
  const updated = [city, ...withoutDuplicate].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  renderHistory();
};

const renderHistory = () => {
  const history = getHistory();
  historyEl.innerHTML = history
    .map((city) => `<button type="button" class="history__chip" data-city="${city}">${city}</button>`)
    .join('');
};

// =============================================================================
// ALUR UTAMA
// =============================================================================
const loadWeather = async (query, { saveToHistory = null } = {}) => {
  clearError();
  showLoading();
  weatherCardEl.classList.add('hidden');
  currentCardEl.classList.add('hidden');
  otherCitiesEl.classList.add('hidden');
  emptyStateEl.classList.add('hidden');

  try {
    const weatherData = await fetchWeather(query);
    renderWeather(weatherData);

    if (saveToHistory) saveHistory(weatherData.name);

    const forecastData = await fetchForecast(query);
    renderForecast(forecastData);

    renderOtherCities(weatherData.name);
  } catch (err) {
    emptyStateEl.classList.remove('hidden');

    if (err.message === 'CITY_NOT_FOUND') {
      showError('Kota tidak ditemukan. Coba cek lagi ejaannya.');
    } else if (err.message === 'INVALID_API_KEY') {
      showError('API key belum aktif atau salah. Kalau baru dibuat, tunggu beberapa menit lalu coba lagi.');
    } else if (err.message === 'NETWORK_ERROR') {
      showError('Gangguan jaringan — periksa koneksi internet kamu, lalu coba lagi.');
    } else {
      showError('Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.');
    }
  } finally {
    hideLoading();
  }
};

const searchWeatherByCity = (city) => {
  if (!city.trim()) return;
  loadWeather(`q=${encodeURIComponent(city)}`, { saveToHistory: true });
};

// =============================================================================
// GEOLOCATION
// =============================================================================
const emptyStateTextEl = document.querySelector('#empty-state p');

const tryGeolocation = () => {
  if (!('geolocation' in navigator)) {
    emptyStateTextEl.textContent = 'Cari nama kota buat lihat cuacanya, atau pilih kota populer di bawah.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      loadWeather(`lat=${latitude}&lon=${longitude}`, { saveToHistory: false });
    },
    () => {
      emptyStateTextEl.textContent = 'Cari nama kota buat lihat cuacanya, atau pilih kota populer di bawah.';
    },
    { timeout: 8000 }
  );
};

// =============================================================================
// EVENT LISTENERS
// =============================================================================
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  searchWeatherByCity(cityInput.value);
});

historyEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.history__chip');
  if (!chip) return;
  cityInput.value = chip.dataset.city;
  searchWeatherByCity(chip.dataset.city);
});

quickCitiesEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.history__chip');
  if (!chip) return;
  cityInput.value = chip.dataset.city;
  searchWeatherByCity(chip.dataset.city);
});

otherCitiesListEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.other-city');
  if (!chip) return;
  cityInput.value = chip.dataset.city;
  searchWeatherByCity(chip.dataset.city);
});

unitToggleEl.addEventListener('click', (e) => {
  const option = e.target.closest('.unit-toggle__option');
  if (!option) return;

  currentUnit = option.dataset.unit;

  document.querySelectorAll('.unit-toggle__option').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.unit === currentUnit);
  });

  if (lastWeatherData) {
    renderWeather(lastWeatherData);
    renderForecast(lastForecastData);
    renderOtherCities(lastWeatherData.name);
  }
});

// =============================================================================
// INIT
// =============================================================================
renderHistory();
renderParticles('Clouds');
tryGeolocation();
