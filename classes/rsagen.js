const crypto = require('crypto2');


/* process.on('message', (m) => {
    console.log('CHILD got message:', m);

    crypto.createKeyPair().then(({ privateKey, publicKey }) => {
        process.send({ privateKey, publicKey });
    });
}); */


crypto.createKeyPair().then(({ privateKey, publicKey }) => {
    process.send({ privateKey, publicKey });
});

/* 
process.on('message', (msg) => {
    console.log('Message from parent:', msg);
});
  
let counter = 0;

setInterval(() => {
    process.send({ counter: counter++ });
}, 1000); */