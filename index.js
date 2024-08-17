const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

require("dotenv").config();

app.use(express.json());
app.use(cors());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const productCollectionName = "products";
let productCollection;

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const database = client.db("product_db");
    productCollection = database.collection(productCollectionName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Connect to the database once when the server starts
connectToDatabase().catch(console.error);

// Get products with query parameters for search, filter, sort, and pagination
app.get('/api/products', async (req, res) => {
  const { search, category, brand, priceRange, sort, page = 1, limit = 8 } = req.query;

  try {
    const query = {};
    if (search) query.productName = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (priceRange) {
      if (priceRange === 'low') query.price = { $lt: 500 };
      else if (priceRange === 'medium') query.price = { $gte: 500, $lt: 1000 };
      else if (priceRange === 'high') query.price = { $gte: 1000 };
    }
    console.log(query)
    const sortOptions = {};
    if (sort === 'LowToHigh') sortOptions.price = 1;
    else if (sort === 'HighToLow') sortOptions.price = -1;
    else if (sort === 'newestFirst') sortOptions.createdAt = -1;

    const skip = (page - 1) * limit;

    const productsCount = await productCollection.countDocuments(query);
    const totalPages = Math.ceil(productsCount / parseInt(limit));

    const products = await productCollection.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray(); 

    res.json({products, totalPages});
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
