const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');
const log = console.log;
const _ = require('lodash')

const authorizationClient = require('./service/authorizationClient');
const spotifyClient = require('./service/spotifyClient');


global.access_token = '';

app.listen(9000, () => {
    log('app listning to port 9000');
});

var corsOptions = {
    origin: 'http://localhost',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions));

app.use(session({
    secret: 'fiverr',
    saveUninitialized: true,
    resave: true,
    path: '/'
}));

app.get('/', (req, res) => {
    console.log('calling root to connect to spotify...')
    let url = 'https://accounts.spotify.com/fr/authorize?client_id=' +
        req.query.clientId +
        '&response_type=code&redirect_uri=http:%2F%2Flocalhost:9000%2Fcallback%2F&scope=user-read-currently-playing%20user-read-playback-position%20user-read-private%20user-read-email%20playlist-read-private%20user-library-read%20user-library-modify%20user-top-read%20playlist-read-collaborative%20playlist-modify-public%20playlist-modify-private%20user-follow-read%20user-follow-modify%20user-read-playback-state%20user-modify-playback-state%20user-read-recently-played';
    res.redirect(url);
});

app.get('/callback', async(req, res) => {
    req.session.code = req.query.code;
    authorizationClient.accessToken(req.query.code).then(token => {
        req.session.access_token = token.data.access_token;
        req.session.refresh_token = token.data.refresh_token;
        access_token = req.session.access_token;
        req.session.save(function(err) {
            console.log('session saved...');
        });
    }).catch(err => {
        res.status(500).send(err);
    });

    await refreshToken(req);
    res.redirect('http://localhost/Music.html');
});

app.get('/currently-playing', (req, res) => {
    spotifyClient.getCurrentlyPlayingTrack(access_token).then(response => {
        res.send(response.data);
    }).catch(err => {
        res.status(500).send(err);
    });
});

app.get('/current-device', (req, res) => {
    spotifyClient.getCurrentDevice(access_token).then(response => {
        let devices = _.filter(response.data.devices, { is_active: true })
        res.send(devices[0]);
    }).catch(err => {
        res.status(500).send(err);
    });
});

app.get('/tracker-cover', (req, res) => {
    spotifyClient.getTrackCover(access_token, req.query.track_id).then(response => {
        let cover = _.filter(response.data.album.images, { height: 300, width: 300 })
        res.send(cover);
    }).catch(err => {
        res.status(500).send(res)
    });
});

async function refreshToken(req) {
    setInterval(() => {
        authorizationClient.refreshToken(req.session.refresh_token).then((token) => {
            req.session.access_token = token.data.access_token;
            req.session.save(function(err) {
                // session saved
                console.log('session saved...');
            });
            console.log('token refreshed...');
        }).catch(err => {
            res.status(500).send(err);
        });
    }, 180000);
}

app.get('/action', (req, res) => {
    switch (req.query.action) {
        case 'next':
            spotifyClient.next(access_token).then((response) => {
                res.send(response.data || {});
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        case 'previous':
            spotifyClient.previous(access_token).then((response) => {
                res.send(response.data || {});
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        case 'play':
            spotifyClient.play(access_token).then((responseData) => {
                res.send(responseData.data || {});
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        case 'pause':
            spotifyClient.pause(access_token).then((responseData) => {
                res.send(responseData.data || {});
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        case 'shuffle':
            spotifyClient.shuffle(access_token, req.query.status).then(() => {
                res.send();
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        case 'repeat':
            spotifyClient.repeate(access_token, req.query.status).then(() => {
                res.send();
            }).catch(err => {
                res.status(500).send(err);
            });
            break;
        default:
            res.status(405);

    }
});