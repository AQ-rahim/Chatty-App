import * as Location from "expo-location";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

const GOOGLE_API_KEY = 'AIzaSyDTiBB_qmAwAwW4ujo1jJQ1qXKQ39tDpLo';
const RADIUS = 8000;

export const getUserLiveLocation = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission to access location was denied");
      return null;
    }

    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    let address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (address.length > 0) {
      const { name, street, city, region, postalCode, country } = address[0];
      let formattedAddress = [
        name,
        street,
        city,
        region,
        postalCode,
        country,
      ]
        .filter(Boolean)
        .join(", ");

      await AsyncStorage.setItem(
        "selectedAddress",
        JSON.stringify({ address: formattedAddress })
      );
      return formattedAddress;
    } else {
      console.error("Unable to fetch address from location");
      return null;
    }
  } catch (error) {
    console.error("Error fetching location:", error);
    return null;
  }
};

// Move these functions outside and export them
export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    );
    const location = response.data.results[0].geometry.location;
    return location;
  } catch (error) {
    console.error('Error fetching geocoded location:', error);
    return null;
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2 - lat1) * Math.PI/180;
  const Δλ = (lon2 - lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c;
  return distance; // Distance in meters
};

export const NearbyRestaurants = ({ restaurants }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);

  // Filter restaurants within 8 km radius
  const filterNearbyRestaurants = () => {
    if (userLocation && restaurants.length > 0) {
      const filteredRestaurants = restaurants.filter(restaurant => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
        return distance <= RADIUS;
      });
      console.log("FILTERED",filteredRestaurants);
      setNearbyRestaurants(filteredRestaurants);
    }
  };

  // Fetch user location and filter nearby restaurants
  useEffect(() => {
    const fetchLocationAndFilter = async () => {
      const storedAddress = await AsyncStorage.getItem("selectedAddress");
      if (storedAddress) {
        const parsedAddress = JSON.parse(storedAddress);
        const location = await geocodeAddress(parsedAddress.address);
        if (location) {
          setUserLocation(location);
          filterNearbyRestaurants();
        }
      }
    };
    fetchLocationAndFilter();
  }, [restaurants]);

  return (
    <View>
      {userLocation ? (
        nearbyRestaurants.length > 0 ? (
          nearbyRestaurants.map((restaurant, index) => (
            <Text key={index}>{restaurant.restaurant_name}</Text>
          ))
        ) : (
          <Text>No restaurants found within 8 km radius.</Text>
        )
      ) : (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
    </View>
  );
};
