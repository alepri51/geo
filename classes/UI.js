const path = require('path');
const crypto = require('crypto2');

const { Geo } = require('./base');

class UI extends Geo {
    constructor(...args) {
        super(...args);
    }

    async access() {
        return this.payload;
    }

    async hello({ duration, rate }) {
        /* let admins = await Geo.Models.Service.find({
            query: {
                name: process.env.SERVICE,
                roles: {
                    accounts: {
                        roles: {
                            service: {
                                //$aggregate: 'count:$'
                            }
                        }
                    }
                }
            }
        }); */

        let limit = await Geo.Models.AccessLimit.findOne({
            query: {
                name: 'Users limits',
            }
        });

        limit.duration = duration;
        limit.rate = rate;

        /* limit = await Geo.Models.AccessLimit.save({
            query: limit
        }); */

        

        let admins = await Geo.Models.Account.find({
            query: {
                roles: {
                    
                    service: true
                },
                'roles:1': {
                    service: { 
                        name: 'GEO1'
                    },
                    limit: true
                }
            }
        })
        /* let admins = await Geo.Models.Account.find({
            query: {
                roles: {
                    //name: 'Users',
                    service: { 
                        $aggregate: 'count:$',
                        _id: { '$ref = toInteger($val) AND $ref.name = "GEO"': 1 }
                    }
                },
                'roles:1': {
                    //name: 'Users',
                    service: { 
                        $aggregate: 'count:$',
                        _id: { '$ref = toInteger($val) AND $ref.name <> "GEO"': 1 }
                    }
                }
            }
        }) */
        /* let admins = await Geo.Models.Service.find({
            query: {
                //_id: 'asda',
                //_id: { $in: ['231', '123'] },
                name: { $notIn: ['GEO1', 'GEO2'] },
                //name: { 'NOT ($prop IN $val)': ['GEO1', 'GEO2'] },
                //name: { $ne: process.env.SERVICE }
                //name: 'GEO'
            }
        }); */

        return admins;
        return { admins, array: ['asdad'] };
    }

    
}

module.exports = {
    UI
}