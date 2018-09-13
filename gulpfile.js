'use strict';
const path = require('path');
const gulp = require('gulp');
const pump = require('pump');
const sourcemaps = require('gulp-sourcemaps');
const gulpChanged = require('gulp-changed');
// TypeScript
const gulpTS = require('gulp-typescript');
const gulpTSlint = require('gulp-tslint');
const typescript = require('typescript');
// Rollup
const rollup = require('rollup');
const rollupStream = require('rollup-stream');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglifyComposer = require('gulp-uglify/composer');
const uglifyEs = require('uglify-es');
const del = require('del');

const LIB_DIR = "lib/";
const TS_DIST_LIB = "dist-es2015/";
const DIST_DECLARATION = "";
const DIST_LIB = "dist/";
const BUNDLE_MODULE_NAME = "TeXUnicode";
const BUNDLE_NAME = "bundle.js";
const PRODUCTION = process.env.NODE_ENV === 'production';

{
  const tsProj = gulpTS.createProject('tsconfig.json', {
    typescript,
  });
  gulp.task('tsc', ()=>{
    const rs = gulp.src(path.join(LIB_DIR, '**', '*.ts{,x}'))
    .pipe(sourcemaps.init())
    .pipe(tsProj());

    if (DIST_DECLARATION){
      return merge2(
        rs.js.pipe(sourcemaps.write()).pipe(gulp.dest(TS_DIST_LIB)),
        rs.dts.pipe(gulp.dest(DIST_DECLARATION))
      );
    }else{
      return rs.js.pipe(sourcemaps.write()).pipe(gulp.dest(TS_DIST_LIB));
    }
  });
  gulp.task('watch-tsc', gulp.series('tsc', ()=>{
    gulp.watch(path.join(LIB_DIR, '**', '*.ts{,x}'), ['tsc']);
  }));
  gulp.task('tslint', ()=>{
    return gulp.src(path.join(LIB_DIR, '**', '*.ts{,x}'))
    .pipe(gulpTSlint({
      formatter: 'stylish',
    }))
    .pipe(gulpTSlint.report({
      emitError: false,
    }));
  });
  gulp.task('watch-tslint', gulp.series('tslint', ()=>{
    gulp.watch(path.join(LIB_DIR, '**', '*.ts{,x}'), ['tslint']);
  }));
}
{
  let rollupCache;
  function runRollup(cb){
    let main = rollupStream({
      // inputOptions
      input: path.join(TS_DIST_LIB, 'index.js'),
      cache: rollupCache,
      // outputOptions
      output: {
        format: 'umd',
        name: BUNDLE_MODULE_NAME,
        sourcemap: 'inline',
      },
      // rollup-stream specific
      rollup,
    })
    .on('bundle', bundle=> rollupCache = bundle);

    const streams = [
      main,
      source(BUNDLE_NAME),
    ];

    if (PRODUCTION){
      streams.push(buffer(), uglifyComposer(uglifyEs, console)());
    }
    streams.push(gulp.dest(DIST_LIB));

    pump(streams, cb);
  }
  gulp.task('bundle-main', (cb)=>{
    runRollup(cb);
  });
  gulp.task('bundle', gulp.series('tsc', (cb)=>{
    runRollup(cb);
  }));
  gulp.task('watch-bundle', gulp.series('bundle', ()=>{
    gulp.watch(path.join(TS_DIST_LIB, '**', '*.js'), ['bundle-main']);
  }));
}
{
  gulp.task('clean', ()=>{
    const del_target = [DIST_LIB, TS_DIST_LIB];
    if (DIST_DECLARATION){
      del_target.push(DIST_DECLARATION);
    }
    return del(del_target);
  });
}
gulp.task('default', gulp.series('tsc', 'tslint', 'bundle'));
gulp.task('watch', gulp.parallel('watch-tsc', 'watch-tslint', 'watch-bundle'));
