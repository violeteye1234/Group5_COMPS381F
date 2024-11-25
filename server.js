const express = require('express');
const app = express();
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//const cors = require('cors');
//app.use(cors());
//app.get('/favicon.ico', (req, res) => res.status(204));

//login
const users_login = {
    'test1': 'abc',
    'test2': 'def'
};

app.use(session({
    secret: "Group5SecretStr",
    resave: true,
    saveUninitialized: true
}));

const animalSchema = require('./models/animal');
const animals = mongoose.model('animal', animalSchema);

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true })); // Middleware to parse form data

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new FacebookStrategy({
    clientID: '1585378616193751',
    clientSecret: '2d820434613624fb157711fda31a449f',
    callbackURL: 'http://localhost:8099/auth/facebook/callback'
},
    (token, refreshToken, profile, done) => {
        console.log("Facebook Profile: " + JSON.stringify(profile));
        let user = {};
        user['id'] = profile.id;
        user['name'] = profile.displayName;
        user['type'] = profile.provider;
        console.log('user object: ' + JSON.stringify(user));
        return done(null, user);
    })
);

//mongodb connection
var { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const mongourl = 'mongodb+srv://kyk123456:031216Kyk@cluster0.pter2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'Animals';
const collectionName = 'animal';


const client = new MongoClient(mongourl,{
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.set('view engine', 'ejs');
app.set('views', './views'); 

app.use(express.static('public'));

app.use((req, res, next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);
    next();
});

const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};

//find all animals
const findAllAnimals = async (db, criteria = {}) => {	
	let findResults = [];
	let collection = db.collection(collectionName);

    findResults = await collection.find(criteria).toArray();

    console.log(`findCriteria: ${JSON.stringify(criteria)}`);
	console.log(`findDocument: ${findResults.length}`);
	console.log(`findResults: ${JSON.stringify(findResults)}`);	

    return findResults;
};

const handle_FindAll = async (res) => {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    const animal = await findAllAnimals(db);
    // Combine the results
    const allAnimals = [...animal];
    await client.close();
    console.log("Closed DB connection")
    res.status(200).render('history', { nAnimals: allAnimals.length, animals: allAnimals }); // Pass both nAnimals and animals
};

const findOneAnimalDocument = async (db, criteria) => {
    const collection = db.collection(collectionName);
    return await collection.find(criteria).toArray();
    console.log("findOnaAnimalDocument", collection)
};

const handle_FindOne = async (req, res) => {
    let db;
    try {
        await client.connect();
        console.log("Connected successfully to server");
        db = client.db(dbName);

        console.log("Request body:", req.body);

        // create query
        const criteria = {
            Location: new RegExp(req.body.Location, 'i'), // 'i' 表示忽略大小写
            Type: new RegExp(req.body.Type, 'i'),
            Breed: new RegExp(req.body.Breed, 'i'),
            Gender: new RegExp(req.body.Gender, 'i'),
            Prominent_Features: new RegExp(req.body.Prominent_Features, 'i'),
            Disabilities: new RegExp(req.body.Disabilities, 'i'),
            Adopted: new RegExp(req.body.Adopted,'i')
        };
        
        console.log("Search criteria:", criteria);//for debug
        // 移除空或未定义的键
        Object.keys(criteria).forEach(key => {
            if (!criteria[key]) {
                delete criteria[key];
            }
        });
        console.log("Search criteria2:", criteria);//for debug

        const foundAnimals = await findOneAnimalDocument(db, criteria);
        console.log("Found Results :", foundAnimals);

        if (foundAnimals.length > 0) {
            res.status(200).render('view1', { variable1: foundAnimals});
        } else {
            console.log('No results found');
            res.redirect('/history');
        }
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).send("Internal server error");
    } finally { 
    	if (db) {
    		await client.close();
    	}
    }
};

const passAnimalDocument = async (req, res) => {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    const DOCID = {_id: new ObjectId(req.params.id)};
    const animal = await findOneAnimalDocument(db, DOCID);

    if(animal.length > 0) {
        res.render('view_update', {animal: animal[0]});
    } else {
        console.log('find method wrong or Animal not found')
    }
}

//update View 
const updateDocument = async (db, criteria, updateData) => {
	var collection = db.collection(collectionName);
	let results = await collection.updateOne(criteria,{$set: updateData});
	return results;
}


///errrrrrrrrrooooooooooorrrrrrrrr 
const handle_UpdateSaveView = async (req, res) => {
	await client.connect();
	console.log("Connected successfully to server");
	const db = client.db(dbName);
	//let DOCID = {_id: ObjectId(req.params.id)};
	let DOCID = {_id: new ObjectId(req.params.id)};
	const docs = await findOneAnimalDocument(db, DOCID);
	console.log("Documents found:", docs);
	if (docs.length > 0 && docs[0]._id === req._id) {
		const updateData = {
			Animal_name: req.body.Animal_name,
			Type: req.body.Type,
			Breed: req.body.Breed,
			Gender: req.body.Gender,
			Location: req.body.Location,
			Prominent_Features: req.body.Prominent_Features,
			Disabilities: req.body.Disabilities,
			Adopted: req.body.Adopted
		};
		console.log("Update data:", updateData);
		const results = await updateDocument(db, DOCID, updateData);
		console.log("Update results:", results);
		res.status(200).render('info', {message: `Updated ${results.modifiedCount} document(s)`, user: req.user});
		 //res.render('history');
		 res.redirect('history');
	} else {
		res.status(500).render('info', {message: 'save error !', user: req.user});	
	}
}

//DELETE
const deleteDocument = async (db,criteria) => {
    var collection = db.collection(collectionName);
    let results = await collection.deleteMany( criteria );
    return results;
}

const handle_Delete = async(req,res) => {
    await client.connect();
    const db = client.db(dbName);
    let DOCID = {_id: ObjectId.createFromHexString(req.body._id)}; 
    const docs = await findOneAnimalDocument(db,DOCID);
    if (docs.length > 0 && docs[0].userid === req.user.id) {
        await deleteDocument(db,DOCID);
        res.redirect('/history');
    }else{
    	console.log('didnt work');
        res.redirect('/history');
    }
}
// Serve the login form
app.get("/login", (req, res) => {
    res.render('login', { message: null }); // Use 'login.ejs' for the form
});

app.post("/login", (req, res, next) => {
    const username = req.body.name;
    const password = req.body.password;
    if (users_login[username] && users_login[username] === password) {
        req.login({ username: username }, (err) => {
            if (err) {
                return res.render('login', { message: 'Login failed. Please try again.' });
            }
            return res.redirect('/content'); // Redirect to content after successful login
        });
    } else {
        res.render('login', { message: 'Invalid username or password' }); // Render 'login.ejs' with the message
    }
});

app.get("/auth/facebook", passport.authenticate("facebook", { scope: "email" }));
app.get("/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/content",
        failureRedirect: "/login"
    })
);

//delete post
app.post('/delete', isLoggedIn, async (req, res) => {
    console.log("Delete request received"); 
    await handle_Delete(req, res);
});

app.get('/', isLoggedIn, (req, res) => {
    res.redirect('/content');
});

app.get("/content", isLoggedIn, (req, res) => {
    res.render('loggedIn', { user: req.user }); // Use 'loggedIn.ejs' for logged-in view
});

app.get("/view", isLoggedIn, (req, res) => {
	res.render('view', {user: req.user});
});

//view_find POST
app.post('/view', isLoggedIn, async (req, res) => {
    console.log("view find req");
    await handle_FindOne(req, res);
})

//view_update get
// use /:id 从view1.ejs update button处拿 animal._id
app.get('/update/:id', isLoggedIn, async(req, res) => {
    console.log("update start!");
    await passAnimalDocument(req, res);
})

//view_save update
app.post('/update/:id', isLoggedIn, async(req, res) => {
	console.log("update to save");
	await handle_UpdateSaveView(req, res, req.query);	
})

app.get("/report", isLoggedIn, (req, res) => {
	res.render('report', {user:req.user});
});

app.get('/history', isLoggedIn, (req, res) => {
    handle_FindAll(res); // Calls handle_Find to show all animals
});
app.get("/help", isLoggedIn, (req, res) => {
	res.render('help', {user: req.user});
});

app.get("/information", isLoggedIn, (req, res) => {
	res.render('information', {user: req.user});
});

app.get('/*', (req, res) => {
    res.status(404).render('information', { message: `${req.path} - Unknown request! `});
});

const port = process.env.PORT || 8099;
app.listen(port, () => { 
    console.log(`Listening at http://localhost:${port}`); 
});
