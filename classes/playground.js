const path = require('path');
const crypto = require('crypto2');

const { Geo } = require('./base');

class Playground extends Geo {
    constructor(...args) {
        super(...args);
    }

    async get(...args) {
        return await Geo.Models.Toy.findOne({
        })
    }

    async create(...args) {
        
    }

    async findOrCreate({ name } = {}) {
        let toy = await Geo.Models.Toy.findOne({
            query: {
                name
            },
            labels: [process.env.SERVICE]
        });

        if(!toy) {
            toy = await Geo.Models.Toy.save({
                query: {
                    name
                },
                labels: [process.env.SERVICE]
            });
        }

        return toy;
    }

    async delete({ name }) {
        let info = await Geo.Models.Toy.delete({ query: { name }});

        return info;
    }


}

module.exports = {
    Playground
}