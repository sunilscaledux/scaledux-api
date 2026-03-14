const moduleAlias = require('module-alias');
const path = require('path');

// Register module aliases for runtime
moduleAlias.addAliases({
  '@config': path.join(__dirname, 'config'),
  '@constants': path.join(__dirname, 'constants'),
  '@module': path.join(__dirname, 'module'),
  '@types': path.join(__dirname, 'types'),
  '@utils': path.join(__dirname, 'utils'),
  '@middleware': path.join(__dirname, 'middleware'),
  '@services': path.join(__dirname, 'services'),
  '@queues': path.join(__dirname, 'queues'),
});
