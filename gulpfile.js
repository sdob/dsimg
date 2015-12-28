const gulp = require('gulp');
const eslint = require('gulp-eslint');
const jasmine = require('gulp-jasmine');
//const plumber = require('gulp-plumber');
//const watch = require('gulp-watch');

const paths = [
  '**/*.js', '!node_modules/**',
];
gulp.task('lint', () => {
  return gulp.src(paths)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});
gulp.task('test', ['lint'], () => {
  return gulp.src('test/**/*.js')
  .pipe(jasmine());
});
gulp.task('watch', () => {
  gulp.watch(paths, ['test']);
});
