const path = require('path');
const crypto = require('crypto2');

const { Geo } = require('./base');

class Playground extends Geo {
    constructor(...args) {
        super(...args);
    }

    async hello(...args) {
        let admins = await Geo.Models.Service.find({
            query: {
                //_id: 'asda',
                //_id: { $in: ['231', '123'] },
                name: { $pattern: 'NOT ($ IN $)' }
                //name: { $ne: process.env.SERVICE }
            }
        });

        return admins;
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