import React, { useState, createContext, useEffect } from "react";
import { app_url } from "../app/url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as io from "socket.io-client";

export const AppContext = createContext();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#fff",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "d680291d-9134-4d51-b258-4104499902fb",
      })
    ).data;
    console.log(token);
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}

let socket = io.connect(`${app_url}`);

const initialState = {
  restaurant: {},
  item_order: [],
};

export const AppProvider = ({ children }) => {
  const [isFetched, setIsFetched] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const [userId, setUserId] = useState(0);
  const [data, setData] = useState({
    user: {},
    restaurants: [],
    orders: [],
    wallet: {},
    address: [],
    totalWallet: null,
    menus: [],
    reviews: [],
    user_reviews: [],
    walletActivity: [],
  });
  const [selectedAddress, setSelectedAddress] = useState("");
  const [itemOrder, setItemOrder] = useState(initialState);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token)
    );

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [userId]);

  useEffect(() => {
    const getId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error("Error retrieving userId from AsyncStorage:", error);
      }
    };

    getId();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (userId) {
          const response = await fetch(`${app_url}/userData/${userId}`);
          const userData = await response.json();
          if (!userData.success) {
            setIsFetched(false);
          } else {
            setData({
              user: userData.user || {},
              restaurants: userData.restaurants || [],
              orders: userData.orders || [],
              wallet: userData.wallet || {},
              totalWallet: userData.totalWallet || null,
              address: userData.address || [],
              menus: userData.menu || [],
              reviews: userData.reviews || [],
              user_reviews: userData.user_reviews || [],
              walletActivity: userData.walletActivity || [],
            });

            const storedAddress = await AsyncStorage.getItem("selectedAddress");
            if (
              !storedAddress &&
              userData.address &&
              userData.address.length > 0
            ) {
              const latestAddress =
                userData.address[userData.address.length - 1];
              await AsyncStorage.setItem(
                "selectedAddress",
                JSON.stringify(latestAddress)
              );
              setSelectedAddress(latestAddress);
            } else if (storedAddress) {
              setSelectedAddress(JSON.parse(storedAddress));
            }
            setIsFetched(true);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("User App Connected to WebSocket server", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("User App Disconnected from WebSocket server");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const refreshData = async () => {
    try {
      if (userId) {
        const response = await fetch(`${app_url}/userData/${userId}`);
        const userData = await response.json();
        setData({
          user: userData.user || {},
          restaurants: userData.restaurants || [],
          orders: userData.orders || [],
          totalWallet: userData.totalWallet || null,
          wallet: userData.wallet || {},
          address: userData.address || [],
          menus: userData.address || [],
          reviews: userData.reviews || [],
          user_reviews: userData.user_reviews || [],
          walletActivity: userData.walletActivity || [],
        });
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const sendOrderId = async (id) => {
    console.log(id);

    socket.emit("newOrder", id);
  };

  useEffect(() => {
    const loadItemOrder = async () => {
      try {
        const savedOrder = await AsyncStorage.getItem("itemOrder");
        if (savedOrder) {
          setItemOrder(JSON.parse(savedOrder));
        }
      } catch (error) {
        console.error("Error loading item order:", error);
      }
    };

    loadItemOrder();
  }, []);

  const updateCartItem = (item_id, addon_id, size_id, type) => {
    setItemOrder((prevState) => {
      const updatedItems = prevState.item_order
        .map((item) => {
          // Check if the current item matches the item_id, addon_id, and size_id
          const isMatchingItem =
            item.item.id === item_id &&
            (addon_id ? item.addon?.id === addon_id : !item.addon) &&
            (size_id ? item.size?.id === size_id : !item.size);

          if (isMatchingItem) {
            // Use the item's existing subtotal as the price
            const price = parseFloat(item.item.subtotal);

            // Add addon price if addon is selected
            const addonPrice = item.addon ? parseFloat(item.addon.price) : 0;

            // Initialize the quantity
            let newQty = item.item.quantity || 1; // Start with a quantity of 1 if none

            // Handle increment or decrement based on type
            if (type === "increment") {
              newQty += 1; // Increase quantity
            } else if (type === "decrement") {
              if (newQty > 1) {
                newQty -= 1; // Decrease quantity
              } else {
                return null; // Remove item when quantity is 0
              }
            }

            // Calculate the new subtotal
            const newSubtotal = ((price / item.item.quantity) * newQty).toFixed(
              2
            );

            console.log("Price (per item):", price / item.item.quantity);
            console.log("Addon Price:", addonPrice);
            console.log("New Quantity:", newQty);
            console.log("New Subtotal:", newSubtotal);

            return {
              ...item,
              item: {
                ...item.item,
                quantity: newQty, // Update quantity
                subtotal: newSubtotal, // Update subtotal
              },
            };
          }
          return item; // Return unchanged items
        })
        .filter((item) => item !== null); // Remove items with quantity 0

      const updatedOrder = {
        ...prevState,
        item_order: updatedItems,
      };

      // Save the updated order to AsyncStorage
      AsyncStorage.setItem("itemOrder", JSON.stringify(updatedOrder))
        .then(() =>
          console.log("Item order successfully updated in AsyncStorage")
        )
        .catch((error) =>
          console.error("Error updating item order in AsyncStorage:", error)
        );

      return updatedOrder; // Return the updated state
    });
  };

  console.log(itemOrder.item_order);

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        userId,
        setUserId,
        selectedAddress,
        setSelectedAddress,
        refreshData,
        isFetched,
        itemOrder,
        setItemOrder,
        sendOrderId,
        updateCartItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
