const axios = require('axios');
const database = require('../api').database;
const flatten = require('flat');

const { Geo } = require('./base');

/*  */

class Geocoder extends Geo {
    constructor(...args) {
        super(...args);
    }
/* 
    house — дом; count = 1
    street — улица; = 1
    metro — станция метро; *
    district — район города; = 1
    locality — населенный пункт (город/поселок/деревня/село/...). = 1
 */

 /* 
    ru_RU — русский;
    uk_UA — украинский;
    be_BY — белорусский;
    en_RU — ответ на английском, российские особенности карты;
    en_US — ответ на английском, американские особенности карты;
    tr_TR — турецкий (только для карты Турции).
 */
    static async query({ address, lat, lon, kind = 'house', count, skip, lang = 'ru_RU' }) {

        let service = await Geocoder.Models.Service.findOne({
            name: process.env.SERVICE
        });

        const capitalize = (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        if(address) {
            let url = `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${encodeURIComponent(address)}&format=json&lang=${lang}&results=1`
            
            let { data: {response: { GeoObjectCollection: { featureMember: [member] }}}} = await axios({ url });

            if(!member)
                throw { code: 404, message: 'Nothing had been found.' };

            let [latitude, longitude] = member.GeoObject.Point.pos.split(/\s/);

            lat = latitude;
            lon = longitude;
        }
        
        /* let url = `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${lat},${lon}&kind=house&format=json&lang=${lang}&results=1`
            
        let { data: {response: { GeoObjectCollection: { featureMember: [member] }}}} = await axios({ url });

        if(!member)
            throw { code: 404, message: 'Nothing had been found.' };
            
        let [latitude, longitude] = member.GeoObject.Point.pos.split(/\s/);

        lat = latitude;
        lon = longitude;

        url = `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${lat},${lon}&kind=district&format=json&lang=${lang}&results=101`
            
        let { data: {response: { GeoObjectCollection: { featureMember: members }}}} = await axios({ url });

        let hierarchy = [...members, member];

        return; */
        let urls = {
            house: `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${lat},${lon}&kind=house&format=json&lang=${lang}&results=1`,
            district: `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${lat},${lon}&kind=district&format=json&lang=${lang}&results=101`,
            //metro: `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.YANDEX_API_KEY}&geocode=${lat},${lon}&kind=district&format=json&lang=${lang}&results=3`
        }

        let hierarchy = [];
        let response = void 0;

        for(let url in urls) {

            switch(url) {
                case 'district':
                    response = await axios({ url: urls[url] });
                    hierarchy = [...response.data.response.GeoObjectCollection.featureMember.reverse(), ...hierarchy];
                break
                case 'house':
                    response = await axios({ url: urls[url] });

                    if(!response.data.response.GeoObjectCollection.featureMember.length)
                        throw { code: 404, message: 'Nothing had been found.' }; 

                    hierarchy = [...response.data.response.GeoObjectCollection.featureMember];
                break
            }

        }

        //let root = hierarchy.slice(1);
        hierarchy = hierarchy.reduce((memo, object, inx, arr) => {

            let { GeoObject: geo } = object;
            let { metaDataProperty: { GeocoderMetaData: { Address: { Components: components }}}} = geo;

            if(!memo.length) {
                memo = components;
            }
            else {
                let root = memo.map(entry => `${entry.kind}:${entry.name}`);
                let current = components.map(entry => `${entry.kind}:${entry.name}`);

                let a = new Set(root);
                let b = new Set(current);
                let union = Array.from(new Set([...a, ...b]));

                memo = union.map(entry => {
                    let [kind, name] = entry.split(':');

                    return { kind, name };
                });
            }

            if(inx === arr.length - 1) {
                let { metaDataProperty: { GeocoderMetaData: { AddressDetails }}} = geo;

                AddressDetails = flatten(AddressDetails);

                let [key, postalCode] = Object.entries(AddressDetails).find(([key, value]) => {
                    return key.endsWith('PostalCodeNumber');
                }) || [];

                if(postalCode) {
                    let last = memo[memo.length - 1];
                    last.postalCode = postalCode;
                }

                let [lat, lon] = geo.Point.pos.split(/\s/);
        
                memo.push({
                    kind: 'coordinates',
                    name: `${lat}, ${lon}`,
                    lat,
                    lon
                });
            }

            return memo;
        }, []);

        console.log(hierarchy);

        hierarchy.unshift({
            kind: 'Мир',
            name: `Мир`
        });

        let postalCode = void 0;

        let { nodes, relations, params, paths } = hierarchy.reduce((memo, component, level, arr) => {
    
            if(level === 0 && service) {
                let cql = `MATCH (service:Service {_id:'${service._id}'})\n`;

                memo.nodes.push(cql);
            }

            memo.paths.push(component.name);

            let cql = `MERGE (n${level}:Geo:${capitalize(component.kind)} {path: '${memo.paths.join(',')}'}) SET n${level} += $n${level}`;

            memo.nodes.push(cql);
            memo.params[`n${level}`] = component;

            if(level === 0 && service) {
                cql = `MERGE (n0)-[:in]->(service)`;

                memo.relations.push(cql);
            }

            if(level > 0) {
                //cql = `MERGE (n${level - 1})<-[:in]-(n${level})`;
                cql = level === arr.length - 1 ? `MERGE (n${level - 1})-[:has]->(n${level})` : `MERGE (n${level - 1})<-[:in]-(n${level})`;

                memo.relations.push(cql);
            }

            if(component.postalCode) {
                let node = `MERGE (code:Geo:\`Postal Code\` {name: '${component.postalCode}'})`;
                memo.nodes.push(node);

                let link = `MERGE (code)<-[:has]-(n${level})`;
                memo.relations.push(link);

                postalCode = component.postalCode;
            }
            
            return memo;
        }, { nodes: [], relations: [], params: {}, paths: []});

        //let last = nodes[nodes.length - 1];

        nodes = nodes.join('\n');
        relations = relations.join('\n');

        let cql = `${nodes}\n${relations}`;
    
        let neo_result = await database.query({ query: cql, params });

        postalCode && paths.push(postalCode);

        return paths.join(',');

        count && (url = `${url}&results=${count}`);
        skip && (url = `${url}&skip=${skip}`);

        //let response = await axios({ url });
        let { data: {response: { GeoObjectCollection: { featureMember: objects = [] }}}} = await axios({ url });

        for(let object of objects) {
            let { GeoObject: geo } = object;
            let { metaDataProperty: { GeocoderMetaData: { Address: { Components: components }}}} = geo;
    
            let [lat, lon] = geo.Point.pos.split(/\s/);
            
            components.push({
                kind: 'coordinates',
                name: `${lat}, ${lon}`,
                lat,
                lon
            });
    
            let { nodes, relations, params } = components.reduce((memo, component, level) => {
    
                memo.paths.push(component.name);
    
                let cql = `MERGE (n${level}:Geo:${capitalize(component.kind)} {path: '${memo.paths.join(',')}'}) SET n${level} += $n${level}`;
    
                memo.nodes.push(cql);
                memo.params[`n${level}`] = component;
    
                if(level > 0) {
                    cql = `MERGE (n${level - 1})<-[:in]-(n${level})`;
    
                    memo.relations.push(cql);
                }
    
                return memo;
            }, { nodes: [], relations: [], params: {}, paths: []});
    
            nodes = nodes.join('\n');
            relations = relations.join('\n');

            let cql = `${nodes}\n${relations}`;
        
            let neo_result = await database.query({ query: cql, params });
        }
    
        return 'ok'
        /* let results = objects.map(({ GeoObject: geo }) => {
            let [lat, lon] = geo.Point.pos.split(/\s/);

            return { lat, lon };
        });

        return results; */
        //for metro
        /* const forDatabase = objects.map(async ({ GeoObject: geo }) => {
            let [lat, lon] = geo.Point.pos.split(/\s/);
    
            const coordinates = [lon, lat];
            const [line_name] = geo.description.split(',');
            const name = geo.name.replace(/(метро|станция) /g, '');
    
            const stationRefId = await getStationRefId(name, line_name, coordinates);
    
            return {
              id: stationRefId,
              _lat: coordinates[0],
              _lon: coordinates[1]
            }
    
        }); */
    }

    async coordinates({ lat, lon, kind, count, skip, lang }) {
        return await Geocoder.query({ lat, lon, kind, count, skip, lang });
    }

    async address({ query, lang }) {
        return await Geocoder.query({ address: query, lang });
    }
}

module.exports = {
    Geocoder
}