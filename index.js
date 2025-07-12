// Import express and axios
import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import querystring from "querystring";
import "dotenv/config";


// Create an express app and set the port number.
const app = express();
const port = 3000;
const API_URL = "https://api.openuv.io/api/v1/uv";

// OpenUV API key
const headers = {
    "x-access-token": process.env.API_KEY,
    "Content-Type": "application/json"
}

// Use the public folder for static files.
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Default Melbourne coordinates
const defaultLat = -37.85;
const defaultLng = 145.18;

// GET home route
app.get("/", async (req, res) => {
    let lat, lng;

    try {
        // 1. If user provided a city name (e.g. "Melbourne")
        if (req.query.cityname) {
            const cityName = req.query.cityname.trim();
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?${querystring.stringify({
                q: cityName,
                format: "json",
                limit: 1
        })}`;

        const geoRes = await axios.get(nominatimUrl);
        if (geoRes.data.length > 0) {
            lat = parseFloat(geoRes.data[0].lat);
            lng = parseFloat(geoRes.data[0].lon);
        } else {
            console.warn("Geocoding failed, using default coords");
            lat = defaultLat;
            lng = defaultLng;
        }

        // 2. If user selected a city from dropdown
        } else if (req.query.city) {
        const [latStr, lngStr] = req.query.city.split(",");
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);

        // 3. If user provided lat/lng directly
        } else {
            lat = parseFloat(req.query.lat);
            lng = parseFloat(req.query.lng);
        }

        // Validate coordinates
        if (isNaN(lat) || lat < -90 || lat > 90) lat = defaultLat;  // Melbourne fallback
        if (isNaN(lng) || lng < -180 || lng > 180) lng = defaultLng; // Melbourne fallback

        // Get UV data
        const response = await axios.get(API_URL, {
            headers: headers,
            params: {
                lat,
                lng,
                alt: 100,
            }
        });
        console.log("Full API response", response.data);
        const uvIndex = response.data?.result?.uv;

        // Classify UV level
        let uvLevel = "unknown";
        if (uvIndex !== undefined && uvIndex !== null) {
            if (uvIndex <= 2) uvLevel = "low";
            else if (uvIndex <= 5) uvLevel = "moderate";
            else if (uvIndex <= 7) uvLevel = "high";
            else if (uvIndex <= 10) uvLevel = "very-high";
            else uvLevel = "extreme";
        }
        if (uvIndex === undefined) {
            console.error("UV index not found in response:", response.data);
        } else {
            // Render view
            res.render("index.ejs", {
                number: Math.round((uvIndex + Number.EPSILON) * 10) /10,
                level: uvLevel,
                lat,
                lng,
            });
        }
        
        
    } catch (err) {
        console.error("Error fetching data:", err.message);
        res.status(500).send("Failed to load UV data.");
    }
});


// Listen on your predefined port and start the server.
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});