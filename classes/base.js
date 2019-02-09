const path = require('path');
const crypto = require('crypto2');

const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes({ Models: require('../models') });

class Base extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    $getToken(method_name, ...args) {
        let [params = {}] = args;
        
        if(params.token)
            return params.token;

        

        if(!this.payload) {
            this.payload = {
                //role: 'none'
            }
        }

        if(!params.token && !this.payload) {            
            throw { code: 401, message: 'No access token.' };
        }
    }

    $setToken(token) {
        this.res.setHeader('access-token', token);
    }

    async $verifyToken(token) {
        let payload = await super.$verifyToken(token);
        
        if(payload.token_error)
            throw { code: 403, ...payload.token_error };

        return payload;
    }

    async $executeAction(method_name, target, reciever, ...args) {
        let response = await super.$executeAction(method_name, target, reciever, ...args);

        typeof(response) === 'object' && (response = { ...response, _sign_: `${this.payload.class}: ${this.payload.name}`});
        return response;
    }

    async $refreshToken(method_name, ...args) {
        return Object.keys(this.payload).length && await super.$refreshToken(method_name, ...args);
    }
}

module.exports = {
    Base
}