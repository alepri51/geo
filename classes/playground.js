const path = require('path');
const crypto = require('crypto2');

const { Geo } = require('./base');

class Playground extends Geo {
    constructor(...args) {
        super(...args);
    }

    async stress(...args) {
        const axios = require('axios');

        for(let i = 1; i <= 1000000; i++) {
            /* axios.get(`http://localhost:8001/api/auth.signin?email=yvan.lefevre@example.com`)
            .then(response => response && console.info(i, response.data))
            .catch(err => console.error(i, err)); */
            
            axios.get(`http://localhost:${process.env.PORT}/api/auth.signup`)
                //.catch(err => console.error(i, err))
                //.then(response => response && console.info(i, response.data));
            
            //await sleep(97);
        }
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

    async get(...args) {
        return await Geo.Models.Toy.find({ labels: [process.env.SERVICE, `Owner:${this.payload._id}`] })
    }

    async create(...args) {
        
    }

    async findOrCreate({ name } = {}) {
        let toy = await Geo.Models.Toy.findOne({
            query: {
                name
            },
            labels: [process.env.SERVICE, `Owner:${this.payload._id}`]
        });

        if(!toy) {
            toy = await Geo.Models.Toy.save({
                query: {
                    name
                },
                labels: [process.env.SERVICE, `Owner:${this.payload._id}`]
            });
        }

        return toy;
    }

    async delete({ name }) {
        let info = await Geo.Models.Toy.delete({ query: { name }, labels: [process.env.SERVICE, `Owner:${this.payload._id}`] });

        return info;
    }

    async deleteAllToys() {
        let info = await Geo.Models.Toy.delete({ labels: [process.env.SERVICE, `Owner:${this.payload._id}`] });

        return info;
    }

}

module.exports = {
    Playground
}