const express = require("express");
const cors = require("cors");
const stripe = require("stripe");
const Items = require("./Item");

// Load environment variables
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configure Stripe
const configureStripe = () => {
  return stripe(process.env.STRIPE_SECRET_KEY);
};

// Create a checkout session
app.post("/create-checkout-session", async (req, res) => {
  const { products, email } = req.body;
  try {
    const stripeInstance = configureStripe();

    // Construct line items for the checkout session
    const lineItems = await Promise.all(
      products.map(async (product) => {
        const item = Items.find((item) => item.id === product.id);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${item.name} (Size: ${product.size})`,
              description: product.shortDescription, // Add shortDescription here
            },
            unit_amount: item.price * 100,
          },
          quantity: product.count,
        };
      })
    );

    // Create shipping options
    const shippingOptions = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 1500,
            currency: "usd",
          },
          display_name: "Next day air",
          tax_behavior: "exclusive",
          tax_code: "txcd_92010001",
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 1,
            },
            maximum: {
              unit: "business_day",
              value: 1,
            },
          },
        },
      },
    ];

    // Create a checkout session with the line items and shipping options
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      mode: "payment",
      automatic_tax: {
        enabled: true,
      },
      success_url: "https://foyclothing.store/checkout/success",
      cancel_url: "https://foyclothing.store",
      shipping_address_collection: {
        allowed_countries: [], // Adjust this based on your requirements
      },
      shipping_address_collection: "required",
      shipping_options: shippingOptions,
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
