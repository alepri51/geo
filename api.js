/* module.exports = ({ connection_string, user, password, acl_model, acl_policy }) => {
    ACL_Model = acl_model ? load(acl_model) : default_acl_model;
    ACL_Policy = acl_policy ? load(acl_policy) : default_acl_policy;

    let { database, Node, Relation } = require('neo4orm')({ connection_string, user, password });

    let { Classes, Models } = ClassesInit({ database, Node, Relation, ACL_Model, ACL_Policy });

    let { Router } = RouterInit({ Classes });

    return { Router, Classes, Models };
} */

module.exports = { Router, Classes, Models, database } = require('neo.api')({ connection_string: process.env.NEO_URL, acl_model: './security/acl.model', acl_policy: './security/acl.policy' });
