const path = require('path');
const crypto = require('crypto2');

const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes({ Models: require('../models') });

class GEO extends SecuredAPI {
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

    async avatar() {
        //debugger
        let uploads = path.join(process.cwd(), 'uploads');
        
        let avatar = this.payload.avatar || 'default_user.png';

        if(this.payload.class === 'Shadow') {
            return {
                $redirect: true,
                url: avatar
            };
        }
        else {
            avatar = path.join(uploads, !avatar ? 'anonymous' : this.payload._id, avatar);

            return {
                $sendAsFile: true,
                file: avatar
            };
        }

    }

    async hello(...args) {
        return { hello: 'world', ...args };
    }

    async delete({ email: address }) {
        let email = await API.Models.Email.findOne({
            address,
            account: {
                role: {
                    service: {
                        name: process.env.SERVICE || 'DEFAULT'
                    }
                },
                email: true
            }
        });

        if(email && email.account) {
            let payload = API.formatPayload(email.account);

            let account_class = email.account.class;

            let account = await API.Models[account_class].findOne({
                _id: email.account._id,
                email: true,
                wallet: true
            });

            account = await API.Models[account_class].delete(account);

            let self_delete = email.account._id === this.payload._id;
            if(self_delete) {
                await API.clearCache(this.payload);
                this.payload = await API.shadow(this.payload);
            }
            
            console.log(account);
        }
    }

    async signout() {
        await API.clearCache(this.payload);
        this.payload.class !== 'Shadow' && (this.payload = await API.shadow(this.payload));
    }

    async signup() {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') 
            throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'}; */

        let shadow = await API.Models.Shadow.findOne({
            _id: this.payload._id,
            email: true
        });

        if(!shadow) {
            this.payload = await API.shadow(this.payload);
            await this.signup();
        }

        if(shadow) {
            let role = await API.Models.Role.byName({ name: 'Users', service_name: process.env.SERVICE || 'DEFAULT' });
    
            const new_keys = await crypto.createKeyPair();
            let { privateKey, publicKey } = new_keys;

            let user = await API.Models.Shadow.transformTo(API.Models.User, {
                ...shadow,
                //hash:
                avatar: '',
                role,
                wallet: {
                    publicKey,
                    privateKey
                }
            })
    
            await API.clearCache(this.payload);
            this.payload = API.formatPayload(user);
        }
        //else throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'};

        //return this.payload;
    }

    async signin({ email: address, password }) {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') {
            throw { code: 403, message: 'Cannot signin again while singed in. Sign out and try again.'};
        } */

        address = address || 'user@example.com';
        password = password || '123';

        let email = await API.Models.Email.findOne({
            address,
            account: {
                role: {
                    service: {
                        name: process.env.SERVICE || 'DEFAULT'
                    }
                },
                email: true
            }
        });

        if(email && email.account) {
            //await this.isShadow(email.account.class);
            //await this.isService(process.env.SERVICE || 'DEFAULT');

            let shadow_id = this.payload.class === 'Shadow' && this.payload._id;

            this.payload = API.formatPayload(email.account);
            shadow_id && (this.payload.shadow_id = shadow_id);
        }
        else throw { code: 404, message: 'User not found.'};
    }
}

module.exports = {
    GEO
}