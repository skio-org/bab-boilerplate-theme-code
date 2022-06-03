# bab-boilerplate-theme-code
This repo contains the Skio Build a Box boilerplate theme code (assets and snippets), as well as instructions for usage.

This standard boilerplate code assumes you are using a standard Shopify theme (i.e. not headless).

The files assets/skio-build-a-box.css and assets/skio-build-a-box.js are included in the file snippets/assets/skio-build-a-box.liquid , so they don't need to be added to the layout/theme.liquid file.

The file assets/skio-cart.js should be added at the bottom of your layout/theme.liquid file to ensure that when a Box is removed from the cart, all items in that Box will also be removed from the cart. See file for additional integration notes (i.e. custom cart implementation updating).

To use the Build a Box feature, first set up your Box in the Skio app. Once your box has been created, the file snippets/skio-build-a-box.liquid must be included on the Product page in order to load the Build a Box element.

If you have any questions, feel free to reach out to migrations@skio.com for assistance with Build a box theme work.
