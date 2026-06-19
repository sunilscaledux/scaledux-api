const moduleAlias = require('module-alias');
const path = require('path');

// Register module aliases for runtime
moduleAlias.addAliases({
  '@config': path.join(__dirname, 'config'),
  '@constants': path.join(__dirname, 'constants'),
  '@module': path.join(__dirname, 'module'),
  '@admin': path.join(__dirname, 'admin'),
  '@types': path.join(__dirname, 'types'),
  '@utils': path.join(__dirname, 'utils'),
  '@middleware': path.join(__dirname, 'middleware'),
  '@services': path.join(__dirname, 'services'),
  '@queues': path.join(__dirname, 'queues'),
});

// Patch Router BEFORE any route files are imported.
// Wraps all async route handlers so errors go to the global error handler.
const { Router } = require('express');

function wrapAsync(fn: any) {
  if (typeof fn !== 'function' || fn.length === 4) return fn;
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
for (const method of methods) {
  const original = Router.prototype[method];
  Router.prototype[method] = function (path: any, ...handlers: any[]) {
    const wrapped = handlers.map((h: any) => typeof h === 'function' ? wrapAsync(h) : h);
    return original.call(this, path, ...wrapped);
  };
}
