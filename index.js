const cors = require("cors");
require("dotenv").config();
const FirebaseService  = require('./services/firebaseService');
const firebaseServiceInstance = new FirebaseService();

const {
  Stripe_Prebuild_checkout,
  getSubscriptionStatus,
  getStripeProducts,
  postCreateSubscription,
  getClientSecret,
  processPayment,
  getStripeSubscriptions,
  cancelStripeSubscription,
  updateStripeSubscription
} = require("./Stripe");
require("dotenv").config();

const express = require("express");
const app = express();
app.use(express.json());

app.use(function (req, res, next) {
  var oneof = false;
  if (req.headers.origin) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    oneof = true;
  }
  if (req.headers["access-control-request-method"]) {
    res.header(
      "Access-Control-Allow-Methods",
      req.headers["access-control-request-method"]
    );
    oneof = true;
  }
  if (req.headers["access-control-request-headers"]) {
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"]
    );
    oneof = true;
  }
  if (oneof) {
    res.header("Access-Control-Max-Age", 60 * 60 * 24 * 365);
  }

  // intercept OPTIONS method
  if (oneof && req.method == "OPTIONS") {
    res.send(200);
  } else {
    next();
  }
});

app.listen(3001, () => {
  console.log(`Server running at ${process.env.APP_SERVER_DOMAIN_URL}`);
});

// app.get('/', (_, res) => {
//     res.redirect(308, `/create-checkout-session`)
// })


// Stripe Routes

app.get("/get-stripe-products", async (_, res) => {
  const data = await getStripeProducts();
  res.json(data);
});

app.get("/get-client-secret", async (req, res) => {
  await getClientSecret(res);
});

app.post("/create-subscription", async (req, res) => {
  const data = await postCreateSubscription(req, res);
  res.json(data);
});

app.post("/process-payment", async (req, res) => {
  await processPayment(req, res);
});

app.get("/create-checkout-session", async (_, res) => {
  const data = await Stripe_Prebuild_checkout();
  res.json(data);
});

app.post("/get-subscription-status", async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // Check if subscriptionId is provided
    if (!subscriptionId) {
      return res.status(400).json({ error: "Subscription ID is required." });
    }

    // Call the function to get subscription status based on the subscriptionId
    const subscriptionStatus = await getSubscriptionStatus(subscriptionId);

    if (subscriptionStatus.ok) {
      res.json({ ok: true, status: subscriptionStatus });
    } else {
      res.status(404).json({ ok: false, error: "Subscription not found" });
    }
  } catch (error) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});


app.post("/stripe-checkout-session", async (_, res) => {
  const url = await Stripe_Prebuild_checkout();
  res.redirect(303, url);
});

app.get("/stripe-checkout-success", async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if the payment was successful
    if (session.payment_status === "paid") {
      // Update your application state or handle other success-related logic
      res.send("Payment successful!");
    } else {
      res.send("Payment not successful.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving session information.");
  }
});

app.get("/stripe-checkout-failure", async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Handle cancellation or failure logic
    res.send(`Payment canceled or failed: ${session.payment_status}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving session information.");
  }
});

app.post("/get-stripe-subscriptions", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).send("Email is required.");
    }

    const result = await getStripeSubscriptions(email);

    if (result.ok) {
      const subscriptions = result.subscriptions;
      return res.json({ ok: true, subscriptions });
    } else {
      return res
        .status(404)
        .json({
          ok: false,
          error: "User not found or error getting subscriptions.",
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/cancel-stripe-subscription", async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    if (!subscriptionId) {
      return res.status(400).send("Subscription ID is required.");
    }

    const result = await cancelStripeSubscription(subscriptionId);

    if (result.ok) {
      const subscriptions = result.subscriptions;
      return res.json({ ok: true, subscriptions });
    } else {
      return res
        .status(404)
        .json({
          ok: false,
          error: "Subscription not found or error getting subscriptions.",
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

app.post("/update-stripe-subscription", async (req, res) => {
    const { subscriptionId, itemId, quantity } = req.body;
  
    try {
      if (!subscriptionId) {
        return res.status(400).send("Subscription ID is required.");
      }
  
      const result = await updateStripeSubscription(subscriptionId, itemId, quantity);
  
      if (result.ok) {
        const subscriptions = result.subscriptions;
        return res.json({ ok: true, subscriptions });
      } else {
        return res
          .status(404)
          .json({
            ok: false,
            error: "Subscription not found or error getting subscriptions.",
          });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).send("Internal Server Error");
    }
  });


// Firebase Routes

app.post("/status-changed", async (req, res) => {
  try {
    // Use the admin object from FirebaseService for Firebase operations
    const data = await firebaseServiceInstance.getDataFromFirebase(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});