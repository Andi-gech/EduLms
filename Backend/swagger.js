const yaml = require('yamljs');
const path = require('path');

const swaggerSpec = yaml.load(path.join(__dirname, 'docs', 'openapi.yaml'));


module.exports = swaggerSpec;
