import { useState, useEffect } from "react";
import { FiSearch, FiMapPin, FiLoader } from "react-icons/fi";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import {
  WiDaySunny,
  WiRain,
  WiSnow,
  WiCloudy,
  WiFog,
  WiThunderstorm,
} from "react-icons/wi";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const App = () => {
  // State management
  const [location, setLocation] = useState("");
  const [unit, setUnit] = useState("metric");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const storedMode = localStorage.getItem("darkMode");
      return storedMode ? JSON.parse(storedMode) : false;
    } catch (error) {
      console.error("Error parsing dark mode from localStorage:", error);
      return false;
    }
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer); // cleanup on unmount
  }, []);
  // API key should be in your environment variables
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Fetch weather data
  const fetchWeather = async (location, unitGroup = "metric") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=${unitGroup}&key=${API_KEY}&contentType=json`
      );

      if (!response.ok) {
        throw new Error("Location not found. Please try another search.");
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  // Get current location on first load
  useEffect(() => {
    if (isOnline) {
      location ? fetchWeather(location, unit) : fetchWeather("Kolkata", unit);
    } else {
      setError("No internet connection");
    }
  }, [unit, isOnline]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (location.trim()) {
      isOnline
        ? fetchWeather(location, unit)
        : setError("No internet connection");
    }
  };

  // Handle unit change
  const handleUnitChange = () => {
    setUnit(unit === "metric" ? "us" : "metric");
  };

  // Handle current location click
  const handleCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const area = await areaFound(latitude, longitude); // ✅ await the async call
          if (area) {
            fetchWeather(area, unit);
          }
        },
        (err) => {
          setError(err.message);
        }
      );
    }
  };

  const areaFound = async (latitude, longitude) => {
    let area = "";
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.feroeg.com/address?lat=${latitude}&lon=${longitude}`
      );
      if (!response.ok) {
        throw new Error("Can't find location, try typing it manually.");
      }
      const data = await response.json();

      const address = data.Result.Address; // ✅ get the address field
      area = address.substring(address.lastIndexOf(",") + 1).trim(); // ✅ extract last part
      setLocation(area);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return area || "";
  };

  // Get weather icon based on conditions
  const getWeatherIcon = (conditions, size = "text-4xl") => {
    const condition = conditions.toLowerCase();
    if (condition.includes("rain"))
      return <WiRain className={`text-blue-500 ${size}`} />;
    if (condition.includes("snow"))
      return <WiSnow className={`text-blue-200 ${size}`} />;
    if (condition.includes("fog") || condition.includes("haze"))
      return <WiFog className={`text-gray-400 ${size}`} />;
    if (condition.includes("cloud"))
      return <WiCloudy className={`text-gray-400 ${size}`} />;
    if (condition.includes("thunder") || condition.includes("storm"))
      return <WiThunderstorm className={`text-purple-500 ${size}`} />;
    return <WiDaySunny className={`text-yellow-400 ${size}`} />;
  };

  // Format date
  const formatDate = (epoch, formatStr) => {
    return new Date(epoch * 1000).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(formatStr === "time" && { hour: "2-digit", minute: "2-digit" }),
      ...(formatStr === "short" && { month: "short", day: "numeric" }),
    });
  };

  // Prepare chart data
  const prepareChartData = (hours) => {
    const labels = hours.map((hour) =>
      new Date(hour.datetimeEpoch * 1000).toLocaleTimeString([], {
        hour: "2-digit",
      })
    );

    return {
      labels,
      datasets: [
        {
          label: `Temperature (°${unit === "metric" ? "C" : "F"})`,
          data: hours.map((hour) => hour.temp),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.5)",
          tension: 0.3,
          yAxisID: "y",
        },
        {
          label: "Precipitation %",
          data: hours.map((hour) => hour.precipprob),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: "Temperature and Precipitation",
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: `Temperature (°${unit === "metric" ? "C" : "F"})`,
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Precipitation %",
        },
      },
    },
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <FiLoader className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="bg-red-100 border flex items-center justify-center gap-2 border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="px-3 py-1 cursor-pointer bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-blue-100"
      } p-4 md:p-8`}
    >
      <div
        className={`absolute top-1 left-1 text-xs ${
          darkMode ? "text-white" : "text-black"
        } `}
      >
        {currentTime.toLocaleString()}
      </div>
      <div className="max-w-6xl mx-auto">
        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search for a city..."
                className={`w-full px-4 py-3 pr-10 ${
                  darkMode ? "text-white" : "text-black"
                } rounded-lg border  border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? "placeholder-gray-300" : "placeholder-gray-800"
                }`}
              />
              <FiSearch className="absolute right-3 top-3.5 text-gray-400" />
            </div>
            <button
              title="Search"
              type="submit"
              className="px-4 py-2 cursor-pointer bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleCurrentLocation}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                darkMode
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-600 text-gray-200 hover:bg-gray-700"
              }  rounded-lg  transition`}
              title="Use current location"
            >
              <FiMapPin />
              <span className="sr-only md:not-sr-only">Current</span>
            </button>
          </form>
        </div>

        {/* Unit Toggle */}
        <div className="flex justify-between mb-4">
          <button
            title="Theme"
            className={`p-2 text-1xl border-1 rounded-full cursor-pointer transition hover:rotate-[-90deg] active:scale-75 ${
              darkMode
                ? " border-gray-200 text-white"
                : " border-gray-400 text-black"
            }`}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <IoSunnyOutline /> : <IoMoonOutline />}
          </button>
          <button
            title="Change unit"
            onClick={handleUnitChange}
            className="px-3 py-1 cursor-pointer bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            {unit === "metric" ? "Switch to °F" : "Switch to °C"}
          </button>
        </div>

        {weatherData && (
          <>
            {/* Current Weather */}
            <div
              className={`${
                darkMode ? "bg-gray-700 " : "bg-white"
              } rounded-xl shadow-md p-6 mb-6`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1
                    className={`text-2xl font-bold ${
                      darkMode ? "text-gray-50" : "text-gray-800"
                    }`}
                  >
                    {weatherData.resolvedAddress}
                  </h1>
                  <p
                    className={`${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {formatDate(
                      weatherData.currentConditions.datetimeEpoch,
                      "long"
                    )}
                  </p>
                </div>

                <div className="flex items-center mt-4 md:mt-0">
                  <div className="text-6xl mr-4">
                    {getWeatherIcon(weatherData.currentConditions.conditions)}
                  </div>
                  <div>
                    <span
                      className={`text-5xl font-bold ${
                        darkMode ? "text-gray-50" : "text-gray-800"
                      }`}
                    >
                      {Math.round(weatherData.currentConditions.temp)}°
                      {unit === "metric" ? "C" : "F"}
                    </span>
                    <p
                      className={`${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      } capitalize`}
                    >
                      {weatherData.currentConditions.conditions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-300 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Feels Like
                  </span>
                  <span
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {Math.round(weatherData.currentConditions.feelslike)}°
                    {unit === "metric" ? "C" : "F"}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Humidity
                  </span>
                  <span
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {weatherData.currentConditions.humidity}%
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Wind
                  </span>
                  <span
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {Math.round(weatherData.currentConditions.windspeed)}{" "}
                    {unit === "metric" ? "km/h" : "mph"}{" "}
                    {weatherData.currentConditions.winddir}°
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Visibility
                  </span>
                  <span
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {Math.round(weatherData.currentConditions.visibility)}{" "}
                    {unit === "metric" ? "km" : "mi"}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="lg:col-span-2">
              {/* Hourly Forecast */}
              <div
                className={`${
                  darkMode ? "bg-gray-700 " : "bg-white"
                } rounded-xl shadow-md p-6 pb-3 mb-6`}
              >
                <h2
                  className={`text-xl font-bold ${
                    darkMode ? "text-gray-50" : "text-gray-800"
                  } mb-4`}
                >
                  Hourly Forecast
                </h2>
                <div className="overflow-x-auto">
                  <div className="flex pb-4 ">
                    {weatherData.days[0].hours.map((hour, index) => (
                      <div
                        key={index}
                        className={`flex flex-col items-center min-w-max px-5 ${
                          index === weatherData.days[0].hours.length - 1
                            ? ""
                            : "border-r-1"
                        } border-gray-300`}
                      >
                        <span
                          className={
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          {new Date(
                            hour.datetimeEpoch * 1000
                          ).toLocaleTimeString([], { hour: "2-digit" })}
                        </span>
                        <div className="my-2">
                          {getWeatherIcon(hour.conditions, "text-xl")}
                        </div>
                        <span
                          className={`font-semibold ${
                            darkMode ? "text-white" : "text-black"
                          }`}
                        >
                          {Math.round(hour.temp)}°
                          {unit === "metric" ? "C" : "F"}
                        </span>
                        <span
                          className={`text-xs ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          } mt-1`}
                        >
                          {Math.round(hour.precipprob)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weather Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <Line
                  options={chartOptions}
                  data={prepareChartData(weatherData.days[0].hours)}
                />
              </div>
            </div>

            {/* Weather Stats */}
            <div className="mt-5 flex flex-col lg:flex-row lg:justify-between gap-4 w-full">
              <div className="w-full lg:w-[49%]">
                <div
                  className={`${
                    darkMode ? "bg-gray-700 " : "bg-white"
                  } rounded-xl shadow-md p-6`}
                >
                  <h2
                    className={`text-xl font-bold ${
                      darkMode ? "text-gray-100" : "text-gray-800"
                    } mb-4`}
                  >
                    Weather Details
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        UV Index
                      </span>
                      <span
                        className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {weatherData.currentConditions.uvindex}
                        <span
                          className={`ml-2 text-xs font-normal ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          (
                          {weatherData.currentConditions.uvindex <= 2
                            ? "Low"
                            : weatherData.currentConditions.uvindex <= 5
                            ? "Moderate"
                            : weatherData.currentConditions.uvindex <= 7
                            ? "High"
                            : weatherData.currentConditions.uvindex <= 10
                            ? "Very High"
                            : "Extreme"}
                          )
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        Sunrise
                      </span>
                      <span
                        className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {new Date(
                          weatherData.currentConditions.sunriseEpoch * 1000
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        Sunset
                      </span>
                      <span
                        className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {new Date(
                          weatherData.currentConditions.sunsetEpoch * 1000
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        Pressure
                      </span>
                      <span
                        className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {Math.round(weatherData.currentConditions.pressure)} hPa
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        Dew Point
                      </span>
                      <span
                        className={`${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        } font-semibold`}
                      >
                        {weatherData.days[0].dew} °
                        {unit === "metric" ? "C" : "F"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } text-sm`}
                      >
                        Precipitation
                      </span>
                      <span
                        className={`font-semibold ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {weatherData.days[0].precip
                          ? weatherData.days[0].precip
                          : "0"}{" "}
                        mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-[49%] rounded-xl shadow-md">
                {" "}
                {/* Set desired height */}
                {weatherData && !loading ? (
                  <iframe
                    title="windy-map"
                    id="mapframe"
                    src={`https://embed.windy.com/embed2.html?lat=${weatherData.latitude}&lon=${weatherData.longitude}&zoom=10&level=surface&overlay=rain&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=${weatherData.latitude}&detailLon=${weatherData.longitude}&metricWind=km/h&metricTemp=%C2%B0C`}
                    className="w-full h-full rounded-xl"
                  ></iframe>
                ) : (
                  ""
                )}
              </div>
            </div>

            {/* 15-Day Forecast */}
            <div
              className={`${
                darkMode ? "bg-gray-700 " : "bg-white"
              } rounded-xl shadow-md p-6 mt-8`}
            >
              <h2
                className={`text-xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                } mb-4`}
              >
                15-Day Forecast
              </h2>
              <div className="space-y-4">
                {weatherData.days.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-32">
                      <span
                        className={`font-medium ${
                          darkMode ? "text-gray-300" : "text-gray-800"
                        }`}
                      >
                        {index === 0
                          ? "Today"
                          : formatDate(day.datetimeEpoch, "short")}
                      </span>
                    </div>

                    <div className="flex items-center w-16 justify-center">
                      {getWeatherIcon(day.conditions, "text-2xl")}
                    </div>

                    <div className="flex items-center w-24 justify-end">
                      <span
                        className={`${
                          darkMode ? "text-gray-300" : "text-gray-500"
                        } mr-2`}
                      >
                        {Math.round(day.tempmin)}°
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{
                            width: `${
                              ((day.temp - day.tempmin) /
                                (day.tempmax - day.tempmin)) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span
                        className={`font-medium ${
                          darkMode ? "text-gray-300" : "text-gray-500"
                        } ml-2`}
                      >
                        {Math.round(day.tempmax)}°
                      </span>
                    </div>

                    <div className="w-16 text-right">
                      <span
                        className={`text-sm ${
                          darkMode ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {Math.round(day.precipprob)}% Precipitation
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
