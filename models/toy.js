const { database, Node, Relation } = require('neo4orm')({ connection_string: process.env.NEO_URL });

class Toy extends Node {
    static get schema() {
        return {
            ...super.schema,
            $labels: ['Toy'],
            name: {
                type: String,
                required: true
            }
        }
    }
}

class inheritance extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: Models.Role,
            $type: 'inherits',
            $end: Models.Role
        }

        return schema;
    }
}


module.exports = { Toy };