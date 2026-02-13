// WeatherApp Constructor
function WeatherApp() {
    this.apiKey = '49c6b157a627a45d10e8ecffea25ae55'; // Replace with your actual API key
    this.apiBaseUrl = 'https://api.openweathermap.org/data/2.5';
    
    // DOM Elements
    this.cityInput = document.getElementById('city-input');
    this.searchBtn = document.getElementById('search-btn');
    this.errorMessage = document.getElementById('error-message');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.weatherContent = document.getElementById('weather-content');
    this.forecastContainer = document.getElementById('forecast-container');
    this.forecastGrid = document.getElementById('forecast-grid');
    
    this.cityNameEl = document.getElementById('city-name');
    this.dateEl = document.getElementById('current-date');
    this.tempEl = document.getElementById('temperature');
    this.descriptionEl = document.getElementById('weather-description');
    this.iconEl = document.getElementById('weather-icon');
}

// Initialize the application
WeatherApp.prototype.init = function() {
    // Set current date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.dateEl.innerText = new Date().toLocaleDateString('en-US', options);
    
    // Add event listeners
    this.searchBtn.addEventListener('click', this.handleSearch.bind(this));
    this.cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    });
    
    // Initial load
    this.getWeather('London');
};

// Handle search action
WeatherApp.prototype.handleSearch = function() {
    const city = this.cityInput.value.trim();
    if (city) {
        this.getWeather(city);
    } else {
        this.showError('Please enter a city name.');
    }
};

// Fetch weather and forecast data
WeatherApp.prototype.getWeather = async function(city) {
    this.showLoading();
    this.errorMessage.classList.add('hidden');
    
    try {
        const weatherUrl = `${this.apiBaseUrl}/weather?q=${city}&appid=${this.apiKey}&units=metric`;
        const forecastUrl = `${this.apiBaseUrl}/forecast?q=${city}&appid=${this.apiKey}&units=metric`;
        
        const [weatherResponse, forecastResponse] = await Promise.all([
            axios.get(weatherUrl),
            axios.get(forecastUrl)
        ]);
        
        this.displayWeather(weatherResponse.data);
        const dailyForecasts = this.processForecastData(forecastResponse.data.list);
        this.displayForecast(dailyForecasts);
        
        this.weatherContent.classList.remove('hidden');
        this.forecastContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response && error.response.status === 404) {
            this.showError('City not found. Please check the spelling.');
        } else if (error.response && error.response.status === 401) {
            this.showError('Invalid API Key. Please check your configuration.');
        } else {
            this.showError('Something went wrong. Please try again later.');
        }
        this.weatherContent.classList.add('hidden');
        this.forecastContainer.classList.add('hidden');
    } finally {
        this.hideLoading();
    }
};

// Process forecast data to get 5 daily forecasts (approx. noon each day)
WeatherApp.prototype.processForecastData = function(forecastList) {
    const dailyForecasts = [];
    const seenDates = new Set();
    
    // Iterate through the list and pick one entry per day
    // The API returns data every 3 hours. We try to pick the one closest to noon (12:00:00).
    // Or simply the first entry for each new day found.
    
    // A simple strategy: check if the date is already in seenDates.
    // Since the list is chronological, this will pick the first available time slot for each day.
    // To get a better "noon" representation, we could filter for time containing "12:00:00"
    
    // Let's look for entries close to 12:00 PM
    
    forecastList.forEach(item => {
        const dateObj = new Date(item.dt * 1000);
        const dateString = dateObj.toLocaleDateString();
        
        // Skip today if it's already in the list (or we can include it if we want 'today' as part of forecast, 
        // but usually forecast implies 'future'. Let's include whatever comes next)
        // Ideally we want 5 *future* days.
        
        if (!seenDates.has(dateString)) {
            // Check if the time is around noon (e.g., contains "12:00:00")
            // Or if we haven't found a noon slot, take the first one available for that day 
            // but we might want to wait for the noon one if available.
            // Simplified approach: Take the entry if it's 12:00:00. If we don't find 12:00 for a day, we might miss it.
            // Robust approach: Group by day, then pick noon.
            
            // Let's stick to the simpler approach of picking the entry with "12:00:00" in dt_txt
            // or if strictly not available, we might miss. 
            // However, the standard implementation usually just picks one per day.
            
            if (item.dt_txt.includes("12:00:00")) {
                dailyForecasts.push(item);
                seenDates.add(dateString);
            }
        }
    });
    
    // Fallback: If we didn't get 5 days (maybe it's late at night and no noon data for today/tomorrow left?),
    // just fill with unique days.
    if (dailyForecasts.length < 5) {
        // Clear and restart with a simpler logic: just unique days
        const uniqueDays = [];
        const daysSet = new Set();
        
        forecastList.forEach(item => {
            const dateString = new Date(item.dt * 1000).toLocaleDateString();
            if (!daysSet.has(dateString)) {
                uniqueDays.push(item);
                daysSet.add(dateString);
            }
        });
        // We might get 6 days (including today), slice to 5
        return uniqueDays.slice(0, 5);
    }
    
    return dailyForecasts.slice(0, 5);
};

// Display current weather
WeatherApp.prototype.displayWeather = function(data) {
    const { name, main, weather } = data;
    const { temp } = main;
    const { description, icon } = weather[0];
    
    this.cityNameEl.innerText = name;
    this.tempEl.innerText = `${Math.round(temp)}°C`;
    this.descriptionEl.innerText = description;
    
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    this.iconEl.src = iconUrl;
    this.iconEl.alt = description;
    this.iconEl.classList.remove('hidden');
};

// Display forecast
WeatherApp.prototype.displayForecast = function(forecasts) {
    this.forecastGrid.innerHTML = ''; // Clear previous forecast
    
    forecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const temp = Math.round(day.main.temp);
        const icon = day.weather[0].icon;
        const desc = day.weather[0].description;
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" class="forecast-icon">
            <div class="forecast-temp">${temp}°C</div>
            <div class="forecast-desc">${desc}</div>
        `;
        
        this.forecastGrid.appendChild(card);
    });
};

// Show loading state
WeatherApp.prototype.showLoading = function() {
    this.loadingIndicator.classList.remove('hidden');
    this.weatherContent.classList.add('hidden');
    this.forecastContainer.classList.add('hidden');
};

// Hide loading state
WeatherApp.prototype.hideLoading = function() {
    this.loadingIndicator.classList.add('hidden');
};

// Show error message
WeatherApp.prototype.showError = function(message) {
    this.errorMessage.innerText = message;
    this.errorMessage.classList.remove('hidden');
};

// Initialize app instance
const app = new WeatherApp();
app.init();
