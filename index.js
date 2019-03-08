require('dotenv').config({
    path: '.env.local'
});

const express = require('express');
const app = express();

const { RouterInit } = require('./api');

const { Router } = RouterInit({ Classes: { ...require('./classes') }});

app.use('/api', Router);

app.listen(process.env.PORT || 8000, function () {
    console.log(`Example app listening on port ${process.env.PORT || 8000}!`);

    const axios = require('axios');
    (async() => {

        for(let i = 1; i <= 10000; i++) {
            /* axios.get(`http://localhost:8001/api/auth.signin?email=yvan.lefevre@example.com`)
            .then(response => response && console.info(i, response.data))
            .catch(err => console.error(i, err)); */
            
            /* axios.get(`http://localhost:${process.env.PORT}/api/auth.signup`).catch(err => console.error(i, err))
                .then(response => response && console.info(i, response.data)); */
            
            //await sleep(97);
        }
    })();
});

const sleep = (ms = 1000) => new Promise(resolve => {
    setTimeout(() => resolve(200), ms);
})