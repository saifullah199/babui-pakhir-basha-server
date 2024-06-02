const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.m4mzgzp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const roomCollection = client.db("apartmentDB").collection("rooms");
    const agreementCollection = client
      .db("apartmentDB")
      .collection("agreement");

    // apartment related api
    // get rooms
    app.get("/rooms", async (req, res) => {
      const result = await roomCollection.find().toArray();

      res.send(result);
    });

    // get rooms data from db for pagination
    app.get("/all-rooms", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      console.log(size, page);
      const result = await roomCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // get rooms data count from db
    app.get("/room-count", async (req, res) => {
      const count = await roomCollection.countDocuments();
      res.send({ count });
    });

    // agreement related apis
    app.post("/agreements", async (req, res) => {
      const userItem = req.body;
      console.log(userItem);
      const result = await agreementCollection.insertOne(userItem);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Apartment server is running");
});

app.listen(port, () => {
  console.log(`Apartment server is running on port: ${port}`);
});
