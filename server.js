const express = require('express');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

const url = 'mongodb+srv://collman:5JGZE4y6yoA2Klv5@mydatabase.fbwvnl5.mongodb.net/mydatabase?retryWrites=true&w=majority';
const dbName = 'mydatabase';


mongoose.connect(url, { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String // Adding email to the schema
});

const User = mongoose.model('User', userSchema);

async function authenticateAdmin(email, password) {
  const client = new MongoClient(url, { useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const adminsCollection = db.collection('admins');
    const admin = await adminsCollection.findOne({ email, password });
    return admin !== null;
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return false;
  } finally {
    await client.close();
  }
}

async function fetchAllUsersAsAdmin() {
  try {
    const allUsers = await User.find({}, 'email'); // Fetch only emails using Mongoose
    return allUsers;
  } catch (err) {
    console.error('Error fetching all users as admin:', err);
    throw err;
  }
}

app.get('/admin/show_users', async (req, res) => {
  try {
    const allUsers = await fetchAllUsersAsAdmin();
    res.json(allUsers);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/admin/show_contacts', async (req, res) => {
  res.status(405).send('Method Not Allowed');
});

app.post('/admin/show_contacts', async (req, res) => {
  try {
    const isAdminAuthenticated = await authenticateAdmin(req.body.email, req.body.password);

    if (isAdminAuthenticated) {
      const client = new MongoClient(url, { useUnifiedTopology: true });

      try {
        await client.connect();
        const db = client.db(dbName);
        const contactsCollection = db.collection('contacts');
        const allContacts = await contactsCollection.find({}, { projection: { _id: 0, password: 0 } }).toArray();
        res.json(allContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send('Internal Server Error');
      } finally {
        await client.close();
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  } catch (error) {
    console.error('Error authenticating admin:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/views/signin.html');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdminAuthenticated = await authenticateAdmin(email, password);

    if (isAdminAuthenticated) {
      await fetchAllUsersAsAdmin();
      res.redirect('/dashboard.html');
    } else {
      res.status(401).send('Unauthorized');
    }
  } catch (error) {
    console.error('Error authenticating admin:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(__dirname + '/views/dashboard.html');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
