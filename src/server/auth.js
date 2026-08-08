const bcrypt = require('bcrypt');
const argon2 = require('argon2');
require('express-session');
const jdata = require('./jdata');

module.exports = function (app) {
    app.post('/auth', (req, res) => {
        const username = req.body.username;
        const password = req.body.password;

        //Verify Username and Password are present
        if (!username || !password) {
            res.status(400).json({ code: 1, error: "Please enter a Username and Password" });
            return;
        }

        //Read Original Data (find accounts -> item with matching username, get password from it)
        const data = jdata.get();
        const account = data.accounts.find(account => account.username === username);

        //Check if account exists
        if (!account) {
            res.status(401).json({ code: 2, error: "Incorrect Username or Password" });
            return;
        }

        //Check if account is enabled or not
        if (!account.enabled) {
            res.status(401).json({ code: 2, error: "Account is not enabled. Please contact your system administrator."});
            return;
        }

        //Check if Password Encryption is enabled.
        if (account.peEnable === true || account.peEnabled === true) {
            const setPasswordHash = account.password;

            //Compare Here
            bcrypt.compare(password, setPasswordHash, (err, result) => {
                if (err) {
                    //Error Comparing Passwords
                    res.status(500).json({ code: 1, error: "Internal Server Error" });
                    return;
                }

                if (!result) {
                    //Passwords Don't Match
                    res.status(401).json({ code: 2, error: "Incorrect Username or Password" });
                    return;
                }

                //Passwords Match   
                //TODO: Do session stuff

                establishSession(req, account);
                res.status(200).json({ code: 0, sessionToken: "kys", peStatus: true });
            });
        } else {
            if (password == account.password) {

                //Passwords Match
                //TODO: Do session stuff

                establishSession(req, account);


                res.status(200).json({ code: 0, sessionToken: "kys", peStatus: false })
            } else {
                res.status(401).json({ code: 2, error: "Incorrect Username or Password" });
                return;
            }
        }


    });

    function establishSession(req, account) {
        req.session.a_username = account.username;
        req.session.a_name = account.name || account.username;
        req.session.a_createdAt = account.createdAt;
        req.session.a_createdBy = account.createdBy;
        req.session.a_lastLogin = account.lastLogin;
        req.session.a_peEnabled = account.peEnable === true || account.peEnabled === true;
        req.session.a_permissions = account.permissions;
        req.session.loggedIn = true;
        account.lastLogin = new Date().toISOString();
        jdata.save(jdata.get());
    }

    app.put('/api/profile', async (req, res) => {
        if (req.session.loggedIn !== true) return res.status(401).json({ code: 1, message: 'Not logged in' });
        const cache = jdata.get();
        const account = cache.accounts.find((item) => item.username === req.session.a_username);
        if (!account) return res.status(404).json({ code: 1, message: 'Account not found' });
        const name = String(req.body.name || '').trim();
        if (!name || name.length > 100) return res.status(400).json({ code: 1, message: 'Name must be between 1 and 100 characters.' });
        account.name = name;
        if (req.body.password) {
            if (String(req.body.password).length < 10) return res.status(400).json({ code: 1, message: 'Password must contain at least 10 characters.' });
            account.password = await bcrypt.hash(String(req.body.password), 12);
            account.peEnable = true;
        }
        req.session.a_name = name;
        jdata.save(cache);
        res.json({ code: 0, message: 'Profile updated.' });
    });

    app.get('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                res.status(500).send("Could not log out. Please try again later.");
                return;
            }

            res.redirect('/login');
        });
    });


    //Not Implemented Yet
    async function argon2VerifyPassword(password, hash) {
        try {
            const match = await argon2.verify(hash, password);
            return match;
        } catch (err) {
            // Handle error
        }
    }

    //Not Implemented Yet
    async function argon2HashPassword(password) {
        try {
          const hash = await argon2.hash(password);
          return hash;
        } catch (err) {
          // Handle error
        }
      }
}
