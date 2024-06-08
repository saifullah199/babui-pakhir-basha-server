const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const {} = require("mongodb");

const port = process.env.PORT || 5000;

// middlewares

// const corsOptions = {
//   origin: ["http://localhost:5173"],
//   credentials: true,
//   optionSuccessStatus: 200,
// };
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
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
    const userCollection = client.db("apartmentDB").collection("users");
    const announceCollection = client
      .db("apartmentDB")
      .collection("announcements");
    const couponCollection = client.db("apartmentDB").collection("coupons");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
      console.log(token);
    });
    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // rooms related api
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

    // get all agreement data from db
    app.get("/agreement", async (req, res) => {
      const result = await agreementCollection.find().toArray();
      res.send(result);
    });

    // post agreement data to db
    // app.post("/agreements", async (req, res) => {
    //   const userItem = req.body;
    //   console.log(userItem);
    //   const result = await agreementCollection.insertOne(userItem);
    //   res.send(result);
    // });

    app.put("/agreements", async (req, res) => {
      const userItem = req.body;
      const isExist = await agreementCollection.findOne({
        email: userItem?.email,
      });
      if (isExist)
        return res
          .status(400)
          .send({ message: "You have already requested for an apartment" });

      // const result = await agreementCollection.insertOne(user);
      // res.send(result);
      const options = { upsert: true };
      const query = { email: user?.email };
      const updateDoc = {
        $set: { ...userItem },
      };

      const result = await agreementCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // app.put("/agreements", async (req, res) => {
    //   const userItem = req.body;
    //   const query = {
    //     email: userItem.email,
    //     apartment_no: userItem.apartment_no,
    //   };

    //   const isExist = await agreementCollection.findOne(query);
    //   if (isExist) {
    //     return res
    //       .status(400)
    //       .send({ message: "You have already requested for this apartment" });
    //   }

    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: { ...userItem },
    //   };

    //   const result = await agreementCollection.updateOne(
    //     query,
    //     updateDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    // update agreement status
    app.patch("/agreement/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: updatedStatus.status },
      };
      const result = await agreementCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // get a agreement by email address
    app.get("/person/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await agreementCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await agreementCollection.find(query).toArray();
      res.send(result);
    });

    // update user role
    app.patch("/user/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const updateRole = req.body.role;
      const query = { email: email };
      const updateDoc = {
        $set: { role: updateRole },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
      console.log(result);
    });

    // users related apis
    // app.post("/users", async (req, res) => {
    //   const userInfo = req.body;
    //   console.log(userInfo);
    //   const result = await userCollection.insertOne(userInfo);
    //   res.send(result);
    // });

    // save a user data to db
    app.put("/user", async (req, res) => {
      const user = req.body;
      const isExist = await userCollection.findOne({ email: user?.email });
      if (isExist) return res.send(isExist);

      const options = { upsert: true };
      const query = { email: user?.email };
      const updateDoc = {
        $set: { ...user },
      };

      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get a user role by email from db
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await userCollection.findOne({ email: email });
      res.send(result);
    });

    // get all users data from db
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //  payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // announcement related api
    // get all announcements
    app.get("/announcements", async (req, res) => {
      const result = await announceCollection.find().toArray();
      res.send(result);
    });
    // post an announcement
    app.post("/announces", async (req, res) => {
      const announcement = req.body;
      const result = await announceCollection.insertOne(announcement);
      res.send(result);
    });

    // coupon related api

    // get all coupons for

    app.get("/coupons", async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });

    // post a coupon
    app.post("/coupons", async (req, res) => {
      const announcement = req.body;
      const result = await couponCollection.insertOne(announcement);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
