import axios from "axios";
import { app_url } from "../app/url";

// Function to request Uber delivery quote
export const requestUberDeliveryQuote = async (
  pickupAddress,
  dropoffAddress,
  externalId
) => {
  try {
    // console.log("Requesting Uber delivery quote with the following parameters:");
    // console.log("Pickup Address:", pickupAddress);
    // console.log("Dropoff Address:", dropoffAddress);
    // console.log("External ID:", externalId);
    // console.log(app_url);
    const response = await axios.post(app_url + "/requestUberDelivery", {
      pickupAddress,
      dropoffAddress,
      externalId,
    });

    if (response.status === 200) {
      return {
        success: true,
        fee: response.data.fee / 100,
        duration: `${response.data.duration} min`,
        quoteID: response.data.id,
      };
    } else {
      console.error("Quote request failed with status code:", response.status);
      return {
        success: false,
        message:
          response.data.message || "Failed to obtain Uber delivery details",
      };
    }
  } catch (error) {
    console.error("Error during quote request:", error.message);

    // Check if the error has a response from the server
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", error.response.data);
      console.error("Error response headers:", error.response.headers);

      return {
        success: false,
        message:
          error.response.data.message || "Error requesting delivery quote",
      };
    } else if (error.request) {
      // If the request was made but no response was received
      console.error("Error request data:", error.request);
      return {
        success: false,
        message:
          "No response received from the server while requesting the delivery quote",
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("General Error Message:", error.message);
      return {
        success: false,
        message:
          "An unknown error occurred while requesting the delivery quote",
      };
    }
  }
};

export const createUberDelivery = async (deliveryData) => {
  try {
    const response = await fetch(`${app_url}/createUberDelivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deliveryData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    const trackingUrl = result.trackingUrl;
    const uuid = result.uuid;

    return {
      success: true,
      data: { trackingUrl, uuid },
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error: " + error.message,
    };
  }
};

export const placeOrder = async (orderData) => {
  try {
    const response = await fetch(`${app_url}/placeOrder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        message: result.message || "Order placement failed",
      };
    }

    return {
      success: true,
      orderId: result.order.id,
      RestaurantId: result.order.restaurant_id,
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error: " + error.message,
    };
  }
};

// Function to update the order with tracking information
export const updateOrderWithTrackingInfo = async (orderId, trackingData) => {
  try {
    const response = await fetch(`${app_url}/updateOrder/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(trackingData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to update order with tracking info",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error: " + error.message,
    };
  }
};

// export const rollbackOrder = async (orderId) => {
//   try {
//     const response = await fetch(`${app_url}/rollbackOrder/${orderId}`, {
//       method: "DELETE",
//     });

//     const result = await response.json();

//     if (!response.ok) {
//       console.error("Failed to rollback order:", result.message);
//     }
//   } catch (error) {
//     console.error("Error during rollback:", error.message);
//   }
// };
