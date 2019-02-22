const path = require('path');
const crypto = require('crypto2');

const { Geo } = require('./base');

class Auth extends Geo {
    constructor(...args) {
        super(...args);
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

    async initialize({ email: address }) {
        let email = await Auth.Models.Email.findOne({
            query: {
                address,
                account: {
                    role: {
                        service: {
                            name: process.env.SERVICE
                        }
                    },
                    email: true
                }
            }
        });

        if(email && email.account && email.account.role.name === 'Administrators') {
            if(this.payload._id === email.account._id) {
                let users = await Auth.Models.Service.find({
                    query: {
                        _id: email.account.role.service._id,
                        roles: {
                            accounts: {
                                class: Auth.Models.User,
                                email: true,
                                wallet: true
                            },
                            limit: true
                        }
                    }
                });

                /* users = await Auth.Models.Node.delete({
                    labels: [process.env.SERVICE]
                }); */
                /* let users = await Auth.Models.User.delete({
                    query: {
                        email: true,
                        wallet: true,
                        role: {
                            service: {
                                name: process.env.SERVICE,
                                roles: {
                                    limit
                                }
                            },
                            limit: true
                        }
                    },
                }); */

                console.log(users)
            }
            else throw { code: 403, message: 'Restricted for non Administrators.'};
        }
        else {
            console.log('exisits') //create admin here
            let role = await Auth.Models.Role.byName({ name: 'Administrators', service_name: process.env.SERVICE });
            await this.signup({ email: address }, role);
        }
    }

    async delete({ email: address }) {
        let email = await Auth.Models.Email.findOne({
            query: {
                address,
                account: {
                    role: {
                        service: {
                            name: process.env.SERVICE
                        },
                        limit: true
                    },
                    
                    email: true
                }
            }
        });

        if(email && email.account) {
            let payload = Auth.formatPayload(email.account);

            let account_class = email.account.class;

            let account = await Auth.Models[account_class].findOne({
                query: {
                    _id: email.account._id,
                    email: true,
                    wallet: true
                }
            });

            account = await Auth.Models[account_class].delete({ query: account });

            let self_delete = email.account._id === this.payload._id;
            if(self_delete) {
                await Auth.clearCache(this.payload);
                //this.payload = await Auth.shadow(this.payload);
                this.payload = void 0;
            }
            
            console.log(account);
        }
        else throw { code: 404, message: 'User not found.'};
    }

    async signout() {
        await Auth.clearCache(this.payload);
        this.payload.class !== 'Shadow' && (this.payload = await Auth.shadow(this.payload));
    }

    async signup({ email: address } = {}, role) {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') 
            throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'}; */
        role = role || await Auth.Models.Role.byName({ name: 'Users', service_name: process.env.SERVICE });


        let user = address && await Auth.Models.User.findOne({
            query: {
                email: {
                    address
                },
                role: {
                    service: {
                        name: process.env.SERVICE
                    }
                }
            }
        });

        if(user) {
            if(user.role.service.name !== role.service.name) {
                user = await Auth.Models.User.save({
                    query: {
                        ...user,
                        _id: Auth.Models.User.id,
                        role
                    }
                });
            }
            else throw { code: 409, message: 'User alresdy exists.'};
        }
        else {
            user = await Auth.randomUser();

            user = {
                avatar: user.picture.thumbnail, 
                email: {
                    _id: Auth.Models.User.id,
                    address: address || user.email
                },
                name: `${user.name.title}. ${user.name.first} ${user.name.last}`
            }
    
    
            const new_keys = await crypto.createKeyPair();
            let { privateKey, publicKey } = new_keys;
    
            user = await Auth.Models.User.save({
                query: {
                    ...user,
                    role,
                    wallet: {
                        publicKey,
                        privateKey
                    }
                }
            });
        }
        

        this.payload = Auth.formatPayload(user);

        /* return {
            account: this.payload
        } */
    }

    async signin({ email: address, password }) {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') {
            throw { code: 403, message: 'Cannot signin again while singed in. Sign out and try again.'};
        } */

        address = address || 'user@example.com';
        password = password || '123';

        let email = await Auth.Models.Email.findOne({
            query: {
                address,
                account: {
                    role: {
                        service: {
                            name: process.env.SERVICE
                        }
                    },
                    email: true
                }
            }
        });

        if(email && email.account) {
            let shadow_id = this.payload.class === 'Shadow' && this.payload._id;

            this.payload = Auth.formatPayload(email.account);
            shadow_id && (this.payload.shadow_id = shadow_id);
        }
        else throw { code: 404, message: 'User not found.'};
    }
}

module.exports = {
    Auth
}