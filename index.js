const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookeParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://assignment-11-7da79.web.app',
        'http://assignment-11-7da79.firebaseapp.com'
    ],
    credentials: true, // Allow credentials
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookeParser())

const logger = (req, res, next) => {
    console.log(req.method, req.url);
    next()
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token at the middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3mmbmgw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const postCollections = client.db("volunteerDB").collection("posts");
        const requestCollections = client.db("volunteerDB").collection("requests");

        //auth api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d',
            })
            res.cookie('token', token, cookieOption).send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { ...cookieOption, maxAge: 0 })
                .send({ success: true })
        })

        app.get('/posts', async (req, res) => {
            console.log('cookies', req.cookies)
            const cursor = postCollections.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/posts/:id', logger, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollections.findOne(query);
            res.send(result);

        })

        app.get('/myPost/:email', logger, verifyToken, async (req, res) => {
            // console.log('token owner info:', req.user)
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: req.params.email };
            const result = await postCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/myRequests/:email', logger, verifyToken, async (req, res) => {

            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: req.params.email };
            const result = await requestCollections.find(query).toArray();
            res.send(result);
        })

        app.post('/posts', async (req, res) => {
            const newPost = req.body;
            const result = await postCollections.insertOne(newPost);
            res.send(result);
        })

        app.post('/requests', logger, async (req, res) => {
            const newRequest = req.body;
            const result = await requestCollections.insertOne(newRequest);
            res.send(result)
        })

        app.delete('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollections.deleteOne(query);
            res.send(result);

        })
        app.delete('/requests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await requestCollections.deleteOne(query);
            res.send(result);

        })

        app.put('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatePost = req.body;
            const post = {
                $set: {
                    title: updatePost.title,
                    image: updatePost.image,
                    category: updatePost.category,
                    description: updatePost.description,
                    location: updatePost.location,
                    numberOfVolunteer: updatePost.numberOfVolunteer,
                    deadline: updatePost.deadline
                }
            }
            const result = await postCollections.updateOne(filter, post);
            res.send(result);
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('assignment is running')
})

app.listen(port, () => {
    console.log(`assignment is running on port ${port}`)
})