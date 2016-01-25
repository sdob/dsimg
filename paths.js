/* Paths for routes. This module also effectively
 * declares the API.
 */
module.exports = {
  divesiteImage: {
    list: '/divesites/:id',
    create: '/divesites/:id',
    /* We DELETE images by their own Mongo db */
    delete: '/divesite-images/:id',
  },
  divesiteHeaderImage: {
    retrieve: '/divesites/:id/header',
    create: '/divesites/:id/header',
    delete: '/divesites/:id/header',
  },
  userProfileImage: {
    retrieve: '/users/:id/profile_image',
    /* Users can only delete their own profile images */
    create: '/profile_image',
    delete: '/profile_image',
  },
  userImage: {
    list: '/users/:id/images',
  },
};
