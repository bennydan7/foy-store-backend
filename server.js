require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Items = require("./Item");
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

// Create a checkout session
app.post("/create-checkout-session", async (req, res) => {
  const { products, userName, email } = req.body;
  try {
    // Construct line items for the checkout session
    const lineItems = await Promise.all(
      products.map(async (product) => {
        // Retrieve product information from your database or wherever it's stored
        const item = Items.find((item) => item.id === product.id);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
            },
            unit_amount: item.price * 100, // Convert price to cents
          },
          quantity: product.count,
        };
      })
    );

    // Create a checkout session with the line items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      mode: "payment",
      success_url: "https://foy-store-frontend.vercel.app/checkout/success", // Redirect URL after successful payment
      cancel_url: "https://foy-store-frontend.vercel.app/checkout/cancel", // Redirect URL after canceled payment
      line_items: lineItems,
    });

    // Return the session ID to the client
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Error creating checkout session" });
  }
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
