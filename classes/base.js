const path = require('path');
const crypto = require('crypto2');

const { Classes } = require('../api');
const { API, SecuredAPI } = Classes;

class Geo extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    $getToken(method_name, ...args) {
        let [params = {}] = args;
        
        return params.token;
    }

    $setToken(token) {
        this.res.setHeader('access-token', token);
    }

    async $verifyToken(token) {
        if(token) {
            let payload = await super.$verifyToken(token);
            
            if(payload.token_error)
                throw { code: 403, ...payload.token_error };

            return payload;
        }

        return {};
    }

    async $executeAction(...args) {
        let response = await super.$executeAction(...args);

        //response = 'hello';
        response = { content: response, addons: { payload: this.payload }};
        //typeof(response) === 'object' && (response = { ...response, _sign_: `${this.payload.class}: ${this.payload.name}`});
        return response;
    }

    async $refreshToken(method_name, ...args) {
        return this.payload && Object.keys(this.payload).length && await super.$refreshToken(method_name, ...args);
    }

}

module.exports = {
    Geo
}