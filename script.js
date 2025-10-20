class WeatherDashboard {
    constructor() {
        this.apiKey = 'b8502d9095887a69b8c87d848addb442'; 
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.cities = JSON.parse(localStorage.getItem('weatherCities')) || [];
        
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.locationBtn = document.getElementById('location-btn');
        this.weatherCards = document.getElementById('weather-cards');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        
        this.init();
    }
    
    init() {
        this.searchBtn.addEventListener('click', () => this.searchCity());
        this.locationBtn.addEventListener('click', () => this.getUserLocation());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCity();
        });
        
        if (this.cities.length > 0) {
            this.loadAllCities();
        } else {
            this.getUserLocation();
        }
    }
    
    async searchCity() {
        const cityName = this.searchInput.value.trim();
        if (!cityName) return;
        
        this.showLoading();
        try {
            const weatherData = await this.fetchWeatherData(cityName);
            this.addCity(weatherData);
            this.searchInput.value = '';
        } catch (error) {
            this.showError(`Could not find weather data for "${cityName}"`);
        } finally {
            this.hideLoading();
        }
    }
    
    async getUserLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser');
            return;
        }
        
        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const weatherData = await this.fetchWeatherByCoords(latitude, longitude);
                    this.addCity(weatherData);
                } catch (error) {
                    this.showError('Could not fetch weather for your location');
                } finally {
                    this.hideLoading();
                }
            },
            (error) => {
                this.hideLoading();
                this.showError('Unable to retrieve your location');
            }
        );
    }
    
    async fetchWeatherData(cityName) {
        const currentResponse = await fetch(
            `${this.baseUrl}/weather?q=${cityName}&appid=${this.apiKey}&units=metric`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${this.baseUrl}/forecast?q=${cityName}&appid=${this.apiKey}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Forecast data not available');
        }
        
        const forecastData = await forecastResponse.json();
        
        return {
            current: currentData,
            forecast: forecastData
        };
    }
    
    async fetchWeatherByCoords(lat, lon) {
        const currentResponse = await fetch(
            `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Weather data not available');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Forecast data not available');
        }
        
        const forecastData = await forecastResponse.json();
        
        return {
            current: currentData,
            forecast: forecastData
        };
    }
    
    addCity(weatherData) {
        const cityId = weatherData.current.id;
        
        const existingIndex = this.cities.findIndex(city => city.current.id === cityId);
        if (existingIndex !== -1) {
            this.cities[existingIndex] = weatherData;
        } else {
            this.cities.push(weatherData);
        }
        
        this.saveCities();
        this.renderWeatherCards();
    }
    
    removeCity(cityId) {
        this.cities = this.cities.filter(city => city.current.id !== cityId);
        this.saveCities();
        this.renderWeatherCards();
    }
    
    saveCities() {
        localStorage.setItem('weatherCities', JSON.stringify(this.cities));
    }
    
    async loadAllCities() {
        this.showLoading();
        
        try {
            const refreshPromises = this.cities.map(city => 
                this.fetchWeatherData(city.current.name)
            );
            
            const updatedCities = await Promise.allSettled(refreshPromises);
            
            this.cities = updatedCities
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            this.saveCities();
            this.renderWeatherCards();
        } catch (error) {
            this.renderWeatherCards();
        } finally {
            this.hideLoading();
        }
    }
    
    renderWeatherCards() {
        if (this.cities.length === 0) {
            this.weatherCards.innerHTML = `
                <div class="weather-card" style="text-align: center; grid-column: 1 / -1;">
                    <p>No cities added yet. Search for a city or use your current location.</p>
                </div>
            `;
            return;
        }
        
        this.weatherCards.innerHTML = this.cities.map(city => this.createWeatherCard(city)).join('');
        
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const cityId = parseInt(e.target.dataset.cityId);
                this.removeCity(cityId);
            });
        });
    }
    
    createWeatherCard(weatherData) {
        const current = weatherData.current;
        const forecast = weatherData.forecast;
        
        const dailyForecast = this.getThreeDayForecast(forecast);
        
        const currentDate = new Date(current.dt * 1000).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const iconClass = this.getWeatherIcon(current.weather[0].id);
        
        return `
            <div class="weather-card">
                <div class="current-weather">
                    <div class="city-info">
                        <h2>${current.name}, ${current.sys.country}</h2>
                        <p>${currentDate}</p>
                        <div class="weather-icon">
                            <i class="${iconClass}"></i>
                        </div>
                        <p class="weather-description">${current.weather[0].description}</p>
                    </div>
                    <div class="temp">${Math.round(current.main.temp)}°C</div>
                </div>
                
                <div class="weather-details">
                    <div class="detail">
                        <i class="fas fa-temperature-high"></i>
                        <span>Feels like: ${Math.round(current.main.feels_like)}°C</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-tint"></i>
                        <span>Humidity: ${current.main.humidity}%</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-wind"></i>
                        <span>Wind: ${current.wind.speed} m/s</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-compress-alt"></i>
                        <span>Pressure: ${current.main.pressure} hPa</span>
                    </div>
                </div>
                
                <div class="forecast">
                    <h3>3-Day Forecast</h3>
                    <div class="forecast-days">
                        ${dailyForecast.map(day => `
                            <div class="forecast-day">
                                <p class="day">${day.day}</p>
                                <div class="forecast-icon">
                                    <i class="${this.getWeatherIcon(day.weatherId)}"></i>
                                </div>
                                <p class="temp">${Math.round(day.temp)}°C</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <button class="remove-btn" data-city-id="${current.id}">Remove</button>
            </div>
        `;
    }
    
    getThreeDayForecast(forecastData) {
        const dailyForecast = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const dailyData = {};
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toDateString();
            
            if (!dailyData[day]) {
                dailyData[day] = {
                    temps: [],
                    weatherIds: []
                };
            }
            
            dailyData[day].temps.push(item.main.temp);
            dailyData[day].weatherIds.push(item.weather[0].id);
        });
        
        const today = new Date().toDateString();
        const forecastDays = Object.keys(dailyData).filter(day => day !== today).slice(0, 3);
        
        forecastDays.forEach(day => {
            const data = dailyData[day];
            const date = new Date(day);
            const dayName = days[date.getDay()];
            
            const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
            
            const weatherId = this.getMostFrequent(data.weatherIds);
            
            dailyForecast.push({
                day: dayName,
                temp: avgTemp,
                weatherId: weatherId
            });
        });
        
        return dailyForecast;
    }
    
    getMostFrequent(arr) {
        const frequency = {};
        let maxCount = 0;
        let mostFrequent;
        
        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
            if (frequency[item] > maxCount) {
                maxCount = frequency[item];
                mostFrequent = item;
            }
        });
        
        return mostFrequent;
    }
    
    getWeatherIcon(weatherId) {
        if (weatherId >= 200 && weatherId < 300) {
            return 'fas fa-bolt'; 
        } else if (weatherId >= 300 && weatherId < 400) {
            return 'fas fa-cloud-rain'; 
        } else if (weatherId >= 500 && weatherId < 600) {
            return 'fas fa-cloud-showers-heavy';
        } else if (weatherId >= 600 && weatherId < 700) {
            return 'fas fa-snowflake'; 
        } else if (weatherId >= 700 && weatherId < 800) {
            return 'fas fa-smog'; 
        } else if (weatherId === 800) {
            return 'fas fa-sun'; 
        } else if (weatherId > 800) {
            return 'fas fa-cloud'; 
        } else {
            return 'fas fa-cloud'; 
        }
    }
    
    showLoading() {
        this.loading.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
    }
    
    hideLoading() {
        this.loading.classList.add('hidden');
    }
    
    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});