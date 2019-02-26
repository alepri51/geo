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

    async initialize({ email: address, password } = {}) {
        let admins = await Auth.Models.User.find({
            query: {
                roles: {
                    name: 'Administrators',
                    service: {
                        name: process.env.SERVICE
                    }
                },
            }
        });

        if(admins && admins.length) {
            let email = await Auth.Models.Email.findOne({
                query: {
                    address: this.payload.email,
                    account: {
                        class: Auth.Models.User,
                        roles: {
                            service: true
                            /* name: 'Administrators',
                            service: {
                                name: process.env.SERVICE
                            } */
                        }
                    }
                }
            });

            if(email) {
                if(email.account.roles.some(role => role.name === 'Administrators' && role.service.name === process.env.SERVICE)) {
                    if(this.payload._id === email.account._id) {

                        const delete_cql = `
                            MATCH (service:Service) WHERE service.name = $service
                            MATCH (service)<--(role:Role)
                            MATCH (role)-->(limit:\`Access Limit\`)
                            DETACH DELETE service, role, limit
                            WITH {} AS void
                            MATCH (account:Account) WHERE NOT (account)-->(:Role)
                            MATCH (account)-->(wallet:Wallet)
                            MATCH (account)-->(email:Email)
                            DETACH DELETE account, wallet, email
                        `

                        let { counters: { _stats }} = await Auth.database.query({ query: delete_cql, params: { service: process.env.SERVICE }});

                        return _stats;
                        //await this.initialize({ email: this.payload.email });
                        console.log('admin');
                    }
                    else throw { code: 403, message: 'Provide a valid token.'};
                }
                else throw { code: 403, message: 'Access denied for non Administrators.'};
                
            }
            else throw { code: 404, message: 'User not found.'};
        }
        else {
            let role = await Auth.Models.Role.byName({ name: 'Administrators' });

            await this.signup({ email: address, password }, role);
        }
    }

    async delete({ email: address }) {
        if(!address)
            throw { code: 405, message: 'Empty email is not allowed.' };

        let user = await Auth.Models.Account.findOne({
            query: {
                email: {
                    address
                }
            }
        });
        
        if(user) {
            let service = await Auth.Models.Service.findOne({
                query: {
                    name: process.env.SERVICE,
                    roles: {
                        name: 'Administrators',
                        accounts: {
                            email: true
                        }
                    }
                }
            });

            let [administrators] = service.roles;

            if(administrators && administrators.accounts.length === 1 && administrators.accounts.every(account => account.email.address === address))
                throw { code: 405, message: 'Not allowed to delete the last administrator.'};

            const delete_cql = `
                MATCH (service:Service) WHERE service.name = $service
                MATCH (service)<--(role:Role)
                MATCH (account:Account)-[rel:has]->(role)
                MATCH (account)-->(email:Email) WHERE email.address = $address
                DELETE rel
                WITH NULL AS void
                MATCH (account:Account) WHERE NOT (account)-->(:Role)
                MATCH (account)-->(wallet:Wallet)
                MATCH (account)-->(email:Email)
                DETACH DELETE account, wallet, email
            `

            let { counters: { _stats }} = await Auth.database.query({ query: delete_cql, params: { service: process.env.SERVICE, address }});

            return _stats;
        }
        else throw { code: 404, message: 'User not found.'};

    }

    async signout() {
        await Auth.clearCache(this.payload);
        this.payload.class !== 'Shadow' && (this.payload = await Auth.shadow(this.payload));
    }

    async signup({ email: address } = {}, role) {

        //let auth = found && await bcrypt.compare(`${address}:${password}`, found.hash);
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') 
            throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'}; */
        role = role || await Auth.Models.Role.byName({ name: 'Users' });


        let user = address && await Auth.Models.User.findOne({
            query: {
                email: {
                    address
                },
                roles: {
                    service: true
                }
            }
        });

        if(!user) {
            user = await Auth.randomUser();

            user = {
                avatar: user.picture.thumbnail, 
                email: {
                    address: address || user.email
                },
                name: `${user.name.title}. ${user.name.first} ${user.name.last}`
            }

            const new_keys = await crypto.createKeyPair();
            let { privateKey, publicKey } = new_keys;
    
            user = await Auth.Models.User.save({
                query: {
                    ...user,
                    roles: role,
                    wallet: {
                        publicKey,
                        privateKey
                    }
                }
            });
        }
        else {
            if(user.roles.some(role => role.service.name === process.env.SERVICE))
                throw { code: 409, message: 'User alresdy exists.'};

            user = await Auth.Models.User.save({
                query: {
                    ...user,
                    roles: role
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
                    roles: {
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